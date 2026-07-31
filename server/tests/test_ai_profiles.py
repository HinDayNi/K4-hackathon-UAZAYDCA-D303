from types import SimpleNamespace

import pytest

from app.core.ai_profiles import (
    AIResponseError,
    AIResponseTruncatedError,
    get_ai_profile,
    parse_completion_json,
)
from app.core.config import get_settings


def _response(content: str, finish_reason: str = "stop"):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                finish_reason=finish_reason,
                message=SimpleNamespace(content=content),
            )
        ],
        usage=SimpleNamespace(
            prompt_tokens=10, completion_tokens=5, total_tokens=15
        ),
    )


def test_task_profiles_have_bounded_budgets_and_disable_thinking() -> None:
    settings = get_settings()
    expected = {
        "query_expansion": (400, 30),
        "rerank": (1200, 30),
        "block_summary": (500, 30),
        "slide_summary": (900, 60),
        "tutor_answer": (1600, 60),
        "mindmap": (8000, 120),
    }
    for purpose, budget in expected.items():
        profile = get_ai_profile(purpose, settings)  # type: ignore[arg-type]
        assert (profile.max_tokens, profile.timeout_seconds) == budget
        assert profile.extra_body == {"thinking": {"type": "disabled"}}


def test_completion_parser_accepts_complete_json() -> None:
    assert parse_completion_json(_response('{"ok": true}'), "mindmap") == {
        "ok": True
    }


def test_completion_parser_rejects_truncated_json_before_parsing() -> None:
    with pytest.raises(AIResponseTruncatedError):
        parse_completion_json(_response('{"tree": "', "length"), "mindmap")


def test_completion_parser_hides_raw_malformed_json() -> None:
    with pytest.raises(AIResponseError, match="malformed JSON"):
        parse_completion_json(_response('{"tree": "'), "mindmap")
