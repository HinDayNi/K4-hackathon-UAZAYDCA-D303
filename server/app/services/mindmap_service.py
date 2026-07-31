import hashlib
import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Callable

from openai import OpenAI
from pydantic import ValidationError

from app.core.ai_profiles import completion_usage, get_ai_profile, parse_completion_json
from app.core.config import get_settings
from app.prompts.learning_map import LEARNING_MAP_SYSTEM, build_learning_map_prompt
from app.repositories import deck_repository
from app.repositories import mindmap_repository as repo
from app.schemas.mindmap import MindmapNode
from app.services.importance_service import ImportanceScoringError, ImportanceService


class MindmapGenerationError(RuntimeError):
    pass


class MindmapValidationError(ValueError):
    pass


class MindmapContextTooLargeError(MindmapValidationError):
    pass


StructuredCall = Callable[[str], dict[str, Any]]
logger = logging.getLogger(__name__)


@dataclass
class MindmapPreparation:
    artifact: dict[str, Any]
    context: list[dict[str, Any]]
    warnings: list[str]
    created: bool


class MindmapService:
    def __init__(self, structured_call: StructuredCall | None = None) -> None:
        self.settings = get_settings()
        self.structured_call = structured_call

    def generate(self, deck_id: str, *, force: bool = False) -> dict[str, Any]:
        preparation = self.prepare_generation(deck_id, force=force)
        if not preparation.created:
            return preparation.artifact
        return self.run_generation(preparation)

    def prepare_generation(
        self, deck_id: str, *, force: bool = False
    ) -> MindmapPreparation:
        deck = deck_repository.get_deck(deck_id)
        if not deck:
            raise LookupError("Deck not found")
        if deck["processing_status"] not in {
            "ready",
            "ready_with_warnings",
            "generating_mindmap",
        }:
            raise MindmapValidationError("Deck is not ready for mindmap")
        context, warnings = self._context(deck_id)
        if not context:
            raise MindmapValidationError("Deck does not contain enough summarized content")
        content_hash = self._content_hash(deck, context)
        if not force:
            cached = repo.find_ready(
                deck_id, content_hash, self.settings.mindmap_generation_version
            )
            if cached:
                return MindmapPreparation(cached, context, warnings, False)
        active = repo.find_generating(
            deck_id, content_hash, self.settings.mindmap_generation_version
        )
        if active:
            return MindmapPreparation(active, context, warnings, False)
        artifact, created = repo.start(
            deck_id,
            content_hash,
            self.settings.mindmap_generation_version,
            self.settings.mindmap_prompt_version,
            self.settings.deepseek_model,
        )
        return MindmapPreparation(artifact, context, warnings, created)

    def run_generation(self, preparation: MindmapPreparation) -> dict[str, Any]:
        artifact_id = preparation.artifact["id"]
        try:
            raw = self._call_model(preparation.context)
            payload, validation_warnings = self._validate(
                preparation.artifact["deck_id"], raw, preparation.context
            )
            preparation.warnings.extend(validation_warnings)
            repo.mark_ready(
                artifact_id,
                payload,
                list(dict.fromkeys(preparation.warnings)),
            )
            artifact = repo.get(artifact_id)
            assert artifact is not None
            return artifact
        except Exception as exc:
            repo.mark_failed(artifact_id, f"{type(exc).__name__}: {exc}")
            if isinstance(exc, (MindmapGenerationError, MindmapValidationError)):
                raise
            raise MindmapGenerationError(str(exc)) from exc

    def run_generation_safely(self, preparation: MindmapPreparation) -> None:
        try:
            self.run_generation(preparation)
        except (MindmapGenerationError, MindmapValidationError):
            return

    def get_latest(self, deck_id: str) -> dict[str, Any] | None:
        return repo.latest(deck_id)

    def _context(self, deck_id: str) -> tuple[list[dict[str, Any]], list[str]]:
        candidates: list[dict[str, Any]] = []
        warnings: list[str] = []
        for slide in deck_repository.mindmap_input(deck_id):
            usable_blocks = [
                block
                for block in slide["blocks"]
                if block["summary"] or block["normalized_text"].strip()
            ]
            available_ids = {block["id"] for block in usable_blocks}
            source_block_ids = [
                block_id
                for block_id in slide["summary_block_ids"]
                if block_id in available_ids
            ][:2]
            if not source_block_ids:
                source_block_ids = [block["id"] for block in usable_blocks[:2]]
            summary = str(slide["summary"] or "").strip()
            if not summary:
                summary = " ".join(
                    str(block["summary"] or block["normalized_text"]).strip()
                    for block in usable_blocks[:2]
                )
                if summary:
                    warnings.append(f"missing_slide_summary:{slide['slide_index']}")
            title = str(slide["title"] or "").strip()
            if (not title and not summary) or not source_block_ids:
                warnings.append(f"excluded_empty_slide:{slide['slide_index']}")
                continue
            candidates.append(
                {
                    "slide_id": slide["id"],
                    "slide_index": slide["slide_index"],
                    "raw_title": title,
                    "raw_summary": summary,
                    "block_ids": source_block_ids,
                }
            )
        if not candidates:
            return [], warnings

        def compact(summary_limit: int) -> list[dict[str, Any]]:
            width = max(3, len(str(len(candidates))))
            return [
                {
                    "ref": f"S{position:0{width}d}",
                    "index": item["slide_index"],
                    "title": _truncate(
                        item["raw_title"], self.settings.mindmap_slide_title_max_chars
                    ),
                    "summary": _truncate(item["raw_summary"], summary_limit),
                    "_slide_id": item["slide_id"],
                    "_block_ids": item["block_ids"],
                }
                for position, item in enumerate(candidates, start=1)
            ]

        context = compact(self.settings.mindmap_slide_summary_max_chars)
        serialized_length = len(self._model_context_json(context))
        budget = self.settings.mindmap_input_char_budget
        if serialized_length > budget:
            ratio = budget / serialized_length
            reduced_limit = max(
                self.settings.mindmap_slide_summary_min_chars,
                int(self.settings.mindmap_slide_summary_max_chars * ratio * 0.95),
            )
            context = compact(reduced_limit)
            serialized_length = len(self._model_context_json(context))
        if serialized_length > budget:
            raise MindmapContextTooLargeError(
                f"mindmap_context_too_large:{serialized_length}>{budget}"
            )
        return context, warnings

    @staticmethod
    def _model_context(context: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "ref": slide["ref"],
                "index": slide["index"],
                "title": slide["title"],
                "summary": slide["summary"],
            }
            for slide in context
        ]

    def _model_context_json(self, context: list[dict[str, Any]]) -> str:
        return json.dumps(
            self._model_context(context),
            ensure_ascii=False,
            separators=(",", ":"),
        )

    @staticmethod
    def _content_hash(deck: dict[str, Any], context: list[dict[str, Any]]) -> str:
        source = {
            "file_hash": deck["file_hash"],
            "summary_version": deck["summary_version"],
            "slides": context,
        }
        encoded = json.dumps(
            source, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def _call_model(self, context: list[dict[str, Any]]) -> dict[str, Any]:
        prompt = build_learning_map_prompt(self._model_context_json(context))
        if self.structured_call:
            return self.structured_call(prompt)
        if not self.settings.deepseek_api_key:
            logger.info("DeepSeek API key missing, using structural fallback tree.")
            return self._build_structural_fallback_tree(context)
        try:
            profile = get_ai_profile("mindmap", self.settings)
            client = OpenAI(
                api_key=self.settings.deepseek_api_key,
                base_url=self.settings.deepseek_base_url,
                timeout=profile.timeout_seconds,
            )
            started = perf_counter()
            response = client.chat.completions.create(
                model=self.settings.deepseek_model,
                messages=[
                    {"role": "system", "content": LEARNING_MAP_SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                extra_body=profile.extra_body,
                max_tokens=profile.max_tokens,
            )
            prompt_tokens, completion_tokens, total_tokens = completion_usage(response)
            logger.info(
                "deepseek_call purpose=mindmap latency_ms=%s finish_reason=%s "
                "prompt_tokens=%s completion_tokens=%s total_tokens=%s",
                round((perf_counter() - started) * 1000),
                response.choices[0].finish_reason if response.choices else None,
                prompt_tokens,
                completion_tokens,
                total_tokens,
            )
            return parse_completion_json(response, "mindmap")
        except Exception as exc:
            logger.warning("DeepSeek mindmap call failed (%s), using structural fallback tree.", exc)
            return self._build_structural_fallback_tree(context)

    def _build_structural_fallback_tree(self, context: list[dict[str, Any]]) -> dict[str, Any]:
        import math
        total = len(context)
        if total == 0:
            raise MindmapValidationError("Empty context for mindmap generation")

        num_sections = 4
        sec_size = math.ceil(total / num_sections)
        sections = []
        seen_titles: set[str] = set()

        for sec_idx in range(num_sections):
            sec_start = sec_idx * sec_size
            sec_end = min(total, (sec_idx + 1) * sec_size)
            if sec_start >= total:
                sec_start = max(0, total - 1)
                sec_end = total
            chunk = context[sec_start:sec_end]
            start_ref = chunk[0]["ref"]
            end_ref = chunk[-1]["ref"]

            step = max(1, math.ceil(len(chunk) / 3))
            topic_items = chunk[::step][:3]
            while len(topic_items) < 3 and len(chunk) > 0:
                topic_items.append(chunk[len(topic_items) % len(chunk)])

            topics = []
            for t_idx, item in enumerate(topic_items):
                t_title = item["title"] or f"Nội dung slide {item['index']}"
                norm_t = _normalize_title(t_title)
                if norm_t in seen_titles or not norm_t:
                    t_title = f"{t_title} (P{sec_idx + 1}-{t_idx + 1})"
                    norm_t = _normalize_title(t_title)
                seen_titles.add(norm_t)

                topics.append({
                    "id": f"topic_{sec_idx}_{item['index']}_{t_idx}",
                    "type": "topic",
                    "depth": 2,
                    "order": t_idx,
                    "title": t_title,
                    "summary": item["summary"] or f"Nội dung trọng tâm tại trang slide {item['index']}",
                    "range": {"start_ref": item["ref"], "end_ref": item["ref"]},
                    "source_refs": [item["ref"]],
                    "importance_signals": {
                        "foundational": 75,
                        "emphasis": 75,
                        "applicability": 75,
                        "evidence_refs": [item["ref"]],
                        "prerequisite_for": []
                    }
                })

            sec_num = sec_idx + 1
            sec_title = chunk[0]["title"] or f"Phần {sec_num}: Tổng quan nội dung"
            norm_sec = _normalize_title(sec_title)
            if norm_sec in seen_titles or not norm_sec:
                sec_title = f"Phần {sec_num}: {sec_title}"
                norm_sec = _normalize_title(sec_title)
            seen_titles.add(norm_sec)

            sections.append({
                "id": f"section_{sec_num}",
                "type": "section",
                "depth": 1,
                "order": sec_idx,
                "title": sec_title,
                "summary": f"Tổng hợp kiến thức từ slide {chunk[0]['index']} đến slide {chunk[-1]['index']}",
                "range": {"start_ref": start_ref, "end_ref": end_ref},
                "source_refs": [start_ref, end_ref] if start_ref != end_ref else [start_ref],
                "children": topics,
                "importance_signals": {
                    "foundational": 85,
                    "emphasis": 85,
                    "applicability": 85,
                    "evidence_refs": [start_ref],
                    "prerequisite_for": []
                }
            })

        first_ref = context[0]["ref"]
        last_ref = context[-1]["ref"]
        root_title = context[0]["title"] if context[0]["title"] else "Sơ đồ Tư duy AI Bài giảng"
        norm_root = _normalize_title(root_title)
        if norm_root in seen_titles or not norm_root:
            root_title = f"Tổng quan: {root_title}"

        return {
            "tree": {
                "id": "root_1",
                "type": "root",
                "depth": 0,
                "order": 0,
                "title": root_title,
                "summary": f"Tổng hợp sơ đồ tư duy toàn bộ bài giảng ({total} trang slide)",
                "range": {"start_ref": first_ref, "end_ref": last_ref},
                "source_refs": [first_ref, last_ref] if first_ref != last_ref else [first_ref],
                "children": sections,
                "importance_signals": {
                    "foundational": 95,
                    "emphasis": 95,
                    "applicability": 95,
                    "evidence_refs": [first_ref],
                    "prerequisite_for": []
                }
            }
        }

    def _validate(
        self, deck_id: str, raw: dict[str, Any], context: list[dict[str, Any]]
    ) -> tuple[dict[str, Any], list[str]]:
        if "tree" not in raw:
            raise MindmapValidationError("Response is missing tree")
        source_index = {
            slide["ref"]: {
                "position": position,
                "slide_id": slide["_slide_id"],
                "slide_index": slide["index"],
                "block_ids": slide["_block_ids"],
            }
            for position, slide in enumerate(context)
        }
        tree_data = raw["tree"]
        try:
            scoring_warnings = ImportanceService(self.settings).score_tree(
                tree_data, source_index
            )
        except ImportanceScoringError as exc:
            raise MindmapValidationError(str(exc)) from exc
        importance_breakdowns = {
            node["id"]: node.pop("_importance_breakdown")
            for node in self._raw_nodes(tree_data)
        }
        self._canonicalize_sources(tree_data, deck_id, source_index)
        self._normalize_section_ranges(tree_data, source_index)
        self._normalize_node_text(tree_data)
        try:
            tree = MindmapNode.model_validate(tree_data)
        except ValidationError as exc:
            raise MindmapValidationError(str(exc)) from exc
        warnings = scoring_warnings + self._validate_tree(tree, context)
        stats = self._stats(tree)
        return {
            "tree": tree.model_dump(),
            "stats": stats,
            "importance_breakdowns": importance_breakdowns,
        }, warnings

    @staticmethod
    def _raw_nodes(tree: dict[str, Any]) -> list[dict[str, Any]]:
        nodes = [tree]
        for section in tree.get("children", []):
            nodes.append(section)
            nodes.extend(section.get("children", []))
        return nodes

    @classmethod
    def _normalize_node_text(cls, node: dict[str, Any]) -> None:
        node_type = node.get("type")
        summary_limits = {"root": 300, "section": 220, "topic": 180}
        node["title"] = _truncate(str(node.get("title", "")), 180)
        if node_type in summary_limits:
            node["summary"] = _truncate(
                str(node.get("summary", "")), summary_limits[node_type]
            )
        importance = node.get("importance")
        if isinstance(importance, dict):
            importance["reason"] = _truncate(
                str(importance.get("reason", "")), 300
            )
        for child in node.get("children", []):
            cls._normalize_node_text(child)

    def _canonicalize_sources(
        self,
        node: dict[str, Any],
        deck_id: str,
        source_index: dict[str, dict[str, Any]],
    ) -> None:
        if not isinstance(node, dict):
            raise MindmapValidationError("Every node must be an object")
        refs = node.get("source_refs", [])
        if not isinstance(refs, list):
            raise MindmapValidationError("source_refs must be an array")
        refs = list(dict.fromkeys(str(ref) for ref in refs))
        if len(refs) > self.settings.mindmap_max_source_slides_per_node:
            raise MindmapValidationError(f"Node {node.get('id')} has too many sources")
        range_data = node.get("range")
        if not isinstance(range_data, dict):
            raise MindmapValidationError(f"Node {node.get('id')} has no range")
        start_ref = str(range_data.get("start_ref", ""))
        end_ref = str(range_data.get("end_ref", ""))
        start = source_index.get(start_ref)
        end = source_index.get(end_ref)
        if not start or not end:
            raise MindmapValidationError(f"Node {node.get('id')} has an unknown range")
        if start["position"] > end["position"]:
            raise MindmapValidationError(f"Node {node.get('id')} has a reversed range")

        canonical = []
        source_positions = []
        for ref in refs:
            actual = source_index.get(ref)
            if not actual:
                raise MindmapValidationError(f"Unknown source ref: {ref}")
            source_positions.append(actual["position"])
            canonical.append(
                {
                    "deck_id": deck_id,
                    "slide_id": actual["slide_id"],
                    "slide_index": actual["slide_index"],
                    "block_ids": actual["block_ids"],
                }
            )
        if source_positions:
            start = min(
                [start, *(source_index[ref] for ref in refs)],
                key=lambda item: item["position"],
            )
            end = max(
                [end, *(source_index[ref] for ref in refs)],
                key=lambda item: item["position"],
            )
        node["sources"] = canonical
        node.pop("source_refs", None)
        node.pop("range", None)
        for child in node.get("children", []):
            self._canonicalize_sources(child, deck_id, source_index)
            child_coverage = child["coverage"]
            if child_coverage["start_slide_index"] < start["slide_index"]:
                start = min(
                    source_index.values(),
                    key=lambda item: abs(
                        item["slide_index"] - child_coverage["start_slide_index"]
                    ),
                )
            if child_coverage["end_slide_index"] > end["slide_index"]:
                end = min(
                    source_index.values(),
                    key=lambda item: abs(
                        item["slide_index"] - child_coverage["end_slide_index"]
                    ),
                )
        node["coverage"] = {
            "start_slide_index": start["slide_index"],
            "end_slide_index": end["slide_index"],
        }

    @staticmethod
    def _normalize_section_ranges(
        tree: dict[str, Any], source_index: dict[str, dict[str, Any]]
    ) -> None:
        ordered = sorted(source_index.values(), key=lambda item: item["position"])
        if not ordered:
            return
        tree["coverage"] = {
            "start_slide_index": ordered[0]["slide_index"],
            "end_slide_index": ordered[-1]["slide_index"],
        }
        sections = tree.get("children", [])
        by_index = {item["slide_index"]: item["position"] for item in ordered}
        sections.sort(
            key=lambda section: (
                by_index.get(section["coverage"]["start_slide_index"], len(ordered)),
                by_index.get(section["coverage"]["end_slide_index"], len(ordered)),
            )
        )
        for section_order, section in enumerate(sections):
            section["order"] = section_order
            topics = section.get("children", [])
            topics.sort(
                key=lambda topic: (
                    by_index.get(
                        topic["coverage"]["start_slide_index"], len(ordered)
                    ),
                    by_index.get(topic["coverage"]["end_slide_index"], len(ordered)),
                )
            )
            for topic_order, topic in enumerate(topics):
                topic["order"] = topic_order
        previous_end = -1
        for section in sections:
            coverage = section["coverage"]
            start = by_index.get(coverage["start_slide_index"])
            end = by_index.get(coverage["end_slide_index"])
            if start is None or end is None:
                raise MindmapValidationError(
                    f"Section has an unknown range: {section.get('id')}"
                )
            if start > previous_end + 1:
                coverage["start_slide_index"] = ordered[previous_end + 1][
                    "slide_index"
                ]
            previous_end = max(previous_end, end)
        if sections:
            sections[-1]["coverage"]["end_slide_index"] = ordered[-1]["slide_index"]

    def _validate_tree(
        self, root: MindmapNode, context: list[dict[str, Any]]
    ) -> list[str]:
        settings = self.settings
        if root.type != "root" or root.depth != 0:
            raise MindmapValidationError("Tree must start with a root at depth 0")
        seen_ids: set[str] = set()
        seen_titles: set[str] = set()
        warnings: list[str] = []

        def visit(node: MindmapNode, expected_depth: int) -> None:
            if node.id in seen_ids:
                raise MindmapValidationError(f"Duplicate node id: {node.id}")
            seen_ids.add(node.id)
            if node.depth != expected_depth or node.depth > settings.mindmap_max_depth:
                raise MindmapValidationError(f"Invalid depth for node {node.id}")
            expected_type = ("root", "section", "topic")[min(expected_depth, 2)]
            if node.type != expected_type:
                raise MindmapValidationError(f"Invalid type for node {node.id}")
            if node.coverage is None:
                raise MindmapValidationError(f"Node {node.id} has no coverage")
            normalized = _normalize_title(node.title)
            if normalized in seen_titles:
                raise MindmapValidationError(f"Duplicate node title: {node.title}")
            seen_titles.add(normalized)
            if node.type != "root" and not node.sources:
                raise MindmapValidationError(f"Node {node.id} has no sources")
            if node.type == "topic" and node.children:
                raise MindmapValidationError(f"Topic {node.id} cannot have children")
            if len(node.sources) > settings.mindmap_max_source_slides_per_node:
                raise MindmapValidationError(f"Node {node.id} has too many sources")
            for child in node.children:
                if (
                    child.coverage is not None
                    and (
                        child.coverage.start_slide_index
                        < node.coverage.start_slide_index
                        or child.coverage.end_slide_index
                        > node.coverage.end_slide_index
                    )
                ):
                    raise MindmapValidationError(
                        f"Node {child.id} range is outside parent {node.id}"
                    )
                visit(child, expected_depth + 1)

        visit(root, 0)
        section_count = len(root.children)
        if section_count > settings.mindmap_max_sections:
            raise MindmapValidationError("Mindmap has too many sections")
        if section_count < settings.mindmap_min_sections:
            warnings.append("below_target_section_count")
        for section in root.children:
            topic_count = len(section.children)
            if topic_count > settings.mindmap_max_topics_per_section:
                raise MindmapValidationError(f"Section {section.id} has too many topics")
            if topic_count < settings.mindmap_min_topics_per_section:
                warnings.append(f"below_target_topic_count:{section.id}")
        self._validate_section_coverage(root, context)
        node_count = len(seen_ids)
        if node_count > settings.mindmap_target_max_nodes:
            raise MindmapValidationError("Mindmap has too many nodes")
        if node_count < settings.mindmap_target_min_nodes:
            warnings.append("below_target_node_count")
        return warnings

    @staticmethod
    def _validate_section_coverage(
        root: MindmapNode, context: list[dict[str, Any]]
    ) -> None:
        if not root.coverage or not root.children:
            raise MindmapValidationError("Root coverage or sections are missing")
        positions = {slide["index"]: position for position, slide in enumerate(context)}
        first_index = context[0]["index"]
        last_index = context[-1]["index"]
        if (
            root.coverage.start_slide_index != first_index
            or root.coverage.end_slide_index != last_index
        ):
            raise MindmapValidationError("Root range must cover the full deck context")
        ranges = []
        for section in root.children:
            assert section.coverage is not None
            start = positions.get(section.coverage.start_slide_index)
            end = positions.get(section.coverage.end_slide_index)
            if start is None or end is None or start > end:
                raise MindmapValidationError(f"Invalid section range: {section.id}")
            ranges.append((start, end, section.id))
        if ranges[0][0] != 0 or ranges[-1][1] != len(context) - 1:
            raise MindmapValidationError("Section ranges must cover the full deck context")
        previous_end = -1
        for start, end, section_id in ranges:
            if start > previous_end + 1:
                raise MindmapValidationError(
                    f"Gap before section range: {section_id}"
                )
            if end < previous_end:
                raise MindmapValidationError("Section ranges are out of order")
            previous_end = max(previous_end, end)

    @staticmethod
    def _stats(tree: MindmapNode) -> dict[str, int]:
        nodes = [tree]
        for section in tree.children:
            nodes.append(section)
            nodes.extend(section.children)
        return {
            "depth": max(node.depth for node in nodes),
            "node_count": len(nodes),
            "section_count": len(tree.children),
        }


def _normalize_title(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).lower()
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"\W+", " ", normalized).strip()


def _truncate(value: str, limit: int) -> str:
    clean = " ".join(value.split())
    if len(clean) <= limit:
        return clean
    return clean[: max(1, limit - 1)].rstrip() + "…"
