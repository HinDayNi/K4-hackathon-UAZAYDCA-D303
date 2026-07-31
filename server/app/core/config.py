from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
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
    deepseek_timeout_seconds: float = 120.0
    deepseek_fast_timeout_seconds: float = 30.0
    deepseek_standard_timeout_seconds: float = 60.0
    deepseek_large_timeout_seconds: float = 120.0
    deepseek_query_expansion_max_tokens: int = 400
    deepseek_rerank_max_tokens: int = 1200
    deepseek_block_summary_max_tokens: int = 500
    deepseek_slide_summary_max_tokens: int = 900
    deepseek_tutor_answer_max_tokens: int = 1600
    deepseek_mindmap_max_tokens: int = 8000
    retrieval_candidate_limit: int = 20
    retrieval_context_limit: int = 8
    retrieval_min_relevance: float = 0.35
    grounded_min_confidence: int = 60
    mindmap_generation_version: str = "learning-map-v3"
    mindmap_prompt_version: str = "learning-map-importance-signals-v3"
    mindmap_max_depth: int = 3
    mindmap_min_sections: int = 4
    mindmap_max_sections: int = 8
    mindmap_min_topics_per_section: int = 2
    mindmap_max_topics_per_section: int = 4
    mindmap_target_min_nodes: int = 15
    mindmap_target_max_nodes: int = 25
    mindmap_input_char_budget: int = 75_000
    mindmap_slide_title_max_chars: int = 120
    mindmap_slide_summary_max_chars: int = 240
    mindmap_slide_summary_min_chars: int = 140
    mindmap_max_source_slides_per_node: int = 3
    mindmap_importance_foundational_weight: float = Field(0.30, ge=0, le=1)
    mindmap_importance_emphasis_weight: float = Field(0.25, ge=0, le=1)
    mindmap_importance_downstream_weight: float = Field(0.20, ge=0, le=1)
    mindmap_importance_applicability_weight: float = Field(0.15, ge=0, le=1)
    mindmap_importance_coverage_weight: float = Field(0.10, ge=0, le=1)
    mindmap_important_threshold: int = Field(80, ge=0, le=100)
    mindmap_should_know_threshold: int = Field(50, ge=0, le=100)
    mindmap_important_max_ratio: float = Field(0.30, gt=0, le=1)
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

    @model_validator(mode="after")
    def validate_mindmap_importance_thresholds(self) -> "Settings":
        if self.mindmap_important_threshold <= self.mindmap_should_know_threshold:
            raise ValueError(
                "MINDMAP_IMPORTANT_THRESHOLD must be greater than "
                "MINDMAP_SHOULD_KNOW_THRESHOLD"
            )
        return self

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
