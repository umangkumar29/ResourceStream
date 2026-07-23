import uuid
import re
from typing import Annotated, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, cast, select

from talentstream_core_service.db.database import get_db
from talentstream_core_service.db.models import Candidate, CandidateChunk
from talentstream_core_service.auth.auth import require_roles, CurrentUser
from talentstream_core_service.services.embeddings.openai import OpenAIEmbeddings
from talentstream_core_service.repositories.candidate_repository import CandidateRepository
from pydantic import BaseModel

router = APIRouter()

class ChatQuery(BaseModel):
    search: str
    limit: int = 5

@router.post("/chat", summary="Conversational AI Sourcing Semantic Search")
def semantic_search(
    query: ChatQuery,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[CurrentUser, Depends(require_roles("PM", "RMG", "Admin", "Program_Mgr", "Project_Mgr"))],
):
    """
    Perform a combined RAG vector and keyword search based on a natural language prompt.
    Extracts loose heuristics (like years of experience) from the prompt, 
    and uses pgvector on CandidateChunks to surface the best candidates.
    """
    if not query.search:
        return []

    # Basic Heuristic Extraction (e.g., finding experience years requested)
    match_years = re.search(r'(\d+)\+?\s*(years?|yrs?)\s+of\s+exp', query.search.lower())
    min_exp = 0.0
    if match_years:
        min_exp = float(match_years.group(1))

    # 1. Generate Embeddings for the Natural Language Prompt
    embeddings_service = OpenAIEmbeddings()
    try:
        query_vector = embeddings_service.get_embedding(query.search)
    except Exception as e:
        # Fallback if OpenAI fails, we just do a regular search
        print(f"[Chat Endpoint] Embedding failure: {e}")
        query_vector = None

    repo = CandidateRepository(db)
    
    # We will build a unified candidate list
    final_candidates = []

    if query_vector:
        # 2. PGVector nearest neighbor search on CandidateChunks
        # Find top chunks (limit * 3 to get multiple chunks for candidates)
        # Using L2 distance or negative inner product (<-) for cosine similarity
        vector_str = f"[{','.join(str(f) for f in query_vector)}]"
        
        # Raw SQL query for vector ordering (Cosine distance <=> )
        sql = """
            SELECT candidate_id, chunk_text, 1 - (embedding <=> :vector) as similarity 
            FROM candidate_chunks
            ORDER BY embedding <=> :vector
            LIMIT :lim
        """
        result = db.execute(text(sql), {"vector": vector_str, "lim": int(query.limit * 3)}).mappings().all()
        
        # Aggregate top candidates based on best chunk score
        candidate_scores = {}
        for row in result:
            cid = str(row["candidate_id"])
            if cid not in candidate_scores:
                candidate_scores[cid] = row["similarity"]
            else:
                candidate_scores[cid] = max(candidate_scores[cid], row["similarity"])

        # Sort candidate IDs by their highest chunk similarity
        sorted_cids = sorted(candidate_scores.keys(), key=lambda x: candidate_scores[x], reverse=True)

        for cid in sorted_cids:
            c = repo.get_by_id(cid)
            if c:
                # Apply heuristic filter if needed
                if min_exp > 0.0 and (c.experience_years is None or c.experience_years < min_exp):
                    continue
                    
                final_candidates.append(c)
                if len(final_candidates) >= query.limit:
                    break
    
    # If no results or vector failed, fallback to traditional BM25/keyword logic
    if not final_candidates:
        final_candidates = repo.get_all(search=query.search, limit=query.limit)
        if min_exp > 0.0:
            final_candidates = [c for c in final_candidates if c.experience_years and c.experience_years >= min_exp]
            final_candidates = final_candidates[:query.limit]

    # Map to expected output schema for frontend
    out = []
    for c in final_candidates:
        out.append({
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "employee_id": c.employee_id,
            "skills": c.skills,
            "experience_years": float(c.experience_years) if c.experience_years else 0.0,
            "status": getattr(c.status, "value", str(c.status)) if c.status else "bench",
            "resume_url": c.resume_url,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "overall_summary": c.resume_json.get("candidate", {}).get("professional_summary", "") if c.resume_json else "",
            "role_category": (c.resume_json.get("candidate", {}).get("work_experience", [])[0].get("role", "General") if c.resume_json and c.resume_json.get("candidate", {}).get("work_experience") else "General") if c.resume_json else "General",
            "match_score": int(candidate_scores.get(str(c.id), 0.85) * 100) if candidate_scores else 85,
        })
        
    return out
