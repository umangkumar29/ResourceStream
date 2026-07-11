from typing import List, Dict, Any
from sqlalchemy.orm import Session
from talentstream_core_service.db.models import CandidateChunk
from talentstream_core_service.services.embeddings.openai import OpenAIEmbeddings
from talentstream_core_service.repositories.candidate_repository import CandidateRepository

class PGVectorStore:
    """
    Handles operations related to embedding generation and storage in PostgreSQL vector database.
    """
    def __init__(self, db: Session):
        self.db = db
        self.repo = CandidateRepository(db)
        self.embeddings_service = OpenAIEmbeddings()

    def embed_and_store_chunks(self, candidate_id: str, chunks_data: List[Dict[str, Any]], auto_commit: bool = True) -> None:
        """
        Takes raw semantic chunk data, generates embeddings for each, and saves them to PGVector.
        """
        if not chunks_data:
            return

        # 1. Extract all text payloads into a single array
        texts = [chunk["chunk_text"] for chunk in chunks_data]
        
        # 2. Call OpenAI API exactly once with the entire batch
        vectors = self.embeddings_service.get_embeddings_batch(texts)
        
        # 3. Reconstruct the SQLAlchemy objects by zipping the vectors back with their metadata
        chunks_to_save = []
        for chunk, vector in zip(chunks_data, vectors):
            new_chunk = CandidateChunk(
                candidate_id=candidate_id,
                chunk_type=chunk["chunk_type"],
                chunk_text=chunk["chunk_text"],
                embedding=vector,
                chunk_metadata=chunk.get("metadata", {})
            )
            chunks_to_save.append(new_chunk)
        
        # 4. Perform a bulk database insert
        self.repo.save_chunks(chunks_to_save, auto_commit=auto_commit)
