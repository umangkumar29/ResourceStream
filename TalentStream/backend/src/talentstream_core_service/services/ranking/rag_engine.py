import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text
from talentstream_core_service.db.models import Candidate, JobRequest, JobMatch, MatchStatus
from talentstream_core_service.services.llm.openai import OpenAILLM
from talentstream_core_service.services.embeddings.openai import OpenAIEmbeddings
from talentstream_core_service.configs.config import settings


class RAGEngine:
    """
    Fallback synchronous matching pipeline.
    Uses CandidateChunk table and Blended Scoring logic.
    """

    def run(self, job_id: str, db: Session) -> list[dict]:
        # ── Fetch the job request ─────────────────────────────────────────────
        job: JobRequest | None = db.query(JobRequest).filter(JobRequest.id == job_id).first()
        if not job:
            raise ValueError(f"Job request {job_id} not found.")

        llm = OpenAILLM()
        embeddings_service = OpenAIEmbeddings()

        # ── Stage 1: Vector similarity (cosine) across chunks ─────────────────
        jd_embedding = embeddings_service.get_embedding(job.description)

        rows = db.execute(
            text("""
                SELECT
                    c.id::text AS candidate_id,
                    c.resume_json,
                    c.name,
                    c.skills,
                    1 - (cc.embedding <=> CAST(:embedding AS vector)) AS chunk_similarity
                FROM candidates c
                JOIN candidate_chunks cc ON c.id = cc.candidate_id
                WHERE c.status = 'bench'
            """),
            {"embedding": str(jd_embedding)}
        ).fetchall()

        if not rows:
            return []

        # ── BLENDED SCORING ALGORITHM ──
        candidate_data = {}
        for r in rows:
            cid = r.candidate_id
            if cid not in candidate_data:
                candidate_data[cid] = {
                    "scores": [],
                    "name": r.name,
                    "skills": r.skills,
                    "id": cid
                }
            candidate_data[cid]["scores"].append(float(r.chunk_similarity))

        blended_results = []
        for cid, data in candidate_data.items():
            scores = sorted(data["scores"], reverse=True)
            top_1 = scores[0]
            top_3 = scores[:3]
            avg_top_3 = sum(top_3) / len(top_3)
            blended_score = (0.7 * top_1) + (0.3 * avg_top_3)
            blended_results.append({
                "candidate": data,
                "score": blended_score
            })

        blended_results.sort(key=lambda x: x["score"], reverse=True)
        top_candidates = blended_results[:settings.RAG_TOP_K]

        # ── Stage 3: LLM reasoning + persist matches ──────────────────────────
        results = []
        for rank, match_data in enumerate(top_candidates):
            candidate = match_data["candidate"]
            # Scale score to 0-100 for UI, ensuring it drops by rank slightly if scores are too close
            score = round(max(0.0, (match_data["score"] * 100) - rank), 2)
            
            justification = llm.generate_match_justification(
                job_description=job.description,
                resume_text=candidate["skills"] or "No resume details available."
            )

            # Upsert job_match record
            existing = (
                db.query(JobMatch)
                .filter(JobMatch.job_id == job.id, JobMatch.candidate_id == candidate["id"])
                .first()
            )
            if existing:
                existing.match_score = score
                existing.ai_justification = justification
                existing.status = MatchStatus.pending
            else:
                db.add(
                    JobMatch(
                        id=uuid.uuid4(),
                        job_id=job.id,
                        candidate_id=candidate["id"],
                        match_score=score,
                        ai_justification=justification,
                        status=MatchStatus.pending,
                    )
                )

            results.append({
                "candidate_id": str(candidate["id"]),
                "candidate_name": candidate["name"],
                "match_score": score,
                "ai_justification": justification,
            })

        db.commit()
        return results


rag_engine = RAGEngine()
