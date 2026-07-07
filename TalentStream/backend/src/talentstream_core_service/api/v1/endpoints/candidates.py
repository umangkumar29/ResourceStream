import uuid
import asyncio
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, File, UploadFile, Depends, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from talentstream_core_service.db.database import get_db
from talentstream_core_service.db.models import Candidate
from talentstream_core_service.auth.auth import get_current_user, require_roles, CurrentUser
from talentstream_core_service.repositories.candidate_repository import CandidateRepository
from talentstream_core_service.services.candidate_service import CandidateService
from talentstream_core_service.schemas.candidate import CandidateUpdate

router = APIRouter()


@router.post(
    "/candidates/upload-resume",
    summary="RMG / Admin: Upload and parse a resume PDF",
    responses={
        400: {"description": "Only PDF files are accepted."},
        409: {"description": "Duplicate candidate found based on email or phone."},
        422: {"description": "Could not extract text from the PDF."}
    }
)
async def upload_resume(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
    # Only RMG and Admin can upload resumes
    current_user: Annotated[CurrentUser, Depends(require_roles("RMG", "Admin"))],
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    
    # Delegate to the service layer for all business logic
    service = CandidateService(db)
    result = service.process_and_upload_resume(
        file_bytes=file_bytes,
        filename=file.filename,
        uploaded_by_email=current_user.email
    )
    
    return result



@router.get("/candidates", summary="List all candidates (restricted by role)")
def list_candidates(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    search: str | None = None,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    repo = CandidateRepository(db)
    candidates = repo.get_all(search=search, status_filter=status_filter, skip=skip, limit=limit)

    return [
        {
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "employee_id": c.employee_id,
            "skills": c.skills,
            "experience_years": float(c.experience_years) if c.experience_years else 0.0,
            "status": getattr(c.status, "value", str(c.status)) if c.status else "bench",
            "resume_url": c.resume_url,
            "has_embedding": True,  # Candidates now have multiple chunk embeddings
            "created_at": c.created_at.isoformat(),
            "overall_summary": c.resume_json.get("candidate", {}).get("professional_summary", "") if c.resume_json else "",
            "project_summary": "\n".join([ach for exp in c.resume_json.get("candidate", {}).get("work_experience", []) for ach in exp.get("key_achievements", [])]) if c.resume_json else "",
            "role_category": (c.resume_json.get("candidate", {}).get("work_experience", [])[0].get("role", "General") if c.resume_json and c.resume_json.get("candidate", {}).get("work_experience") else "General") if c.resume_json else "General",
        }
        for c in candidates
    ]


@router.patch("/candidates/{candidate_id}", summary="Update candidate details")
def update_candidate(
    candidate_id: str,
    payload: CandidateUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[CurrentUser, Depends(require_roles("RMG", "Admin"))],
):
    repo = CandidateRepository(db)
    candidate = repo.get_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(candidate, key, value)

    repo.update(candidate)

    return {"status": "success", "message": "Candidate updated successfully"}


@router.delete("/candidates/{candidate_id}", summary="Delete a candidate")
def delete_candidate(
    candidate_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[CurrentUser, Depends(require_roles("RMG", "Admin"))],
):
    repo = CandidateRepository(db)
    candidate = repo.get_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    repo.delete(candidate)

    return {"status": "success", "message": "Candidate deleted successfully"}
