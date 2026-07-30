from copy import deepcopy
from types import SimpleNamespace

import pytest

from app.services.importance_service import ImportanceScoringError, ImportanceService


def _settings(**overrides: object) -> SimpleNamespace:
    values = {
        "mindmap_importance_foundational_weight": 0.30,
        "mindmap_importance_emphasis_weight": 0.25,
        "mindmap_importance_downstream_weight": 0.20,
        "mindmap_importance_applicability_weight": 0.15,
        "mindmap_importance_coverage_weight": 0.10,
        "mindmap_important_threshold": 80,
        "mindmap_should_know_threshold": 50,
        "mindmap_important_max_ratio": 0.30,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _node(node_id: str, node_type: str, children: list[dict] | None = None) -> dict:
    return {
        "id": node_id,
        "type": node_type,
        "title": f"Định nghĩa {node_id}",
        "summary": "Kiến thức cốt lõi cần nhớ.",
        "source_refs": ["S001"],
        "range": {"start_ref": "S001", "end_ref": "S001"},
        "importance_signals": {
            "foundational": 100,
            "emphasis": 100,
            "applicability": 100,
            "evidence_refs": ["S001"],
            "prerequisite_for": [],
        },
        "children": children or [],
    }


def _tree(topic_count: int = 4) -> dict:
    topics = [_node(f"topic-{index}", "topic") for index in range(topic_count)]
    section = _node("section", "section", topics)
    return _node("root", "root", [section])


def _source_index() -> dict:
    return {
        "S001": {
            "position": 0,
            "slide_id": "slide-1",
            "slide_index": 1,
            "block_ids": ["block-1"],
        }
    }


def test_scoring_is_deterministic_and_enforces_important_quota() -> None:
    first = _tree()
    second = deepcopy(first)
    service = ImportanceService(_settings(mindmap_important_threshold=70))

    assert service.score_tree(first, _source_index()) == []
    assert service.score_tree(second, _source_index()) == []
    assert first == second

    topics = first["children"][0]["children"]
    assert sum(topic["importance"]["level"] == "important" for topic in topics) == 1
    assert all(0 <= topic["importance"]["score"] <= 100 for topic in topics)


def test_invalid_and_cyclic_dependencies_are_removed_with_warnings() -> None:
    tree = _tree(3)
    topics = tree["children"][0]["children"]
    topics[0]["importance_signals"]["prerequisite_for"] = ["topic-1", "missing"]
    topics[1]["importance_signals"]["prerequisite_for"] = ["topic-0"]

    warnings = ImportanceService(_settings()).score_tree(tree, _source_index())

    assert "invalid_importance_dependency:topic-0:missing" in warnings
    assert "cyclic_importance_dependency:topic-1:topic-0" in warnings
    breakdown = tree["children"][0]["children"][1]["_importance_breakdown"]
    assert breakdown["prerequisite_for"] == []


def test_node_without_valid_evidence_has_confidence_capped_at_40() -> None:
    tree = _tree(1)
    topic = tree["children"][0]["children"][0]
    topic["importance_signals"]["evidence_refs"] = ["S999"]

    warnings = ImportanceService(_settings()).score_tree(tree, _source_index())

    assert "invalid_importance_evidence:topic-0" in warnings
    assert topic["importance"]["confidence"] == 40


def test_weights_must_sum_to_one() -> None:
    with pytest.raises(ImportanceScoringError, match="must sum to 1"):
        ImportanceService(
            _settings(mindmap_importance_foundational_weight=0.40)
        )
