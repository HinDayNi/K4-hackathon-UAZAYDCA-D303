from fastapi.testclient import TestClient

from app.main import app
from app.repositories import deck_repository as repo


def _seed_deck() -> None:
    repo.create_deck(
        deck_id="deck_chat",
        filename="product.pptx",
        file_hash="chat-hash",
        file_path="product.pptx",
    )
    repo.replace_slides(
        "deck_chat",
        [
            {
                "id": "sld_chat",
                "deck_id": "deck_chat",
                "slide_index": 7,
                "title": "Nhu cầu người dùng",
                "full_text": "Sản phẩm tạo giá trị khi giải quyết đúng nhu cầu.",
                "status": "extracted",
                "warnings": [],
                "width": 100,
                "height": 100,
                "blocks": [
                    {
                        "id": "blk_chat",
                        "block_type": "text_box",
                        "raw_text": "Sản phẩm tạo giá trị khi giải quyết đúng nhu cầu.",
                        "normalized_text": "Sản phẩm tạo giá trị khi giải quyết đúng nhu cầu.",
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
    repo.rebuild_search_index("deck_chat")
    repo.update_deck("deck_chat", status="ready", slide_count=1)


def test_chat_without_selection_returns_verified_slide_citation() -> None:
    with TestClient(app) as client:
        _seed_deck()
        response = client.post(
            "/api/v1/decks/deck_chat/chat",
            json={"question": "Khi nào sản phẩm tạo giá trị?"},
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "answered"
    assert payload["grounded"] is True
    assert payload["citations"][0]["slide_index"] == 7
    assert payload["citations"][0]["block_ids"] == ["blk_chat"]


def test_chat_rejects_selection_from_another_slide() -> None:
    with TestClient(app) as client:
        _seed_deck()
        response = client.post(
            "/api/v1/decks/deck_chat/chat",
            json={
                "question": "Giải thích đoạn này",
                "selection": {
                    "text": "đoạn",
                    "slide_id": "sld_unknown",
                    "block_ids": ["blk_chat"],
                },
            },
        )
    assert response.status_code == 422


def test_chat_returns_no_basis_when_deck_has_no_match() -> None:
    with TestClient(app) as client:
        _seed_deck()
        response = client.post(
            "/api/v1/decks/deck_chat/chat",
            json={"question": "Cơ học lượng tử và lỗ đen"},
        )
    assert response.status_code == 200
    assert response.json() == {
        "status": "no_basis",
        "answer": "Thông tin này hiện không tồn tại trong deck.",
        "citations": [],
        "confidence": 0,
        "grounded": False,
    }


def test_chat_rejects_deck_that_is_not_ready() -> None:
    with TestClient(app) as client:
        repo.create_deck(
            deck_id="deck_queued",
            filename="queued.pptx",
            file_hash="queued-hash",
            file_path="queued.pptx",
        )
        response = client.post(
            "/api/v1/decks/deck_queued/chat",
            json={"question": "Nội dung deck là gì?"},
        )
    assert response.status_code == 409
