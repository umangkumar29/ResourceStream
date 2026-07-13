"""
Worker 1 — embedding_filter_worker.py
--------------------------------------
Consumes from queue: candidate_evaluation   { job_id, pm_id }
Publishes to queue:  candidate_shortlisted  { job_id, pm_id, batch_index, total_batches, candidates[] }

Pipeline:
  1. Fetch job embedding and top_k from DB
  2. Run pgvector HNSW cosine similarity search (upgraded from 384-d to 1536-d OpenAI embeddings)
  3. Apply hard filters: status='bench', embedding is not NULL
  4. Chunk top-K results into batches of 5
  5. Publish each batch to candidate_shortlisted
  6. ACK original message only after ALL batches are published

NOTE: Embeddings are now 1536-dimensional (OpenAI text-embedding-3-small).
  Previously 384-d (sentence-transformers all-MiniLM-L6-v2) — changed for
  consistent embedding space between JDs and resumes, critical for cosine similarity.
"""

import os
import json
import time
import math
import pika
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from langsmith import traceable


load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://tsuser:tspassword@rabbitmq:5672/")
QUEUE_EVALUATION = "candidate_evaluation"
QUEUE_SHORTLISTED = "candidate_shortlisted"
BATCH_SIZE = 5

# ── Database Setup ──────────────────────────────────────────────────────────────
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def rerank_with_api(query: str, documents: list[str]) -> list[float] | None:
    """
    Attempts to rerank using Jina AI, Cohere, or Hugging Face Inference API depending on which key is in .env.
    Returns a list of floats (0.0 to 1.0) in the same order as documents, or None if failed.
    """
    import requests
    cohere_key = os.environ.get("COHERE_API_KEY")
    jina_key = os.environ.get("JINA_API_KEY")
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HF_API_KEY")
    
    if jina_key:
        try:
            print(f"[W1] Calling Jina AI Reranker API for {len(documents)} docs...")
            resp = requests.post(
                "https://api.jina.ai/v1/rerank",
                headers={"Authorization": f"Bearer {jina_key}"},
                json={"model": "jina-reranker-v3", "query": query, "documents": documents, "top_n": len(documents)},
                timeout=15
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                scores = [0.0] * len(documents)
                for r in results:
                    scores[r["index"]] = max(0.0, min(1.0, r["relevance_score"]))
                return scores
            else:
                print(f"[W1] Jina API Error: {resp.text}")
        except Exception as e:
            print(f"[W1] Jina API Exception: {e}")
            
    if cohere_key:
        try:
            print(f"[W1] Calling Cohere Rerank API for {len(documents)} docs...")
            resp = requests.post(
                "https://api.cohere.com/v1/rerank",
                headers={"Authorization": f"Bearer {cohere_key}"},
                json={"model": "rerank-english-v3.0", "query": query, "documents": documents},
                timeout=15
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                scores = [0.0] * len(documents)
                for r in results:
                    scores[r["index"]] = max(0.0, min(1.0, r["relevance_score"]))
                return scores
            else:
                print(f"[W1] Cohere API Error: {resp.text}")
        except Exception as e:
            print(f"[W1] Cohere API Exception: {e}")

    if hf_token:
        try:
            print(f"[W1] Calling Hugging Face BGE Reranker API for {len(documents)} docs...")
            # Using Cross-Encoder standard payload for HF Inference API
            payload = {"inputs": [{"text": query, "text_pair": doc} for doc in documents]}
            resp = requests.post(
                "https://api-inference.huggingface.co/models/BAAI/bge-reranker-base",
                headers={"Authorization": f"Bearer {hf_token}"},
                json=payload,
                timeout=20
            )
            if resp.status_code == 200:
                results = resp.json()
                scores = []
                for s in results:
                    if isinstance(s, dict) and 'score' in s:
                        scores.append(s['score'])
                    elif isinstance(s, (float, int)):
                        scores.append(float(s))
                    elif isinstance(s, list) and len(s) > 0 and isinstance(s[0], dict) and 'score' in s[0]:
                        scores.append(s[0]['score'])
                    else:
                        scores.append(0.5) # Fallback
                
                if len(scores) == len(documents):
                    # Sigmoid normalization if logits are returned
                    import math
                    def sigmoid(x): return 1 / (1 + math.exp(-x))
                    if any(s < 0 or s > 1 for s in scores):
                        scores = [sigmoid(s) for s in scores]
                    return scores
            else:
                print(f"[W1] HF API Error: {resp.text}")
        except Exception as e:
            print(f"[W1] HF API Exception: {e}")

    return None

# (BGE Reranker completely removed in favor of pure database-level hybrid RRF scoring)

@traceable(name="W1_Hybrid_Search_And_Rerank", run_type="chain")
def get_top_candidates(db: Session, job_id: str, excluded_candidate_ids: list[str] | None = None) -> tuple[list[dict], int]:
    """
    Stage 1: Hybrid Search (pgvector cosine + BM25 keyword RRF) -> Top 50 DISTINCT candidates.
    Stage 2: BGE Cross-Encoder chunk scoring -> Chunk-Type Weighted Aggregation (50/30/15/5).
    """
    from collections import defaultdict

    job_row = db.execute(
        text("SELECT description, embedding, top_k FROM job_requests WHERE id = :job_id"),
        {"job_id": job_id}
    ).fetchone()

    if not job_row or job_row.embedding is None:
        print(f"[W1] Job {job_id} not found or has no embedding — skipping.")
        return [], 0

    jd_text = job_row.description or ""
    jd_vector = job_row.embedding
    top_k = int(job_row.top_k) if job_row.top_k else 5
    fetch_limit = max(top_k * 5, 50)  # Always get at least 50 for candidate pool

    import re
    # Extract meaningful words for OR-based BM25 search
    words = [w for w in re.findall(r'\b[A-Za-z]{3,}\b', jd_text) if w.lower() not in {'and', 'the', 'for', 'with', 'this', 'that', 'are', 'you', 'will'}]
    jd_keywords = " OR ".join(words[:30]) if words else "developer"

    # Build exclusion clause dynamically
    exclusion_clause = ""
    params: dict = {"jd_vector": str(jd_vector), "jd_text": jd_text[:1000], "jd_keywords": jd_keywords, "limit": fetch_limit}
    if excluded_candidate_ids:
        exclusion_clause = "AND c.id::text != ALL(CAST(:exclude_ids AS text[]))"
        params["exclude_ids"] = "{" + ",".join(excluded_candidate_ids) + "}"
        print(f"[W1] Re-Trigger mode: excluding {len(excluded_candidate_ids)} candidates.")

    # ── STAGE 1 & 2: Bi-Encoder Hybrid Search (RRF) + Chunk Weighting ────────────
    # Combines vector similarity and keyword BM25 into a fused score.
    # We then apply the 50/30/15/5 chunk weights directly in SQL to calculate the final match_score.
    db.execute(text("SET LOCAL enable_indexscan = off"))
    
    rrf_sql = text(f"""
        WITH vector_ranked AS (
            SELECT
                cc.id AS chunk_id,
                cc.candidate_id,
                cc.chunk_type,
                1 - (cc.embedding <=> CAST(:jd_vector AS vector)) AS cosine_sim,
                RANK() OVER (ORDER BY cc.embedding <=> CAST(:jd_vector AS vector)) AS vec_rank
            FROM candidate_chunks cc
            JOIN candidates c ON c.id = cc.candidate_id
            WHERE c.status = 'bench' {exclusion_clause}
        ),
        keyword_ranked AS (
            SELECT
                cc.id AS chunk_id,
                cc.candidate_id,
                cc.chunk_type,
                RANK() OVER (
                    ORDER BY ts_rank(cc.tsv, websearch_to_tsquery('english', :jd_keywords)) DESC
                ) AS kw_rank
            FROM candidate_chunks cc
            JOIN candidates c ON c.id = cc.candidate_id
            WHERE c.status = 'bench' {exclusion_clause}
              AND cc.tsv @@ websearch_to_tsquery('english', :jd_keywords)
        ),
        fused AS (
            SELECT
                COALESCE(v.candidate_id, k.candidate_id) AS candidate_id,
                COALESCE(v.chunk_type, k.chunk_type) AS chunk_type,
                (1.0 / (60 + COALESCE(v.vec_rank, 1000))) +
                (1.0 / (60 + COALESCE(k.kw_rank, 1000))) AS rrf_score,
                v.cosine_sim
            FROM vector_ranked v
            FULL OUTER JOIN keyword_ranked k
                ON v.chunk_id = k.chunk_id
        ),
        best_per_chunk_type AS (
            SELECT DISTINCT ON (candidate_id, chunk_type) 
                   candidate_id, chunk_type, rrf_score, cosine_sim
            FROM fused
            ORDER BY candidate_id, chunk_type, rrf_score DESC
        ),
        weighted_candidates AS (
            SELECT candidate_id,
                   SUM(
                       rrf_score * 
                       CASE 
                           WHEN chunk_type = 'work_experience' THEN 0.50
                           WHEN chunk_type = 'skills' THEN 0.30
                           WHEN chunk_type = 'key_projects' THEN 0.15
                           WHEN chunk_type = 'professional_summary' THEN 0.05
                           ELSE 0.05
                       END
                   ) / SUM(
                       CASE 
                           WHEN chunk_type = 'work_experience' THEN 0.50
                           WHEN chunk_type = 'skills' THEN 0.30
                           WHEN chunk_type = 'key_projects' THEN 0.15
                           WHEN chunk_type = 'professional_summary' THEN 0.05
                           ELSE 0.05
                       END
                   ) AS final_rrf_score,
                   SUM(
                       COALESCE(cosine_sim, 0.0) * 
                       CASE 
                           WHEN chunk_type = 'work_experience' THEN 0.50
                           WHEN chunk_type = 'skills' THEN 0.30
                           WHEN chunk_type = 'key_projects' THEN 0.15
                           WHEN chunk_type = 'professional_summary' THEN 0.05
                           ELSE 0.05
                       END
                   ) / SUM(
                       CASE 
                           WHEN chunk_type = 'work_experience' THEN 0.50
                           WHEN chunk_type = 'skills' THEN 0.30
                           WHEN chunk_type = 'key_projects' THEN 0.15
                           WHEN chunk_type = 'professional_summary' THEN 0.05
                           ELSE 0.05
                       END
                   ) AS final_cosine_score
            FROM best_per_chunk_type
            GROUP BY candidate_id
        )
        SELECT w.candidate_id::text, w.final_rrf_score, w.final_cosine_score, c.resume_json
        FROM weighted_candidates w
        JOIN candidates c ON c.id = w.candidate_id
        ORDER BY w.final_rrf_score DESC
        LIMIT :limit;
    """)
    
    rrf_rows = db.execute(rrf_sql, params).fetchall()
    if not rrf_rows:
        return [], top_k
        
    best_candidates = []
    for row in rrf_rows:
        best_candidates.append({
            "candidate_id": row.candidate_id,
            "resume_json": row.resume_json,
            "similarity_score": float(row.final_cosine_score)
        })
    
    # Optional Stage 2: Hosted API Reranking
    # We take a slightly wider pool (up to 30) for the API to rerank
    best_candidates = best_candidates[:max(top_k * 3, 30)]
    
    if os.environ.get("JINA_API_KEY") or os.environ.get("COHERE_API_KEY") or os.environ.get("HF_TOKEN") or os.environ.get("HF_API_KEY"):
        documents_to_score = []
        for c in best_candidates:
            rj = c.get("resume_json") or {}
            cand_data = rj.get("candidate", rj) if isinstance(rj, dict) else {}
            
            skills = ", ".join(cand_data.get("skills", []))
            summary = cand_data.get("professional_summary", "")
            # Truncate text to fit into API context windows
            doc_text = f"Skills: {skills}\nSummary: {summary}"[:1500]
            documents_to_score.append(doc_text)
            
        api_scores = rerank_with_api(query=jd_text[:1000], documents=documents_to_score)
        if api_scores and len(api_scores) == len(best_candidates):
            for i, c in enumerate(best_candidates):
                c["similarity_score"] = api_scores[i]
            
            # Re-sort by the new hosted API reranker scores
            best_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
            print(f"[W1] Successfully reranked top {len(best_candidates)} using Hosted API.", flush=True)
        else:
            print("[W1] Hosted API Reranking failed or skipped. Using SQL cosine scores.", flush=True)
            # Make sure it's sorted by SQL score if API fails
            best_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
            
    # We already sorted, so we can just slice down to top_k
    best_candidates = best_candidates[:top_k]
    
    print(f"[W1] Stage 1 & 2 complete. Forwarding Top {len(best_candidates)} to W2.", flush=True)
    return best_candidates, top_k



def publish_batches(channel, job_id: str, pm_id: str | None, candidates: list[dict]) -> int:
    """
    Chunks candidates into groups of BATCH_SIZE and publishes each group
    to candidate_shortlisted. Returns total number of batches published.
    """
    dlq_name = f"{QUEUE_SHORTLISTED}.dlq"
    channel.queue_declare(queue=dlq_name, durable=True)
    channel.queue_declare(
        queue=QUEUE_SHORTLISTED, 
        durable=True,
        arguments={
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": dlq_name
        }
    )

    total_batches = math.ceil(len(candidates) / BATCH_SIZE)
    for i in range(total_batches):
        batch = candidates[i * BATCH_SIZE: (i + 1) * BATCH_SIZE]
        message = json.dumps({
            "job_id": job_id,
            "pm_id": pm_id,
            "batch_index": i,
            "total_batches": total_batches,
            "candidates": batch,  # [{candidate_id, similarity_score}]
        })
        channel.basic_publish(
            exchange="",
            routing_key=QUEUE_SHORTLISTED,
            body=message,
            properties=pika.BasicProperties(delivery_mode=pika.DeliveryMode.Persistent),
        )
        print(f"[W1] Published batch {i + 1}/{total_batches} for job {job_id} ({len(batch)} candidates)")

    return total_batches


def process_message(ch, method, properties, body):
    payload = json.loads(body)
    job_id = payload.get("job_id")
    pm_id = payload.get("pm_id")
    excluded_candidate_ids = payload.get("excluded_candidate_ids")  # None for fresh runs

    print(f"[W1] Received trigger for job {job_id} (pm_id={pm_id}, retrigger={bool(excluded_candidate_ids)})", flush=True)

    db = SessionLocal()
    try:
        # IMMEDIATELY set status to running so UI knows it started
        db.execute(
            text("UPDATE job_requests SET matching_status = 'running', matching_started_at = NOW() WHERE id = :job_id"),
            {"job_id": job_id}
        )
        db.commit()

        candidates, top_k = get_top_candidates(db, job_id, excluded_candidate_ids)
        
        if not candidates:
            print(f"[W1] No (new) candidates found for job {job_id} — ACKing and skipping.", flush=True)
            db.execute(text("UPDATE job_requests SET matching_status = 'completed', batches_total = 0, batches_completed = 0 WHERE id = :job_id"), {"job_id": job_id})
            db.commit()
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Update total batches now that we know how many candidates there are
        total_batches = math.ceil(len(candidates) / BATCH_SIZE)
        db.execute(
            text("UPDATE job_requests SET batches_total = :total, batches_completed = 0 WHERE id = :job_id"),
            {"total": total_batches, "job_id": job_id}
        )
        db.commit()

        publish_batches(ch, job_id, pm_id, candidates)
        print(f"[W1] Done — published {total_batches} batch(es) for job {job_id} (Total candidates: {len(candidates)})", flush=True)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"[W1] ERROR processing job {job_id}: {e}")
        # Use requeue=False to prevent infinite loop on persistent errors
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    finally:
        db.close()


def main():
    print("[W1] embedding_filter_worker starting...", flush=True)
    parameters = pika.URLParameters(RABBITMQ_URL)
    # Disable heartbeats so heavy CPU tasks (BGE reranking) don't cause connection drops
    parameters.heartbeat = 0

    for attempt in range(15):
        try:
            connection = pika.BlockingConnection(parameters)
            break
        except Exception as e:
            print(f"[W1] RabbitMQ not ready, retry {attempt + 1}/15 ({e})", flush=True)
            time.sleep(5)
    else:
        print("[W1] Could not connect to RabbitMQ. Exiting.", flush=True)
        return

    channel = connection.channel()
    
    # Declare Dead Letter Queue (DLQ)
    dlq_name = f"{QUEUE_EVALUATION}.dlq"
    channel.queue_declare(queue=dlq_name, durable=True)
    
    # Declare main queue and route dead letters to DLQ
    channel.queue_declare(
        queue=QUEUE_EVALUATION, 
        durable=True,
        arguments={
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": dlq_name
        }
    )
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_EVALUATION, on_message_callback=process_message)

    print(f"[W1] Ready — consuming from '{QUEUE_EVALUATION}'. CTRL+C to stop.")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    finally:
        connection.close()


if __name__ == "__main__":
    main()
