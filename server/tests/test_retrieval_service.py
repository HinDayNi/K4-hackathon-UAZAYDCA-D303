from fastapi.testclient import TestClient

from app.main import app
from app.repositories import deck_repository as repo
from app.services.retrieval_service import RetrievalService


def _seed_ready_deck(deck_id: str = "deck_search") -> dict[str, str]:
    repo.create_deck(
        deck_id=deck_id,
        filename="lesson.pptx",
        file_hash=f"hash-{deck_id}",
        file_path=f"{deck_id}.pptx",
    )
    slides = [
        {
            "id": f"sld_near_{deck_id}",
            "deck_id": deck_id,
            "slide_index": 1,
            "title": "Giới thiệu",
            "full_text": "Tổng quan khóa học",
            "status": "extracted",
            "warnings": [],
            "width": 100,
            "height": 100,
            "blocks": [
                {
                    "id": f"blk_near_{deck_id}",
                    "block_type": "text_box",
                    "raw_text": "Tổng quan khóa học",
                    "normalized_text": "Tổng quan khóa học",
                    "reading_order": 0,
                    "bbox_normalized": None,
                    "source_shape_id": "1",
                    "extraction_confidence": 1.0,
                    "included_in_ai_context": True,
                }
            ],
        },
        {
            "id": f"sld_far_{deck_id}",
            "deck_id": deck_id,
            "slide_index": 18,
            "title": "Jobs to be Done",
            "full_text": "JTBD tập trung vào công việc khách hàng muốn hoàn thành.",
            "status": "extracted",
            "warnings": [],
            "width": 100,
            "height": 100,
            "blocks": [
                {
                    "id": f"blk_far_{deck_id}",
                    "block_type": "text_box",
                    "raw_text": "JTBD tập trung vào công việc khách hàng muốn hoàn thành.",
                    "normalized_text": "JTBD tập trung vào công việc khách hàng muốn hoàn thành.",
                    "reading_order": 0,
                    "bbox_normalized": None,
                    "source_shape_id": "2",
                    "extraction_confidence": 0.95,
                    "included_in_ai_context": True,
                }
            ],
        },
    ]
    repo.replace_slides(deck_id, slides)
    repo.rebuild_search_index(deck_id)
    repo.update_deck(deck_id, status="ready", slide_count=2)
    return {
        "deck_id": deck_id,
        "far_slide": f"sld_far_{deck_id}",
        "far_block": f"blk_far_{deck_id}",
    }


def test_free_question_finds_block_on_distant_slide() -> None:
    with TestClient(app):
        seeded = _seed_ready_deck()
        results = RetrievalService().retrieve(
            deck_id=seeded["deck_id"],
            question="JTBD và công việc khách hàng",
            selection=None,
            current_slide_id=f"sld_near_{seeded['deck_id']}",
            history=[],
        )
    assert results
    assert results[0]["block"]["id"] == seeded["far_block"]
    assert results[0]["block"]["slide_index"] == 18


def test_search_is_scoped_to_one_deck() -> None:
    with TestClient(app):
        first = _seed_ready_deck("deck_one")
        _seed_ready_deck("deck_two")
        results = repo.search_blocks(first["deck_id"], "JTBD", 20)
    assert results
    assert {item["deck_id"] for item in results} == {"deck_one"}


def test_query_expansion_can_find_differently_worded_topic() -> None:
    def structured_call(purpose: str, _: str) -> dict:
        if purpose == "query_expansion":
            return {
                "standalone_query": "JTBD công việc khách hàng",
                "variants": ["Jobs to be Done"],
            }
        return {
            "results": [
                {
                    "block_id": f"blk_far_deck_search",
                    "relevance": 0.9,
                    "supports_answer": True,
                }
            ]
        }

    with TestClient(app):
        _seed_ready_deck()
        results = RetrievalService(structured_call).retrieve(
            deck_id="deck_search",
            question="Làm sao hiểu điều người mua thực sự muốn đạt được?",
            selection=None,
            current_slide_id=None,
            history=[],
        )
    assert results[0]["block"]["slide_index"] == 18
