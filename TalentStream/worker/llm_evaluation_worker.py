"""
Worker 2 — llm_evaluation_worker.py
-------------------------------------
Consumes from queue: candidate_shortlisted  { job_id, pm_id, batch_index, total_batches, candidates[] }
Writes to DB:        job_matches             (upsert — safe to retry)

Pipeline:
  1. Fetch JD text from DB (1 query by job_id)
  2. Fetch all 5 resume texts from DB (1 query by candidate_id IN [...])
  3. Build a single structured prompt — evaluate ALL 5 candidates in ONE LLM call
  4. Parse structured JSON response array
  5. Upsert each result into job_matches (ON CONFLICT DO UPDATE)
  6. ACK only after all DB writes succeed
  7. On failure: NACK (requeue=False after 3 attempts) → dead letter queue

NOTE: Embeddings are now 1536-dimensional (OpenAI text-embedding-3-small).
  Previously 384-d (sentence-transformers) — both JDs and resumes now use the
  same embedding space which is critical for meaningful cosine similarity matching.
"""

import os
import json
import time
import uuid
import pika
import concurrent.futures
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from langsmith import traceable

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://tsuser:tspassword@rabbitmq:5672/")
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "")
OPENAI_CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
QUEUE_SHORTLISTED = "candidate_shortlisted"

# ── Database ────────────────────────────────────────────────────────────────────
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# ── OpenAI Client ───────────────────────────────────────────────────────────────
_client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL if OPENAI_BASE_URL else None,
)


# ── LLM Evaluation ─────────────────────────────────────────────────────────────

class MatchExplanation(BaseModel):
    """Strict schema for the AI to return structured evidence of the match."""
    matched_skills: list[str] = Field(
        description="List of specific skills from the JD that the candidate possesses."
    )
    matched_experience: list[str] = Field(
        description="Bullet points of past roles or projects that align perfectly with the JD."
    )
    notable_gaps: list[str] = Field(
        description="Crucial skills or requirements from the JD that are missing from the resume."
    )
    ai_summary: str = Field(
        description="A 1-2 sentence final verdict on why this candidate is or isn't a fit."
    )
    match_percentage: int = Field(
        description="A final matching score from 0 to 100 representing how well the candidate fits the job description."
    )

SYSTEM_PROMPT = """You are an expert technical recruiter. Your task is to evaluate a candidate 
against a job description and extract structured evidence for why they are a match (or not).
You must also provide a final `match_percentage` from 0 to 100.
Be extremely factual. Only cite skills and experience that actually exist in the candidate's profile."""


@traceable(name="W2_Generate_Structured_Explanation", run_type="llm")
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def evaluate_candidate_with_llm(jd_text: str, c: dict) -> dict:
    """
    Sends ONE LLM API call to evaluate a single candidate against the JD using Structured Outputs.
    Returns the parsed Pydantic dictionary.
    """
    rj = c.get("resume_json") or {}
    if isinstance(rj, str):
        import json
        try:
            rj = json.loads(rj)
        except Exception:
            rj = {}
            
    skills = rj.get("skills", []) or []
    skills_str = ", ".join(skills) if isinstance(skills, list) else str(skills)
    experience_years = rj.get("total_experience_years", "Unknown")
    summary = rj.get("professional_summary", "") or ""
    
    matched_chunks_text = c.get("matched_chunks_text", "")

    candidate_section = (
        f"Vector Similarity: {c['similarity_score']}\n"
        f"Total Experience: {experience_years} years\n"
        f"Skills: {skills_str}\n"
        f"Summary: {summary}\n\n"
        f"--- HIGHLY RELEVANT RETRIEVED EXPERIENCE (from matching engine) ---\n"
        f"{matched_chunks_text}\n"
        f"-------------------------------------------------------------------\n"
    )

    user_prompt = (
        f"### Job Description\n{jd_text}\n\n"
        f"### Candidate Profile\n{candidate_section}\n\n"
        "Extract the structured match explanation."
    )

    # Use the beta parse endpoint to guarantee JSON schema compliance
    response = _client.beta.chat.completions.parse(
        model=OPENAI_CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=1000,
        response_format=MatchExplanation,
    )

    explanation = response.choices[0].message.parsed
    if hasattr(explanation, 'model_dump'):
        return explanation.model_dump()
    return explanation.dict()


