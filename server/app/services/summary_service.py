import logging
from time import perf_counter
from typing import Any

from openai import OpenAI

from app.core.ai_profiles import (
    AITaskPurpose,
    completion_usage,
    get_ai_profile,
    parse_completion_json,
)
from app.core.config import get_settings


MIN_BLOCK_WORDS = 8
logger = logging.getLogger(__name__)


def _fallback_summary(text: str, limit: int = 220) -> str:
    clean = " ".join(text.split())
    return clean if len(clean) <= limit else clean[: limit - 1].rstrip() + "…"


def _structured(prompt: str, name: str, schema: dict[str, Any]) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.deepseek_api_key:
        return None
    purpose_by_name: dict[str, AITaskPurpose] = {
        "block_summary": "block_summary",
        "slide_summary": "slide_summary",
    }
    if name not in purpose_by_name:
        raise ValueError(f"Unknown summary purpose: {name}")
    purpose = purpose_by_name[name]
    profile = get_ai_profile(purpose, settings)
    client = OpenAI(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        timeout=profile.timeout_seconds,
    )
    required = ", ".join(schema["required"])
    properties = ", ".join(schema["properties"])
    started = perf_counter()
    response = client.chat.completions.create(
        model=settings.deepseek_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Bạn chỉ trả về một JSON object hợp lệ, không markdown. "
                    f"JSON phải có các trường bắt buộc: {required}. "
                    f"Chỉ được dùng các trường: {properties}."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        extra_body=profile.extra_body,
        max_tokens=profile.max_tokens,
    )
    result = parse_completion_json(response, purpose)
    prompt_tokens, completion_tokens, total_tokens = completion_usage(response)
    logger.info(
        "deepseek_call purpose=%s latency_ms=%s finish_reason=%s "
        "prompt_tokens=%s completion_tokens=%s total_tokens=%s",
        purpose,
        round((perf_counter() - started) * 1000),
        response.choices[0].finish_reason,
        prompt_tokens,
        completion_tokens,
        total_tokens,
    )
    if not isinstance(result, dict) or any(key not in result for key in schema["required"]):
        raise ValueError(f"DeepSeek returned invalid JSON shape for {name}")
    return result


def summarize_block(block: dict[str, Any]) -> str | None:
    if len(block["normalized_text"].split()) < MIN_BLOCK_WORDS:
        return None
    result = _structured(
        "Tóm tắt 1-2 câu, chỉ dùng nội dung nguồn và không thêm kiến thức ngoài nguồn.\n"
        f"block_id={block['id']}\nNguồn:\n{block['normalized_text']}",
        "block_summary",
        {
            "type": "object",
            "properties": {"summary": {"type": "string"}},
            "required": ["summary"],
            "additionalProperties": False,
        },
    )
    return result["summary"] if result else _fallback_summary(block["normalized_text"])


def summarize_slide(slide: dict[str, Any]) -> dict[str, Any]:
    eligible = [block for block in slide["blocks"] if block["included_in_ai_context"]]
    word_count = len(slide["full_text"].split())
    if word_count < MIN_BLOCK_WORDS:
        return {"summary": None, "block_ids": [], "status": "low_content"}
    sources = "\n".join(
        f"[{block['id']}] {block.get('summary') or block['normalized_text']}" for block in eligible
    )
    result = _structured(
        "Tổng hợp slide chỉ từ các nguồn dưới đây. Trả ý chính ngắn gọn và đúng block_ids "
        "đã hỗ trợ kết luận. Không thêm kiến thức ngoài nguồn.\n" + sources,
        "slide_summary",
        {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "block_ids": {"type": "array", "items": {"type": "string"}},
                "status": {"type": "string", "enum": ["ok", "low_content", "needs_review"]},
            },
            "required": ["summary", "block_ids", "status"],
            "additionalProperties": False,
        },
    )
    if not result:
        return {
            "summary": _fallback_summary(slide["full_text"], 360),
            "block_ids": [block["id"] for block in eligible],
            "status": "ok",
        }
    valid_ids = {block["id"] for block in eligible}
    if any(block_id not in valid_ids for block_id in result["block_ids"]):
        raise ValueError("AI returned an unknown block_id")
    return result
