from fastapi.testclient import TestClient

from app.main import app
from app.repositories import deck_repository as deck_repo
from app.services.mindmap_service import (
    MindmapContextTooLargeError,
    MindmapService,
    MindmapValidationError,
)


def _seed_deck(deck_id: str = "deck_map") -> None:
    deck_repo.create_deck(
        deck_id=deck_id,
        filename="map.pptx",
        file_hash=f"hash-{deck_id}",
        file_path="map.pptx",
    )
    deck_repo.replace_slides(
        deck_id,
        [
            {
                "id": "sld_map",
                "deck_id": deck_id,
                "slide_index": 1,
                "title": "Tư duy sản phẩm AI",
                "full_text": "Sản phẩm AI phải giải quyết nhu cầu người dùng.",
                "status": "extracted",
                "warnings": [],
                "width": 100,
                "height": 100,
                "blocks": [
                    {
                        "id": "blk_map",
                        "block_type": "text_box",
                        "raw_text": "Sản phẩm AI phải giải quyết nhu cầu người dùng.",
                        "normalized_text": "Sản phẩm AI phải giải quyết nhu cầu người dùng.",
                        "reading_order": 0,
                        "bbox_normalized": None,
                        "source_shape_id": "1",
                        "extraction_confidence": 1.0,
                        "included_in_ai_context": True,
                    }
                ],
            }
        ],
    )
    deck_repo.update_block_summary("blk_map", "Giải quyết đúng nhu cầu người dùng.")
    deck_repo.update_slide_summary(
        "sld_map",
        summary="Tư duy sản phẩm AI bắt đầu từ nhu cầu.",
        block_ids=["blk_map"],
        status="ok",
        warnings=[],
    )
    deck_repo.update_deck(deck_id, status="ready", slide_count=1)


def _importance_signals() -> dict:
    return {
        "foundational": 90,
        "emphasis": 90,
        "applicability": 80,
        "evidence_refs": ["S001"],
        "prerequisite_for": [],
    }


def _source_refs() -> list[str]:
    return ["S001"]


def _range() -> dict:
    return {"start_ref": "S001", "end_ref": "S001"}


def _valid_tree() -> dict:
    sections = []
    for section_index in range(4):
        topics = [
            {
                "id": f"topic_{section_index}_{topic_index}",
                "type": "topic",
                "title": f"Chủ đề {section_index}-{topic_index}",
                "summary": "Tóm tắt chủ đề.",
                "order": topic_index,
                "depth": 2,
                "importance_signals": _importance_signals(),
                "source_refs": _source_refs(),
                "range": _range(),
                "children": [],
            }
            for topic_index in range(2)
        ]
        sections.append(
            {
                "id": f"section_{section_index}",
                "type": "section",
                "title": f"Phần {section_index}",
                "summary": "Tóm tắt phần.",
                "order": section_index,
                "depth": 1,
                "importance_signals": _importance_signals(),
                "source_refs": _source_refs(),
                "range": _range(),
                "children": topics,
            }
        )
    return {
        "tree": {
            "id": "root",
            "type": "root",
            "title": "Bài học",
            "summary": "Tóm tắt bài học.",
            "order": 0,
            "depth": 0,
            "importance_signals": _importance_signals(),
            "source_refs": [],
            "range": _range(),
            "children": sections,
        }
    }


def test_generation_is_cached_and_uses_one_model_call() -> None:
    calls = 0

    def structured_call(_: str) -> dict:
        nonlocal calls
        calls += 1
        return _valid_tree()

    with TestClient(app):
        _seed_deck()
        service = MindmapService(structured_call)
        first = service.generate("deck_map")
        second = service.generate("deck_map")
    assert calls == 1
    assert first["id"] == second["id"]
    assert first["payload"]["stats"] == {
        "depth": 2,
        "node_count": 13,
        "section_count": 4,
    }
    first_section = first["payload"]["tree"]["children"][0]
    assert first_section["coverage"] == {
        "start_slide_index": 1,
        "end_slide_index": 1,
    }
    assert first_section["sources"] == [
        {
            "deck_id": "deck_map",
            "slide_id": "sld_map",
            "slide_index": 1,
            "block_ids": ["blk_map"],
        }
    ]
    assert "below_target_node_count" in first["quality_warnings"]


