"""Application configuration using Pydantic Settings."""
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Determine project base directory
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    app_name: str = "RealityCheck AI"
    app_version: str = "1.0.0"
    environment: str = Field(default="development", alias="REALITYCHECK_ENV")
    
    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    # Local Inference (Ollama)
    ollama_base_url: str = Field(default="http://127.0.0.1:11434", alias="OLLAMA_BASE_URL")
    local_model_id: str = Field(default="gemma4:e4b", alias="LOCAL_MODEL_ID")
    inference_timeout_seconds: int = Field(default=180, alias="INFERENCE_TIMEOUT_SECONDS")
    
    # Cloud Inference (Optional Google Gemini)
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    cloud_model_id: str = Field(default="gemini-2.5-flash", alias="CLOUD_MODEL_ID")
    
    # Database
    sqlite_db_path: str = Field(default="realitycheck.db", alias="SQLITE_DB_PATH")
    
    # Validation constraints
    max_claim_chars: int = 2000
    max_context_chars: int = 12000

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", BASE_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resolved_db_path(self) -> Path:
        p = Path(self.sqlite_db_path)
        if not p.is_absolute():
            return BASE_DIR / p
        return p

settings = Settings()
