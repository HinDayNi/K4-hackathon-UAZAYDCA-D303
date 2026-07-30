from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVER_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "VLearn AI Tutor API"
    api_prefix: str = "/api/v1"
    database_path: Path = Path("storage/vlearn.db")
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
