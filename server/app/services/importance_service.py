from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

from pydantic import ValidationError

from app.schemas.mindmap import MindmapImportanceSignals


class ImportanceScoringError(ValueError):
    pass


class ImportanceService:
    def __init__(self, settings: Any) -> None:
        self.settings = settings
        weights = self._weights()
        if not math.isclose(sum(weights.values()), 1.0, abs_tol=1e-9):
            raise ImportanceScoringError("Mindmap importance weights must sum to 1")

    def score_tree(
        self, tree: dict[str, Any], source_index: dict[str, dict[str, Any]]
    ) -> list[str]:
        warnings: list[str] = []
        nodes = self._nodes(tree)
        topic_ids = {node["id"] for node in nodes if node.get("type") == "topic"}
        signals: dict[str, MindmapImportanceSignals] = {}
        for node in nodes:
            node_id = str(node.get("id", ""))
            if not node_id:
                raise ImportanceScoringError("Every node needs an id before scoring")
            try:
                signal = MindmapImportanceSignals.model_validate(
                    node.get("importance_signals")
                )
            except ValidationError as exc:
                raise ImportanceScoringError(
                    f"Invalid importance signals for node {node_id}: {exc}"
                ) from exc
            valid_refs = list(
                dict.fromkeys(ref for ref in signal.evidence_refs if ref in source_index)
            )
            if len(valid_refs) != len(set(signal.evidence_refs)):
                warnings.append(f"invalid_importance_evidence:{node_id}")
            signal.evidence_refs = valid_refs
            signals[node_id] = signal

        adjacency: dict[str, set[str]] = defaultdict(set)
        for node_id in sorted(topic_ids):
            for target in signals[node_id].prerequisite_for:
                if target not in topic_ids or target == node_id:
                    warnings.append(f"invalid_importance_dependency:{node_id}:{target}")
                    continue
                if self._has_path(adjacency, target, node_id):
                    warnings.append(f"cyclic_importance_dependency:{node_id}:{target}")
                    continue
                adjacency[node_id].add(target)

        for node in nodes:
            node_id = node["id"]
            signal = signals[node_id]
            source_refs = [
                ref for ref in dict.fromkeys(node.get("source_refs", []))
                if ref in source_index
            ]
            evidence_refs = signal.evidence_refs
            coverage = self._coverage(source_refs, node.get("range"), source_index)
            downstream = (
                self._downstream(node_id, adjacency)
                if node.get("type") == "topic"
                else 0
            )
            emphasis = round(
                0.60 * signal.emphasis
                + 0.25 * self._title_signal(node)
                + 0.15 * min(100, len(evidence_refs) * 50)
            )
            components = {
                "foundational": signal.foundational,
                "emphasis": emphasis,
                "downstream": downstream,
                "applicability": signal.applicability,
                "coverage": coverage,
            }
            score = round(
                sum(components[name] * weight for name, weight in self._weights().items())
            )
            confidence = self._confidence(node, evidence_refs)
            node["importance"] = self._importance(
                score, confidence, components, bool(evidence_refs)
            )
            node["_importance_breakdown"] = {
                **components,
                "evidence_refs": evidence_refs,
                "prerequisite_for": sorted(adjacency.get(node_id, set())),
            }
            node.pop("importance_signals", None)

        self._aggregate_parents(tree)
        self._apply_topic_quota(tree)
        return warnings

    def _weights(self) -> dict[str, float]:
        return {
            "foundational": self.settings.mindmap_importance_foundational_weight,
            "emphasis": self.settings.mindmap_importance_emphasis_weight,
            "downstream": self.settings.mindmap_importance_downstream_weight,
            "applicability": self.settings.mindmap_importance_applicability_weight,
            "coverage": self.settings.mindmap_importance_coverage_weight,
        }

    @staticmethod
    def _nodes(root: dict[str, Any]) -> list[dict[str, Any]]:
        output: list[dict[str, Any]] = []

        def visit(node: dict[str, Any]) -> None:
            output.append(node)
            for child in node.get("children", []):
                visit(child)

        visit(root)
        return output

    @staticmethod
    def _has_path(graph: dict[str, set[str]], start: str, target: str) -> bool:
        pending = [start]
        seen: set[str] = set()
        while pending:
            current = pending.pop()
            if current == target:
                return True
            if current in seen:
                continue
            seen.add(current)
            pending.extend(graph.get(current, ()))
        return False

    def _downstream(self, node_id: str, graph: dict[str, set[str]]) -> int:
        direct = graph.get(node_id, set())
        pending = list(direct)
        reachable: set[str] = set()
        while pending:
            current = pending.pop()
            if current in reachable:
                continue
            reachable.add(current)
            pending.extend(graph.get(current, ()))
        indirect = reachable - direct
        return min(100, len(direct) * 20 + len(indirect) * 5)

    @staticmethod
    def _coverage(
        refs: list[str],
        range_data: Any,
        source_index: dict[str, dict[str, Any]],
    ) -> int:
        if not refs:
            return 0
        source_score = min(100, len(refs) * 50)
        positions = [source_index[ref]["position"] for ref in refs]
        span = max(positions) - min(positions) + 1
        span_score = min(100, round(100 * span / max(1, len(source_index))))
        range_score = 0
        if isinstance(range_data, dict):
            start = source_index.get(str(range_data.get("start_ref", "")))
            end = source_index.get(str(range_data.get("end_ref", "")))
            if start and end:
                width = end["position"] - start["position"] + 1
                range_score = min(
                    100, round(100 * width / max(1, len(source_index)))
                )
        return round(0.50 * source_score + 0.30 * range_score + 0.20 * span_score)

    @staticmethod
    def _title_signal(node: dict[str, Any]) -> int:
        title = str(node.get("title", "")).lower()
        summary = str(node.get("summary", "")).lower()
        markers = ("quan trọng", "cốt lõi", "cần nhớ", "nguyên lý", "định nghĩa")
        return 100 if any(marker in f"{title} {summary}" for marker in markers) else 40

    @staticmethod
    def _confidence(
        node: dict[str, Any],
        evidence_refs: list[str],
    ) -> int:
        source_quality = 100 if node.get("summary") and node.get("title") else 60
        independent = min(100, len(evidence_refs) * 50)
        agreement = 100 if len(evidence_refs) >= 2 else (70 if evidence_refs else 0)
        completeness = 100 if evidence_refs else 30
        confidence = round(
            0.35 * source_quality
            + 0.25 * independent
            + 0.20 * agreement
            + 0.20 * completeness
        )
        return min(confidence, 40) if not evidence_refs else confidence

    def _importance(
        self,
        score: int,
        confidence: int,
        components: dict[str, int],
        has_evidence: bool,
    ) -> dict[str, Any]:
        level = self._level(score)
        if level == "important" and max(
            components["foundational"], components["emphasis"]
        ) < 70:
            level = "should_know"
        labels = {
            "important": "Quan trọng",
            "should_know": "Nên biết",
            "additional": "Biết thêm",
        }
        names = {
            "foundational": "tính nền tảng",
            "emphasis": "mức độ nhấn mạnh",
            "downstream": "ảnh hưởng tới chủ đề khác",
            "applicability": "khả năng áp dụng",
            "coverage": "độ bao phủ nguồn",
        }
        component_names = tuple(self._weights())
        top = sorted(
            component_names, key=lambda name: (-components[name], name)
        )[:2]
        evidence_text = "có bằng chứng nguồn" if has_evidence else "bằng chứng còn hạn chế"
        return {
            "level": level,
            "label": labels[level],
            "score": max(0, min(100, score)),
            "reason": f"Điểm nổi bật ở {names[top[0]]} và {names[top[1]]}; {evidence_text}.",
            "confidence": max(0, min(100, confidence)),
        }

    def _level(self, score: int) -> str:
        if score >= self.settings.mindmap_important_threshold:
            return "important"
        if score >= self.settings.mindmap_should_know_threshold:
            return "should_know"
        return "additional"

    def _aggregate_parents(self, root: dict[str, Any]) -> None:
        for section in root.get("children", []):
            children = section.get("children", [])
            if not children:
                continue
            top_scores = sorted(
                (child["importance"]["score"] for child in children), reverse=True
            )[:3]
            semantic = section["importance"]["score"]
            score = round(0.70 * (sum(top_scores) / len(top_scores)) + 0.30 * semantic)
            section["importance"] = self._importance(
                score,
                round(
                    sum(child["importance"]["confidence"] for child in children)
                    / len(children)
                ),
                section["_importance_breakdown"],
                bool(section["_importance_breakdown"]["evidence_refs"]),
            )
        sections = root.get("children", [])
        topics = [topic for section in sections for topic in section.get("children", [])]
        if topics:
            score = round(sum(topic["importance"]["score"] for topic in topics) / len(topics))
            root["importance"] = self._importance(
                score,
                round(
                    sum(topic["importance"]["confidence"] for topic in topics)
                    / len(topics)
                ),
                root["_importance_breakdown"],
                bool(root["_importance_breakdown"]["evidence_refs"]),
            )

    def _apply_topic_quota(self, root: dict[str, Any]) -> None:
        topics = [
            topic
            for section in root.get("children", [])
            for topic in section.get("children", [])
        ]
        important = [
            topic for topic in topics if topic["importance"]["level"] == "important"
        ]
        limit = max(1, math.floor(len(topics) * self.settings.mindmap_important_max_ratio))
        ranked = sorted(
            important,
            key=lambda node: (
                -node["importance"]["score"],
                -node["importance"]["confidence"],
                str(node["id"]),
            ),
        )
        for node in ranked[limit:]:
            node["importance"]["level"] = "should_know"
            node["importance"]["label"] = "Nên biết"