def test_unknown_model_source_is_rejected() -> None:
    payload = _valid_tree()
    payload["tree"]["children"][0]["source_refs"][0] = "S999"
    with TestClient(app):
        _seed_deck()
        service = MindmapService(lambda _: payload)
        try:
            service.generate("deck_map")
        except MindmapValidationError as exc:
            assert "Unknown source ref" in str(exc)
        else:
            raise AssertionError("Unknown source should be rejected")


def test_failed_generation_can_be_retried_manually() -> None:
    attempts = 0

    def structured_call(_: str) -> dict:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return {"invalid": True}
        return _valid_tree()

    with TestClient(app):
        _seed_deck()
        service = MindmapService(structured_call)
        try:
            service.generate("deck_map")
        except MindmapValidationError:
            pass
        else:
            raise AssertionError("First invalid generation should fail")
        artifact = service.generate("deck_map")
    assert attempts == 2
    assert artifact["status"] == "ready"


def test_model_context_excludes_real_ids_and_block_text() -> None:
    with TestClient(app):
        _seed_deck()
        service = MindmapService(lambda _: _valid_tree())
        context, _ = service._context("deck_map")
        model_json = service._model_context_json(context)
    assert "S001" in model_json
    assert "sld_map" not in model_json
    assert "blk_map" not in model_json
    assert len(model_json) <= service.settings.mindmap_input_char_budget


def test_context_budget_stops_before_model_call() -> None:
    calls = 0

    def structured_call(_: str) -> dict:
        nonlocal calls
        calls += 1
        return _valid_tree()

    with TestClient(app):
        _seed_deck()
        service = MindmapService(structured_call)
        service.settings.mindmap_input_char_budget = 10
        try:
            service.generate("deck_map")
        except MindmapContextTooLargeError:
            pass
        else:
            raise AssertionError("Oversized context should be rejected")
    assert calls == 0


def test_source_outside_node_range_expands_coverage_without_another_call() -> None:
    payload = _valid_tree()
    payload["tree"]["children"][0]["children"][0]["source_refs"] = ["S002"]
    context = [
        {
            "ref": "S001",
            "index": 1,
            "title": "Một",
            "summary": "Một",
            "_slide_id": "sld_one",
            "_block_ids": ["blk_one"],
        },
        {
            "ref": "S002",
            "index": 2,
            "title": "Hai",
            "summary": "Hai",
            "_slide_id": "sld_two",
            "_block_ids": ["blk_two"],
        },
    ]
    service = MindmapService(lambda _: payload)
    topic = payload["tree"]["children"][0]["children"][0]
    service._canonicalize_sources(
        topic,
        "deck_map",
        {
            slide["ref"]: {
                "position": position,
                "slide_id": slide["_slide_id"],
                "slide_index": slide["index"],
                "block_ids": slide["_block_ids"],
            }
            for position, slide in enumerate(context)
        },
    )
    assert topic["coverage"] == {
        "start_slide_index": 1,
        "end_slide_index": 2,
    }
    assert topic["sources"][0]["slide_id"] == "sld_two"


def test_sections_are_sorted_and_reordered_by_coverage() -> None:
    tree = {
        "coverage": {},
        "children": [
            {
                "id": "late",
                "order": 0,
                "coverage": {"start_slide_index": 2, "end_slide_index": 2},
                "children": [],
            },
            {
                "id": "early",
                "order": 1,
                "coverage": {"start_slide_index": 1, "end_slide_index": 1},
                "children": [],
            },
        ],
    }
    source_index = {
        "S001": {"position": 0, "slide_index": 1},
        "S002": {"position": 1, "slide_index": 2},
    }
    MindmapService._normalize_section_ranges(tree, source_index)
    assert [section["id"] for section in tree["children"]] == ["early", "late"]
    assert [section["order"] for section in tree["children"]] == [0, 1]
    assert tree["coverage"] == {
        "start_slide_index": 1,
        "end_slide_index": 2,
    }


def test_verbose_model_text_is_truncated_before_schema_validation() -> None:
    payload = _valid_tree()
    payload["tree"]["title"] = "T" * 300
    payload["tree"]["summary"] = "S" * 500
    with TestClient(app):
        _seed_deck()
        artifact = MindmapService(lambda _: payload).generate("deck_map")
    root = artifact["payload"]["tree"]
    assert len(root["title"]) == 180
    assert len(root["summary"]) == 300
    assert len(root["importance"]["reason"]) <= 300
