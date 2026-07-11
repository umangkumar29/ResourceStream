import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from talentstream_core_service.db.models import Candidate
from talentstream_core_service.repositories.candidate_repository import CandidateRepository
from talentstream_core_service.services.pdf_parser import extract_text_from_pdf, convert_pdf_to_images
from talentstream_core_service.services.llm.openai import OpenAILLM
from talentstream_core_service.services.chunking.semantic import create_semantic_chunks_from_json
from talentstream_core_service.services.cloud_service.azure_storage import azure_storage_service
from talentstream_core_service.services.vectorstores.pgvector import PGVectorStore

logger = logging.getLogger(__name__)

class CandidateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CandidateRepository(db)
        self.llm = OpenAILLM()
        self.vectorstore = PGVectorStore(db)

    def process_and_upload_resume(self, file_bytes: bytes, filename: str, uploaded_by_email: str) -> Dict[str, Any]:
        import hashlib
        # --- PRE-LLM DEDUPLICATION (Zero-Cost Hash Check) ---
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        duplicate_by_hash = self.repo.get_by_file_hash(file_hash)
        if duplicate_by_hash:
            logger.info(f"[candidates] Duplicate file detected by hash: {filename}")
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "DUPLICATE_CANDIDATE",
                    "message": f"This exact resume file was already uploaded for {duplicate_by_hash.name}.",
                    "existing_candidate_id": str(duplicate_candidate.id) if 'duplicate_candidate' in locals() else str(duplicate_by_hash.id),
                    "email": duplicate_by_hash.email,
                    "phone": duplicate_by_hash.phone,
                    "name": duplicate_by_hash.name
                }
            )

        # Extract text (as fallback hint) and images (for GPT-4o Vision)
        resume_text = extract_text_from_pdf(file_bytes)
        base64_images = convert_pdf_to_images(file_bytes)

        if not resume_text and not base64_images:
            raise HTTPException(status_code=422, detail="Could not extract text or images from the PDF.")

        # Parse resume into structured JSON schema using Vision + Text
        resume_json = self.llm.parse_resume_to_json(resume_text, base64_images)
        candidate_data = resume_json.get("candidate", {})

        # Extract fields from structured JSON
        extracted_name = candidate_data.get("name") or filename.split(".")[0]
        extracted_email = candidate_data.get("email") or None
        extracted_phone = candidate_data.get("phone") or None
        skills_list = candidate_data.get("skills", [])
        extracted_skills = ", ".join([str(s) for s in skills_list]) if skills_list else ""
        
        exp_raw = candidate_data.get("total_experience_years", 0)
        try:
            exp_float = float(exp_raw)
        except (ValueError, TypeError):
            exp_float = 0.0

        # --- DUPLICATE CHECK ---
        duplicate_candidate = self.repo.get_by_email_or_phone(email=extracted_email, phone=extracted_phone)
        if duplicate_candidate:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "DUPLICATE_CANDIDATE",
                    "message": f"Candidate {duplicate_candidate.name} already exists.",
                    "existing_candidate_id": str(duplicate_candidate.id),
                    "email": duplicate_candidate.email,
                    "phone": duplicate_candidate.phone,
                    "name": duplicate_candidate.name
                }
            )

        # Candidate is unique, safe to upload to Blob Storage
        logger.info("[candidates] Uploading Candidate's resume...")
        resume_url = azure_storage_service.upload_resume(file_bytes, filename)

        # Wrap database operations in a transaction
        try:
            # Save to Postgres via SQLAlchemy without committing yet
            new_candidate = Candidate(
                id=uuid.uuid4(),
                name=extracted_name,
                email=extracted_email,
                phone=extracted_phone,
                employee_id=None,  # Set manually by RMG after upload
                skills=extracted_skills,
                experience_years=exp_float,
                status="bench",
                resume_url=resume_url,
                resume_json=resume_json,
                file_hash=file_hash,
                created_at=datetime.now(timezone.utc)
            )
            self.repo.create(new_candidate, auto_commit=False)

            # --- SEMANTIC CHUNKING ---
            chunks_data = create_semantic_chunks_from_json(str(new_candidate.id), resume_json)
            
            # --- EMBEDDING & VECTOR STORAGE ---
            # Embed and save chunks without committing yet
            self.vectorstore.embed_and_store_chunks(str(new_candidate.id), chunks_data, auto_commit=False)

            # --- COMMIT TRANSACTION ---
            # Both candidate and chunks are queued. If no errors occurred, commit all at once!
            self.db.commit()
            self.db.refresh(new_candidate)
            
        except Exception as e:
            # If any step fails (e.g., OpenAI embedding failure), roll back everything.
            self.db.rollback()
            logger.error(f"[candidates] Atomic transaction failed for {filename}. Rolled back.")
            raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

        return {
            "status": "success",
            "message": f"Resume for {extracted_name} uploaded and parsed.",
            "candidate_id": str(new_candidate.id),
            "metadata": {
                "name": extracted_name,
                "skills": extracted_skills,
                "experience_years": exp_float,
                "summary": candidate_data.get("professional_summary", ""),
                "work_experience_count": len(candidate_data.get("work_experience", [])),
            },
            "uploaded_by": uploaded_by_email,
        }