def upsert_match(db: Session, job_id: str, candidate_id: str, score: float, explanation: dict) -> None:
    """
    Upserts a single match result into job_matches.
    Writes to the new `structured_explanation` JSONB column.
    """
    db.execute(
        text("""
            INSERT INTO job_matches (
                id, job_id, candidate_id, match_score, cosine_score, 
                ai_justification, structured_explanation, status, processing_status, created_at
            )
            VALUES (
                :id, :job_id, :candidate_id, :match_score, :cosine_score,
                :ai_justification, CAST(:structured_explanation AS jsonb), 'pending', 'evaluated', NOW()
            )
            ON CONFLICT (job_id, candidate_id)
            DO UPDATE SET
                match_score            = EXCLUDED.match_score,
                cosine_score           = EXCLUDED.cosine_score,
                ai_justification       = EXCLUDED.ai_justification,
                structured_explanation = EXCLUDED.structured_explanation,
                status                 = 'pending',
                processing_status      = 'evaluated'
        """),
        {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "candidate_id": candidate_id,
            "match_score": score,  # Use the display score
            "cosine_score": score / 100.0, # Approximate back to 0-1 range for the raw column
            "ai_justification": explanation.get("ai_summary", ""),
            "structured_explanation": json.dumps(explanation),
        }
    )


