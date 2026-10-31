"""Abstract Base Class and common types for AI Providers."""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.schemas import ProviderDetail

class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier: 'local' or 'cloud'."""
        pass

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Model identifier being used."""
        pass

    @abstractmethod
    async def check_health(self) -> ProviderDetail:
        """Check provider status and availability."""
        pass

    @abstractmethod
    async def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate structured JSON response given a prompt and optional system prompt."""
        pass
