from abc import ABC, abstractmethod
from typing import List

class BaseEmbeddings(ABC):
    """
    Abstract base class for all embedding providers.
    """
    @abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        """
        Convert text into a vector embedding.
        
        Args:
            text (str): The text to embed.
            
        Returns:
            List[float]: The vector embedding.
        """
        pass
