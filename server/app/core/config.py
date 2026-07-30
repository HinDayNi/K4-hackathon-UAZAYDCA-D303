from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVER_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "VLearn AI Tutor API"
    api_prefix: str = "/api/v1"
    database_path: Path = Path("storage/vlearn.db")
    upload_path: Path = Path("storage/uploads")
    max_upload_bytes: int = 25 * 1024 * 1024
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-flash"
    deepseek_timeout_seconds: float = 30.0
    retrieval_candidate_limit: int = 20
    retrieval_context_limit: int = 8
    retrieval_min_relevance: float = 0.35
    grounded_min_confidence: int = 60
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=SERVER_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def resolved_database_path(self) -> Path:
        if self.database_path.is_absolute():
            return self.database_path
        return (SERVER_ROOT / self.database_path).resolve()

    @property
    def resolved_upload_path(self) -> Path:
        if self.upload_path.is_absolute():
            return self.upload_path
        return (SERVER_ROOT / self.upload_path).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
