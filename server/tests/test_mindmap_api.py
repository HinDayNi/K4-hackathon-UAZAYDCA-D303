from fastapi.testclient import TestClient

from app.main import app
from app.api.dependencies import get_mindmap_service
from app.repositories import deck_repository as deck_repo
from app.repositories import mindmap_repository as map_repo
from app.services.mindmap_service import MindmapService
from test_mindmap_service import _seed_deck, _valid_tree


def test_mindmap_api_returns_stored_tree_without_generation() -> None:
    with TestClient(app) as client:
        deck_repo.create_deck(
            deck_id="deck_api_map",
            filename="api.pptx",
            file_hash="api-map-hash",
            file_path="api.pptx",
        )
        deck_repo.update_deck("deck_api_map", status="ready", slide_count=1)
        artifact, created = map_repo.start(
            "deck_api_map",
            "content-hash",
            "learning-map-v1",
            "learning-map-prompt-v1",
            "deepseek-v4-flash",
        )
        assert created is True
        tree = {
            "id": "root",
            "type": "root",
            "title": "Bài học",
            "summary": "Tóm tắt.",
            "order": 0,
            "depth": 0,
            "importance": {
                "level": "important",
                "label": "Quan trọng",
                "score": 90,
                "reason": "Trọng tâm.",
                "confidence": 90,
            },
            "sources": [],
            "children": [],
        }
        map_repo.mark_ready(
            artifact["id"],
            {"tree": tree, "stats": {"depth": 0, "node_count": 1, "section_count": 0}},
            ["short_deck"],
        )
        response = client.get("/api/v1/decks/deck_api_map/mindmap")
    assert response.status_code == 200
    assert response.json()["tree"]["id"] == "root"
    assert response.json()["quality_warnings"] == ["short_deck"]


def test_mindmap_api_reports_missing_deck() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/decks/missing/mindmap")
    assert response.status_code == 404


def test_generate_route_builds_mindmap_from_existing_database_data() -> None:
    service = MindmapService(lambda _: _valid_tree())
    app.dependency_overrides[get_mindmap_service] = lambda: service
    try:
        with TestClient(app) as client:
            _seed_deck("deck_legacy")
            first = client.post("/api/v1/decks/deck_legacy/mindmap/generate")
            second = client.post("/api/v1/decks/deck_legacy/mindmap/generate")
            stored = client.get("/api/v1/decks/deck_legacy/mindmap")
    finally:
        app.dependency_overrides.clear()
    assert first.status_code == 202
    assert first.json()["reused"] is False
    assert second.status_code == 200
    assert second.json()["reused"] is True
    assert stored.status_code == 200
    assert stored.json()["tree"]["id"] == "root"


def test_generate_route_reuses_active_generation() -> None:
    service = MindmapService(lambda _: _valid_tree())
    app.dependency_overrides[get_mindmap_service] = lambda: service
    try:
        with TestClient(app) as client:
            _seed_deck("deck_active")
            prepared = service.prepare_generation("deck_active")
            response = client.post("/api/v1/decks/deck_active/mindmap/generate")
            polled = client.get("/api/v1/decks/deck_active/mindmap")
    finally:
        app.dependency_overrides.clear()
    assert prepared.created is True
    assert response.status_code == 202
    assert response.json()["reused"] is True
    assert response.json()["job_id"] == prepared.artifact["id"]
    assert polled.status_code == 202
    assert polled.json()["job_id"] == prepared.artifact["id"]


def test_generate_route_rejects_unready_deck() -> None:
    with TestClient(app) as client:
        deck_repo.create_deck(
            deck_id="deck_unready_map",
            filename="queued.pptx",
            file_hash="queued-map-hash",
            file_path="queued.pptx",
        )
        response = client.post(
            "/api/v1/decks/deck_unready_map/mindmap/generate"
        )
    assert response.status_code == 409


def test_mindmap_api_hides_truncated_raw_json_error() -> None:
    with TestClient(app) as client:
        deck_repo.create_deck(
            deck_id="deck_truncated_map",
            filename="truncated.pptx",
            file_hash="truncated-map-hash",
            file_path="truncated.pptx",
        )
        deck_repo.update_deck("deck_truncated_map", status="ready", slide_count=1)
        artifact, _ = map_repo.start(
            "deck_truncated_map",
            "truncated-content",
            "learning-map-v1",
            "learning-map-prompt-v1",
            "deepseek-v4-flash",
        )
        map_repo.mark_failed(
            artifact["id"],
            "AIResponseTruncatedError: raw partial JSON must not be returned",
        )
        response = client.get("/api/v1/decks/deck_truncated_map/mindmap")
    assert response.status_code == 422
    assert response.json()["detail"] == {
        "code": "ai_response_truncated",
        "message": "DeepSeek stopped before completing the mindmap JSON.",
        "purpose": "mindmap",
        "retryable": True,
    }