def process_message(ch, method, properties, body):
    payload = json.loads(body)
    job_id = payload["job_id"]
    batch_index = payload.get("batch_index", 0)
    total_batches = payload.get("total_batches", 1)
    candidate_refs = payload.get("candidates", [])  # [{candidate_id, similarity_score}]

    print(f"[W2] Batch {batch_index + 1}/{total_batches} for job {job_id} ({len(candidate_refs)} candidates)")

    db = SessionLocal()
    try:
        # ── 1. Fetch JD text (1 query) ────────────────────────────────────────
        job_row = db.execute(
            text("SELECT description FROM job_requests WHERE id = :job_id"),
            {"job_id": job_id}
        ).fetchone()

        if not job_row:
            print(f"[W2] Job {job_id} not found — skipping batch.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        jd_text = job_row.description

        # ── 2. Fetch all resume texts (1 parameterized query — no SQL injection) ─
        candidate_ids = [c["candidate_id"] for c in candidate_refs]
        similarity_map = {c["candidate_id"]: c.get("similarity_score", 0.0) for c in candidate_refs}
        chunks_map = {c["candidate_id"]: c.get("matched_chunks_text", "") for c in candidate_refs}

        candidate_rows = db.execute(
            text("SELECT id::text AS id, name, resume_json FROM candidates WHERE id = ANY(CAST(:ids AS uuid[]))"),
            {"ids": candidate_ids}
        ).fetchall()

        candidates_data = []
        for r in candidate_rows:
            raw_rj = r.resume_json or {}
            if isinstance(raw_rj, str):
                try:
                    raw_rj = json.loads(raw_rj)
                except Exception:
                    raw_rj = {}
            cand_data = raw_rj.get("candidate", raw_rj) if isinstance(raw_rj, dict) else {}
            
            candidates_data.append({
                "candidate_id": str(r.id),
                "name": r.name,
                "resume_json": cand_data,
                "similarity_score": similarity_map.get(str(r.id), 0.0),
                "matched_chunks_text": chunks_map.get(str(r.id), ""),
            })

        # ── 3. LLM evaluation (Concurrent ThreadPool) ────────────────
        print(f"[W2] Concurrently evaluating {len(candidates_data)} candidates for batch {batch_index + 1}...")
        
        # We process the LLM calls concurrently
        evaluations = []
        max_workers = min(10, len(candidates_data)) if candidates_data else 1
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_cand = {
                executor.submit(evaluate_candidate_with_llm, jd_text, c): c
                for c in candidates_data
            }
            
            for future in concurrent.futures.as_completed(future_to_cand):
                c = future_to_cand[future]
                try:
                    explanation = future.result()
                    evaluations.append((c, explanation))
                except Exception as e:
                    print(f"[W2] Failed to evaluate candidate {c['candidate_id']}: {e}")

        # ── 4. Upsert all results ─────────────────────────────────────────────
        upserted_count = 0
        for rank, (c, explanation) in enumerate(evaluations):
            cid = c["candidate_id"]
            
            # Use the LLM's generated percentage score
            llm_score = float(explanation.get("match_percentage", 50))
            
            # Tiny rank penalty ensures that if the LLM gives multiple candidates the exact same score (e.g., 85%),
            # the UI will still sort them according to the highly accurate Jina Reranker's original order.
            display_score = round(max(0.0, llm_score - (rank * 0.01)), 2)
            
            upsert_match(db, job_id, cid, display_score, explanation)
            upserted_count += 1

        db.commit()
        print(f"[W2] Upserted {upserted_count} results for job {job_id} batch {batch_index + 1}")

        # ── 5. Update batch progress and check completion ─────────────────────
        # Atomically increment batches_completed, then flip to 'completed' if all done
        db.execute(
            text("""
                UPDATE job_requests
                SET batches_completed = batches_completed + 1
                WHERE id = :job_id
            """),
            {"job_id": job_id}
        )
        db.execute(
            text("""
                UPDATE job_requests
                SET matching_status = 'completed'
                WHERE id = :job_id AND batches_completed >= batches_total
            """),
            {"job_id": job_id}
        )
        db.commit()

        # ── 6. ACK only after successful DB write ─────────────────────────────
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'last_attempt') and e.last_attempt:
            error_msg = str(e.last_attempt.exception())
        print(f"[W2] ERROR in batch {batch_index} for job {job_id}: {error_msg}")
        db.rollback()
        
        # ── FAILSAFE: Prevent Infinite Polling ────────────────────────────────
        # Even if the LLM completely fails for this batch, we must increment 
        # batches_completed so the overall job can eventually reach 'completed' status.
        try:
            db.execute(
                text("UPDATE job_requests SET batches_completed = batches_completed + 1 WHERE id = :job_id"),
                {"job_id": job_id}
            )
            db.execute(
                text("UPDATE job_requests SET matching_status = 'completed' WHERE id = :job_id AND batches_completed >= batches_total"),
                {"job_id": job_id}
            )
            db.commit()
            print(f"[W2] Failsafe executed: Force-incremented batch progress for job {job_id}.")
        except Exception as failsafe_err:
            print(f"[W2] CRITICAL: Failsafe DB update failed: {failsafe_err}")
            
        # NACK and requeue=False — let RabbitMQ drop it or route to DLQ
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    finally:
        db.close()


def main():
    print("[W2] llm_evaluation_worker starting...", flush=True)
    parameters = pika.URLParameters(RABBITMQ_URL)
    # Disable heartbeats so long LLM calls don't cause connection drops
    parameters.heartbeat = 0

    for attempt in range(15):
        try:
            connection = pika.BlockingConnection(parameters)
            break
        except Exception as e:
            print(f"[W2] RabbitMQ not ready, retry {attempt + 1}/15 ({e})", flush=True)
            time.sleep(5)
    else:
        print("[W2] Could not connect to RabbitMQ. Exiting.", flush=True)
        return

    channel = connection.channel()
    
    # Declare Dead Letter Queue (DLQ)
    dlq_name = f"{QUEUE_SHORTLISTED}.dlq"
    channel.queue_declare(queue=dlq_name, durable=True)
    
    # Declare main queue and route dead letters to DLQ
    channel.queue_declare(
        queue=QUEUE_SHORTLISTED, 
        durable=True,
        arguments={
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": dlq_name
        }
    )
    channel.basic_qos(prefetch_count=1)  # Fair dispatch — each worker holds 1 message
    channel.basic_consume(queue=QUEUE_SHORTLISTED, on_message_callback=process_message)

    print(f"[W2] Ready — consuming from '{QUEUE_SHORTLISTED}'. CTRL+C to stop.")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    finally:
        connection.close()


if __name__ == "__main__":
    main()
