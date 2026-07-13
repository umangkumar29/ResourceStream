from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from talentstream_core_service.db.database import get_db
from talentstream_core_service.services.ranking.rag_engine import rag_engine
from talentstream_core_service.configs.config import settings

router = APIRouter()


def _verify_hasura_secret(x_hasura_event_secret: str = Header(None)):
    """Simple shared-secret verification for Hasura Event Trigger calls."""
    if x_hasura_event_secret != settings.FASTAPI_INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Invalid event secret.")


@router.post(
    "/process-match",
    summary="Hasura Event Trigger: on_job_request_created",
    dependencies=[Depends(_verify_hasura_secret)],
    status_code=202,
)
def process_match_webhook(payload: dict, db: Session = Depends(get_db)):
    """
    Receives a Hasura Event Trigger payload whenever a new row is
    inserted into `job_requests` and dispatches the match job to
    the RabbitMQ worker pipeline asynchronously.

    Returns 202 immediately — results accumulate via W1 → W2.
    """
    try:
        new_row = payload.get("event", {}).get("data", {}).get("new", {})
        job_id = new_row.get("id")

        if not job_id:
            raise HTTPException(status_code=400, detail="Missing job_id in payload.")

        result = rag_engine.trigger(job_id=job_id, db=db)

        return {
            "status": "queued",
            "job_id": job_id,
            "message": result.get("message", "Match dispatched to async workers."),
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch match: {str(e)}")
