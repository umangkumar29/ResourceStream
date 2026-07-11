import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Numeric, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from sqlalchemy import Index
# TSVECTOR for BM25 Keyword Search
from sqlalchemy import Computed
from sqlalchemy.dialects.postgresql import TSVECTOR
from talentstream_core_service.db.database import Base

class CandidateStatus(str, enum.Enum):
    bench = "bench"
    earmarked = "earmarked"
    interview_scheduled = "interview_scheduled"
    selected_for_allocation = "selected_for_allocation"
    allocated = "allocated"
    rejected = "rejected"

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    employee_id = Column(String, nullable=True)  # Set manually by RMG; optionally extracted from resume
    status = Column(SAEnum(CandidateStatus, name="candidate_status"), nullable=False, default=CandidateStatus.bench)
    skills = Column(Text)
    experience_years = Column(Numeric(4, 1))
    resume_url = Column(String)
    resume_json = Column(JSONB)
    file_hash = Column(String(64), index=True, nullable=True) # SHA-256 hash of the PDF file
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to semantic chunks
    chunks = relationship("CandidateChunk", back_populates="candidate", cascade="all, delete-orphan")

class CandidateChunk(Base):
    __tablename__ = "candidate_chunks"
    __table_args__ = (
        Index('ix_candidate_chunks_tsv', 'tsv', postgresql_using='gin'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    chunk_type = Column(String, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)
    chunk_metadata = Column(JSONB, nullable=True)  # Stores dynamic fields like company, role, dates
    tsv = Column(TSVECTOR, Computed("to_tsvector('english', chunk_text)", persisted=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    candidate = relationship("Candidate", back_populates="chunks")
