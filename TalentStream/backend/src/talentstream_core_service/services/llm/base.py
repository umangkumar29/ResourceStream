from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseLLM(ABC):
    """
    Abstract base class for LLM providers.
    """
    
    @abstractmethod
    def generate_match_justification(self, job_description: str, resume_text: str) -> str:
        pass
        
    @abstractmethod
    def generate_jd_from_keywords(self, keywords: str, role_title: str) -> str:
        pass
        
    @abstractmethod
    def parse_resume_to_json(self, resume_text: str) -> Dict[str, Any]:
        pass
