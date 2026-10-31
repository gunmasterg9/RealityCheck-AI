"""Application configuration using Pydantic Settings."""
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Determine project base directory
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    app_name: str = "RealityCheck AI"
    app_version: str = "2.1.0"
    environment: str = Field(default="development", alias="REALITYCHECK_ENV")
    
    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    # Provider & Inference Architecture
    default_provider_mode: str = Field(default="auto", alias="DEFAULT_PROVIDER_MODE")  # auto, cloud, local, offline
    stage_timeout_seconds: int = Field(default=90, alias="STAGE_TIMEOUT_SECONDS")
    total_verification_timeout_seconds: int = Field(default=300, alias="TOTAL_VERIFICATION_TIMEOUT_SECONDS")
    max_llm_retries: int = Field(default=1, alias="MAX_LLM_RETRIES")
    inference_timeout_seconds: int = Field(default=90, alias="INFERENCE_TIMEOUT_SECONDS")

    # Local Inference (Ollama) - Optimized for Low-Resource Hardware (Core i3 / 8GB RAM)
    ollama_base_url: str = Field(default="http://127.0.0.1:11434", alias="OLLAMA_BASE_URL")
    local_model_id: str = Field(default="qwen3:1.7b", alias="LOCAL_MODEL_ID")
    heavy_local_model_id: str = Field(default="gemma4:e4b", alias="HEAVY_LOCAL_MODEL_ID")
    ollama_num_ctx: int = Field(default=2048, alias="OLLAMA_NUM_CTX")
    ollama_num_predict: int = Field(default=1024, alias="OLLAMA_NUM_PREDICT")
    ollama_num_threads: int = Field(default=4, alias="OLLAMA_NUM_THREADS")
    
    # Cloud Inference (Google Gemini)
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    cloud_model_id: str = Field(default="gemini-3.5-flash", alias="CLOUD_MODEL_ID")
    
    # External Fact-Checking & Search APIs
    fact_check_api_key: Optional[str] = Field(default=None, alias="FACT_CHECK_API_KEY")
    tavily_api_key: Optional[str] = Field(default=None, alias="TAVILY_API_KEY")
    brave_search_api_key: Optional[str] = Field(default=None, alias="BRAVE_SEARCH_API_KEY")
    web_search_provider: str = Field(default="auto", alias="WEB_SEARCH_PROVIDER")
    
    # Web Scraping & Security Limits
    max_scrape_bytes: int = 2 * 1024 * 1024  # 2MB
    max_scrape_timeout_seconds: int = 10
    max_redirects: int = 5
    
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
    def resolved_fact_check_key(self) -> Optional[str]:
        """Returns FACT_CHECK_API_KEY if configured, or falls back to GEMINI_API_KEY."""
        return self.fact_check_api_key or self.gemini_api_key

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
