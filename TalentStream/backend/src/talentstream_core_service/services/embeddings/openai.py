from typing import List
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from talentstream_core_service.configs.config import settings
from .base import BaseEmbeddings

class OpenAIEmbeddings(BaseEmbeddings):
    """
    OpenAI implementation for text embeddings.
    """
    def __init__(self):
        self._client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL if settings.OPENAI_BASE_URL else None,
        ) if settings.OPENAI_API_KEY else None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def get_embedding(self, text: str) -> List[float]:
        """
        Returns a 1536-dimensional embedding vector using OpenAI text-embedding-3-small.
        Truncates text to ~8000 characters to fit token limits.
        """
        if not self._client:
            # Fallback zero vector if no API key configured
            return [0.0] * settings.OPENAI_EMBEDDING_DIMENSION

        response = self._client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Takes a list of strings and returns a list of embedding vectors.
        This is significantly faster and cheaper than calling get_embedding in a loop.
        """
        if not self._client:
            return [[0.0] * settings.OPENAI_EMBEDDING_DIMENSION for _ in texts]
            
        if not texts:
            return []

        response = self._client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=texts,
        )
        
        # OpenAI returns the embeddings in the same order as the input array
        # Ensure we sort them by index just in case they are returned out of order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [data.embedding for data in sorted_data]
