import logging
from collections import defaultdict
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
from app.prompts.deck_tutor import (
    ANSWER_SYSTEM,
    NO_BASIS_ANSWER,
    QUERY_EXPANSION_SYSTEM,
    RERANK_SYSTEM,
)
from app.repositories import deck_repository as repo
from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.services.retrieval_service import RetrievalService


logger = logging.getLogger(__name__)


class DeckNotReadyError(Exception):
    pass


class InvalidSourceError(Exception):
    pass


class UpstreamAIError(Exception):
    pass


class TutorService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = (
            OpenAI(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
                timeout=settings.deepseek_timeout_seconds,
            )
            if settings.deepseek_api_key
            else None
        )
        self.retrieval = RetrievalService(
            self._structured_call if self.client is not None else None
        )

    def answer(self, deck_id: str, request: ChatRequest) -> ChatResponse:
        started = perf_counter()
        deck = repo.get_deck(deck_id)
        if deck is None:
            raise LookupError("Deck not found")
        if deck["processing_status"] not in {"ready", "ready_with_warnings"}:
            raise DeckNotReadyError("Deck is not ready for chat")
        self._validate_sources(deck_id, request)

        retrieval_started = perf_counter()
        context = self.retrieval.retrieve(
            deck_id=deck_id,
            question=request.question,
            selection=request.selection,
            current_slide_id=request.current_slide_id,
            history=request.history,
        )
        retrieval_ms = round((perf_counter() - retrieval_started) * 1000)
        if not context:
            logger.info(
                "deck_chat_no_basis deck_id=%s candidates=0 retrieval_ms=%s total_ms=%s",
                deck_id,
                retrieval_ms,
                round((perf_counter() - started) * 1000),
            )
            return self._no_basis()

        if self.client is None:
            answer_payload = {
                "answer": context[0]["block"]["normalized_text"],
                "cited_block_ids": [context[0]["block"]["id"]],
            }
        else:
            answer_payload = self._answer_with_deepseek(request.question, context)

        allowed = {item["block"]["id"]: item for item in context}
        cited_ids = answer_payload.get("cited_block_ids", [])
        if not isinstance(cited_ids, list):
            return self._no_basis()
        cited_ids = list(dict.fromkeys(str(block_id) for block_id in cited_ids))
        if not cited_ids or any(block_id not in allowed for block_id in cited_ids):
            return self._no_basis()

        confidence = self._confidence([allowed[block_id] for block_id in cited_ids])
        if confidence < get_settings().grounded_min_confidence:
            return self._no_basis()
        citations = self._citations(deck, [allowed[block_id]["block"] for block_id in cited_ids])
        answer = str(answer_payload.get("answer", "")).strip()
        if not answer or not citations:
            return self._no_basis()
        logger.info(
            "deck_chat_answered deck_id=%s candidates=%s slides=%s confidence=%s "
            "retrieval_ms=%s total_ms=%s",
            deck_id,
            len(context),
            ",".join(str(citation.slide_index) for citation in citations),
            confidence,
            retrieval_ms,
            round((perf_counter() - started) * 1000),
        )
        return ChatResponse(
            status="answered",
            answer=answer,
            grounded=True,
            confidence=confidence,
            citations=citations,
        )

    def _validate_sources(self, deck_id: str, request: ChatRequest) -> None:
        if request.current_slide_id and repo.get_slide(deck_id, request.current_slide_id) is None:
            raise InvalidSourceError("current_slide_id does not belong to deck")
        if not request.selection:
            return
        slide = repo.get_slide(deck_id, request.selection.slide_id)
        if slide is None:
            raise InvalidSourceError("selection.slide_id does not belong to deck")
        blocks = repo.get_blocks_by_ids(deck_id, request.selection.block_ids)
        if len(blocks) != len(set(request.selection.block_ids)):
            raise InvalidSourceError("selection contains an unknown block_id")
        if any(block["slide_id"] != request.selection.slide_id for block in blocks):
            raise InvalidSourceError("selection block does not belong to selection slide")

    def _structured_call(self, purpose: str, user_prompt: str) -> dict[str, Any]:
        assert self.client is not None
        started = perf_counter()
        systems = {
            "query_expansion": QUERY_EXPANSION_SYSTEM,
            "rerank": RERANK_SYSTEM,
        }
        try:
            purpose_name: AITaskPurpose = purpose  # type: ignore[assignment]
            profile = get_ai_profile(purpose_name, get_settings())
            response = self.client.chat.completions.create(
                model=get_settings().deepseek_model,
                messages=[
                    {"role": "system", "content": systems[purpose]},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                extra_body=profile.extra_body,
                max_tokens=profile.max_tokens,
                timeout=profile.timeout_seconds,
            )
            payload = parse_completion_json(response, purpose_name)
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
            return payload
        except Exception as exc:
            logger.exception("DeepSeek structured call failed purpose=%s", purpose)
            raise UpstreamAIError(f"DeepSeek {purpose} failed") from exc

    def _answer_with_deepseek(
        self, question: str, context: list[dict[str, Any]]
    ) -> dict[str, Any]:
        assert self.client is not None
        started = perf_counter()
        sources = "\n".join(
            f"[{item['block']['id']}] deck={item['block']['deck_id']} "
            f"slide={item['block']['slide_index']}\n{item['block']['normalized_text']}"
            for item in context
        )
        try:
            profile = get_ai_profile("tutor_answer", get_settings())
            response = self.client.chat.completions.create(
                model=get_settings().deepseek_model,
                messages=[
                    {"role": "system", "content": ANSWER_SYSTEM},
                    {
                        "role": "user",
                        "content": f"Câu hỏi:\n{question}\n\nNguồn trong deck:\n{sources}",
                    },
                ],
                response_format={"type": "json_object"},
                extra_body=profile.extra_body,
                max_tokens=profile.max_tokens,
                timeout=profile.timeout_seconds,
            )
            payload = parse_completion_json(response, "tutor_answer")
            prompt_tokens, completion_tokens, total_tokens = completion_usage(response)
            logger.info(
                "deepseek_call purpose=tutor_answer latency_ms=%s finish_reason=%s "
                "prompt_tokens=%s completion_tokens=%s total_tokens=%s",
                round((perf_counter() - started) * 1000),
                response.choices[0].finish_reason,
                prompt_tokens,
                completion_tokens,
                total_tokens,
            )
            return payload
        except Exception as exc:
            logger.exception("DeepSeek answer call failed")
            raise UpstreamAIError("DeepSeek answer failed") from exc

    @staticmethod
    def _confidence(cited: list[dict[str, Any]]) -> int:
        relevance = sum(item["relevance"] for item in cited) / len(cited)
        extraction = sum(
            float(item["block"]["extraction_confidence"]) for item in cited
        ) / len(cited)
        score = 50 * relevance + 30 + 20 * extraction
        return max(0, min(100, round(score)))

    @staticmethod
    def _citations(deck: dict[str, Any], blocks: list[dict[str, Any]]) -> list[Citation]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for block in blocks:
            grouped[block["slide_id"]].append(block)
        citations = []
        for slide_blocks in grouped.values():
            first = slide_blocks[0]
            excerpt = " ".join(block["raw_text"].strip() for block in slide_blocks).strip()
            citations.append(
                Citation(
                    deck_id=deck["id"],
                    deck_name=deck["filename"],
                    slide_id=first["slide_id"],
                    slide_index=first["slide_index"],
                    slide_title=first["slide_title"],
                    block_ids=[block["id"] for block in slide_blocks],
                    excerpt=excerpt[:500],
                )
            )
        return sorted(citations, key=lambda item: item.slide_index)

    @staticmethod
    def _no_basis() -> ChatResponse:
        return ChatResponse(
            status="no_basis",
            answer=NO_BASIS_ANSWER,
            grounded=False,
            confidence=0,
            citations=[],
        )
