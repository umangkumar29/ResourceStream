from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
from talentstream_core_service.db.models import Candidate

class CandidateRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, candidate_id: str) -> Optional[Candidate]:
        return self.db.query(Candidate).filter(Candidate.id == candidate_id).first()

    def get_by_email(self, email: str) -> Optional[Candidate]:
        return self.db.query(Candidate).filter(Candidate.email == email).first()

    def get_by_file_hash(self, file_hash: str) -> Optional[Candidate]:
        if not file_hash:
            return None
        return self.db.query(Candidate).filter(Candidate.file_hash == file_hash).first()

    def get_by_email_or_phone(self, email: Optional[str], phone: Optional[str]) -> Optional[Candidate]:
        from sqlalchemy import or_
        filters = []
        if email:
            filters.append(Candidate.email == email)
        if phone:
            filters.append(Candidate.phone == phone)
        if not filters:
            return None
        return self.db.query(Candidate).filter(or_(*filters)).first()
        
    def save_chunks(self, chunks: list, auto_commit: bool = True) -> None:
        if chunks:
            self.db.add_all(chunks)
            if auto_commit:
                self.db.commit()

    def get_all(self, search: Optional[str] = None, status_filter: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Candidate]:
        query = self.db.query(Candidate)

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Candidate.name.ilike(search_filter)) |
                (Candidate.email.ilike(search_filter)) |
                (Candidate.skills.ilike(search_filter))
            )

        if status_filter:
            query = query.filter(Candidate.status == status_filter.lower())

        return query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, candidate: Candidate, auto_commit: bool = True) -> Candidate:
        self.db.add(candidate)
        if auto_commit:
            self.db.commit()
            self.db.refresh(candidate)
        else:
            self.db.flush()
        return candidate

    def update(self, candidate: Candidate) -> Candidate:
        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def delete(self, candidate: Candidate) -> None:
        self.db.delete(candidate)
        self.db.commit()
