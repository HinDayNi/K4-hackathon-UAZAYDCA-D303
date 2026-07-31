import json
from dataclasses import dataclass
from typing import Any, Literal

from app.core.config import Settings


AITaskPurpose = Literal[
    "query_expansion",
    "rerank",
    "block_summary",
    "slide_summary",
    "tutor_answer",
    "mindmap",
]


class AIResponseError(ValueError):
    pass


class AIResponseTruncatedError(AIResponseError):
    pass


@dataclass(frozen=True)
class AITaskProfile:
    purpose: AITaskPurpose
    max_tokens: int
    timeout_seconds: float
    thinking_enabled: bool = False

    @property
    def extra_body(self) -> dict[str, dict[str, str]]:
        return {
            "thinking": {
                "type": "enabled" if self.thinking_enabled else "disabled"
            }
        }


def get_ai_profile(purpose: AITaskPurpose, settings: Settings) -> AITaskProfile:
    profiles = {
        "query_expansion": AITaskProfile(
            purpose,
            settings.deepseek_query_expansion_max_tokens,
            settings.deepseek_fast_timeout_seconds,
        ),
        "rerank": AITaskProfile(
            purpose,
            settings.deepseek_rerank_max_tokens,
            settings.deepseek_fast_timeout_seconds,
        ),
        "block_summary": AITaskProfile(
            purpose,
            settings.deepseek_block_summary_max_tokens,
            settings.deepseek_fast_timeout_seconds,
        ),
        "slide_summary": AITaskProfile(
            purpose,
            settings.deepseek_slide_summary_max_tokens,
            settings.deepseek_standard_timeout_seconds,
        ),
        "tutor_answer": AITaskProfile(
            purpose,
            settings.deepseek_tutor_answer_max_tokens,
            settings.deepseek_standard_timeout_seconds,
        ),
        "mindmap": AITaskProfile(
            purpose,
            settings.deepseek_mindmap_max_tokens,
            settings.deepseek_large_timeout_seconds,
        ),
    }
    try:
        return profiles[purpose]
    except KeyError as exc:
        raise ValueError(f"Unknown AI task purpose: {purpose}") from exc


def parse_completion_json(response: Any, purpose: AITaskPurpose) -> dict[str, Any]:
    if not response.choices:
        raise AIResponseError(f"DeepSeek returned no choices for {purpose}")
    choice = response.choices[0]
    finish_reason = choice.finish_reason
    if finish_reason == "length":
        raise AIResponseTruncatedError(
            f"DeepSeek stopped before completing {purpose} JSON"
        )
    if finish_reason != "stop":
        raise AIResponseError(
            f"DeepSeek stopped {purpose} with finish_reason={finish_reason}"
        )
    content = choice.message.content
    if not content:
        raise AIResponseError(f"DeepSeek returned empty JSON for {purpose}")
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise AIResponseError(f"DeepSeek returned malformed JSON for {purpose}") from exc
    if not isinstance(payload, dict):
        raise AIResponseError(f"DeepSeek returned non-object JSON for {purpose}")
    return payload


def completion_usage(response: Any) -> tuple[int | None, int | None, int | None]:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None, None, None
    return usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
