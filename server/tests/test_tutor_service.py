from fastapi.testclient import TestClient

from app.main import app
from app.repositories import deck_repository as repo
from app.schemas.chat import ChatRequest
from app.services.tutor_service import TutorService


def _seed_ready_deck() -> None:
    repo.create_deck(
        deck_id="deck_tutor",
        filename="tutor.pptx",
        file_hash="tutor-hash",
        file_path="tutor.pptx",
    )
    repo.replace_slides(
        "deck_tutor",
        [
            {
                "id": "sld_tutor",
                "deck_id": "deck_tutor",
                "slide_index": 3,
                "title": "Grounding",
                "full_text": "Câu trả lời phải dựa trên nguồn.",
                "status": "extracted",
                "warnings": [],
                "width": 100,
                "height": 100,
                "blocks": [
                    {
                        "id": "blk_tutor",
                        "block_type": "text_box",
                        "raw_text": "Câu trả lời phải dựa trên nguồn.",
                        "normalized_text": "Câu trả lời phải dựa trên nguồn.",
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
    repo.rebuild_search_index("deck_tutor")
    repo.update_deck("deck_tutor", status="ready", slide_count=1)


def test_unknown_model_citation_is_rejected(monkeypatch) -> None:
    with TestClient(app):
        _seed_ready_deck()
        service = TutorService()
        service.client = object()
        monkeypatch.setattr(
            service,
            "_answer_with_deepseek",
            lambda question, context: {
                "answer": "Một câu trả lời không có nguồn hợp lệ.",
                "cited_block_ids": ["blk_invented"],
            },
        )
        response = service.answer(
            "deck_tutor", ChatRequest(question="Grounding là gì?")
        )
    assert response.status == "no_basis"
    assert response.confidence == 0
    assert response.citations == []


def test_confidence_formula_is_bounded() -> None:
    high = TutorService._confidence(
        [
            {
                "relevance": 1.0,
                "block": {"extraction_confidence": 1.0},
            }
        ]
    )
    low = TutorService._confidence(
        [
            {
                "relevance": 0.0,
                "block": {"extraction_confidence": 0.0},
            }
        ]
    )
    assert high == 100
    assert low == 30

