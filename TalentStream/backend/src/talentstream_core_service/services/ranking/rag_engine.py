"""
RAG Engine V2 — Async Matching Dispatcher

This module is now a THIN WRAPPER that delegates all heavy lifting to the
RabbitMQ worker pipeline (W1 → W2). The synchronous pipeline has been removed
to eliminate the duplicate logic that previously existed between this file
and the workers.

Architecture:
  API call → rag_engine.trigger() → RabbitMQ publisher → W1 (Hybrid RRF + BGE) → W2 (LLM Evaluation)

The RAGEngine class is kept for backward compatibility with any code that
imports `from ...rag_engine import rag_engine`.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from talentstream_core_service.db.models import JobRequest
from talentstream_core_service.services.rabbitmq_publisher import rabbitmq_publisher

logger = logging.getLogger(__name__)


class RAGEngine:
    """
    V2 Matching Engine — delegates to RabbitMQ workers for async processing.

    All matching logic (Hybrid RRF, BGE Cross-Encoder, Chunk-Type Weighting,
    Structured LLM Explanation) now lives exclusively in:
      - worker/embedding_filter_worker.py  (W1: Search + Rerank)
      - worker/llm_evaluation_worker.py    (W2: LLM Evaluation + DB Persist)
    """

    def trigger(self, job_id: str, db: Session) -> dict:
        """
        Publishes a match trigger to RabbitMQ and returns immediately.
        The workers handle the heavy lifting asynchronously.

        Args:
            job_id: UUID string of the JobRequest to match against.
            db: Active SQLAlchemy session (used only to verify the job exists).

        Returns:
            Dict with status and job_id for the caller.
        """
        # Verify the job exists and has an embedding
        job: JobRequest | None = db.query(JobRequest).filter(
            JobRequest.id == job_id
        ).first()
        if not job:
            raise ValueError(f"Job request {job_id} not found.")
        if not job.embedding:
            raise ValueError(f"Job request {job_id} has no embedding. Cannot match.")

        logger.info(f"[RAGEngine] Dispatching match for job_id={job_id} to RabbitMQ")

        # Publish to RabbitMQ — W1 picks it up within milliseconds
        rabbitmq_publisher.publish_match_trigger(
            job_id=str(job.id),
            pm_id=str(job.project_manager_id) if job.project_manager_id else None,
        )

        return {
            "status": "queued",
            "job_id": str(job.id),
            "message": "Match job dispatched to async workers.",
        }

    def run(self, job_id: str, db: Session) -> list[dict]:
        """
        Backward-compatible entry point. Previously ran the full synchronous
        pipeline; now delegates to trigger() and returns an empty list.

        Callers should migrate to trigger() and poll GET /jobs/{id}/results
        for incremental results instead of expecting a synchronous response.
        """
        logger.warning(
            f"[RAGEngine] rag_engine.run() called for job_id={job_id}. "
            "This is now async — dispatching to RabbitMQ workers."
        )
        self.trigger(job_id, db)
        # Return empty list since results will arrive asynchronously via workers
        return []


# Module-level singleton — imported by routers and webhooks
rag_engine = RAGEngine()
