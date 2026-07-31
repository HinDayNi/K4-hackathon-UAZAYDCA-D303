from collections.abc import Callable
from typing import Any

from app.core.config import get_settings
from app.repositories import deck_repository as repo
from app.schemas.chat import ChatHistoryItem, ChatSelection


StructuredCall = Callable[[str, str], dict[str, Any]]


class RetrievalService:
    def __init__(self, structured_call: StructuredCall | None = None):
        self.structured_call = structured_call

    def retrieve(
        self,
        *,
        deck_id: str,
        question: str,
        selection: ChatSelection | None,
        current_slide_id: str | None,
        history: list[ChatHistoryItem],
    ) -> list[dict[str, Any]]:
        settings = get_settings()
        queries = self._expand_queries(question, history)
        ranked_lists = [
            repo.search_blocks(deck_id, query, settings.retrieval_candidate_limit)
            for query in queries
        ]
        fused = self._reciprocal_rank_fusion(ranked_lists)

        selected_ids = selection.block_ids if selection else []
        selected = repo.get_blocks_by_ids(deck_id, selected_ids)
        for block in selected:
            fused[block["id"]] = {
                "block": block,
                "fusion_score": fused.get(block["id"], {}).get("fusion_score", 0.0) + 1.0,
                "selected": True,
            }

        for item in fused.values():
            block = item["block"]
            item.setdefault("selected", False)
            if current_slide_id and block["slide_id"] == current_slide_id:
                item["fusion_score"] += 0.25

        candidates = sorted(
            fused.values(), key=lambda item: item["fusion_score"], reverse=True
        )[: settings.retrieval_candidate_limit]
        reranked = self._rerank(question, candidates)
        return [
            item
            for item in reranked
            if item["supports_answer"]
            and item["relevance"] >= settings.retrieval_min_relevance
        ][: settings.retrieval_context_limit]

    def _expand_queries(
        self, question: str, history: list[ChatHistoryItem]
    ) -> list[str]:
        if not self.structured_call:
            return [question]
        history_text = "\n".join(
            f"Q: {item.question}\nA: {item.answer}" for item in history[-3:]
        )
        payload = self.structured_call(
            "query_expansion",
            f"Lịch sử:\n{history_text or '(không có)'}\n\nCâu hỏi hiện tại:\n{question}",
        )
        standalone = str(payload.get("standalone_query", question)).strip() or question
        variants = payload.get("variants", [])
        if not isinstance(variants, list):
            variants = []
        cleaned = [str(value).strip() for value in variants[:5] if str(value).strip()]
        return list(dict.fromkeys([question, standalone, *cleaned]))

    @staticmethod
    def _reciprocal_rank_fusion(
        ranked_lists: list[list[dict[str, Any]]], constant: int = 60
    ) -> dict[str, dict[str, Any]]:
        fused: dict[str, dict[str, Any]] = {}
        for ranked in ranked_lists:
            for position, block in enumerate(ranked, start=1):
                item = fused.setdefault(
                    block["id"], {"block": block, "fusion_score": 0.0, "selected": False}
                )
                item["fusion_score"] += 1 / (constant + position)
        return fused

    def _rerank(
        self, question: str, candidates: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        if not candidates:
            return []
        if not self.structured_call:
            for position, item in enumerate(candidates):
                item["relevance"] = 1.0 if item["selected"] else max(0.4, 0.9 - 0.04 * position)
                item["supports_answer"] = True
            return candidates

        sources = "\n".join(
            f"[{item['block']['id']}] slide={item['block']['slide_index']}\n"
            f"{item['block']['normalized_text']}"
            for item in candidates
        )
        payload = self.structured_call(
            "rerank", f"Câu hỏi:\n{question}\n\nCác block ứng viên:\n{sources}"
        )
        raw_results = payload.get("results", [])
        if not isinstance(raw_results, list):
            return []
        results = {
            str(item.get("block_id")): item
            for item in raw_results
            if isinstance(item, dict) and item.get("block_id")
        }
        output = []
        for candidate in candidates:
            block_id = candidate["block"]["id"]
            result = results.get(block_id)
            if not result:
                continue
            try:
                relevance = float(result.get("relevance", 0))
            except (TypeError, ValueError):
                continue
            candidate["relevance"] = max(0.0, min(1.0, relevance))
            candidate["supports_answer"] = bool(result.get("supports_answer", False))
            output.append(candidate)
        return sorted(output, key=lambda item: item["relevance"], reverse=True)
