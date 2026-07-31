from fastapi.testclient import TestClient

from app.main import app


def test_health_check() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_lessons_are_empty_before_seed() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/lessons")
    assert response.status_code == 200
    assert response.json() == []


def test_chat_validates_request() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/decks/demo/chat",
            json={"question": "  "},
        )
    assert response.status_code == 422
