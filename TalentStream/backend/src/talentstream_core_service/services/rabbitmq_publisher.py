"""
RabbitMQ Publisher — backend/src/talentstream_core_service/services/rabbitmq_publisher.py
-----------------------------------------------------------------------------------------
Publishes lightweight trigger messages to the candidate_evaluation queue.
The API endpoint returns 202 immediately after publishing — the heavy
embedding search + LLM evaluation run asynchronously in the workers.

Queue topology:
  candidate_evaluation   ← this publisher writes here (1 msg per trigger)
  candidate_shortlisted  ← embedding_filter_worker writes here (1 msg per batch of 5)
"""

import json
import pika
from tenacity import retry, stop_after_attempt, wait_exponential
from talentstream_core_service.configs.config import settings


QUEUE_EVALUATION = "candidate_evaluation"


class RabbitMQPublisher:
    def __init__(self):
        self._connection = None
        self._channel = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=5))
    def publish_match_trigger(self, job_id: str, pm_id: str | None) -> None:
        """
        Publishes a single lightweight trigger message to the candidate_evaluation queue.
        Opens a fresh connection per request to prevent pika BlockingConnection 
        from timing out due to missed heartbeats in an async FastAPI environment.
        """
        connection = None
        try:
            params = pika.URLParameters(settings.RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            
            # Ensure the queue and DLQ exist
            dlq_name = f"{QUEUE_EVALUATION}.dlq"
            channel.queue_declare(queue=dlq_name, durable=True)
            channel.queue_declare(
                queue=QUEUE_EVALUATION, 
                durable=True,
                arguments={
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": dlq_name
                }
            )
            
            message = json.dumps({"job_id": job_id, "pm_id": pm_id})
            
            channel.basic_publish(
                exchange="",
                routing_key=QUEUE_EVALUATION,
                body=message,
                properties=pika.BasicProperties(
                    delivery_mode=pika.DeliveryMode.Persistent,
                ),
            )
        finally:
            if connection and not connection.is_closed:
                connection.close()


rabbitmq_publisher = RabbitMQPublisher()
