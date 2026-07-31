import json
import sqlite3
import uuid
from typing import Any

from app.core.database import get_connection
from app.repositories.deck_repository import utc_now


def find_ready(deck_id: str, content_hash: str, generation_version: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute(
            """SELECT * FROM mindmap_artifacts
               WHERE deck_id = ? AND content_hash = ? AND generation_version = ?
                 AND status = 'ready'
               ORDER BY generated_at DESC LIMIT 1""",
            (deck_id, content_hash, generation_version),
        ).fetchone()
    return _decode(dict(row)) if row else None


def latest(deck_id: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute(
            """SELECT * FROM mindmap_artifacts WHERE deck_id = ?
               ORDER BY CASE status WHEN 'ready' THEN 0 ELSE 1 END,
                        COALESCE(generated_at, created_at) DESC LIMIT 1""",
            (deck_id,),
        ).fetchone()
    return _decode(dict(row)) if row else None


def get(artifact_id: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM mindmap_artifacts WHERE id = ?", (artifact_id,)
        ).fetchone()
    return _decode(dict(row)) if row else None


def find_generating(
    deck_id: str, content_hash: str, generation_version: str
) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute(
            """SELECT * FROM mindmap_artifacts
               WHERE deck_id = ? AND content_hash = ? AND generation_version = ?
                 AND status = 'generating'
               ORDER BY created_at DESC LIMIT 1""",
            (deck_id, content_hash, generation_version),
        ).fetchone()
    return _decode(dict(row)) if row else None


def start(
    deck_id: str, content_hash: str, version: str, prompt_version: str, model: str
) -> tuple[dict[str, Any], bool]:
    artifact_id = f"map_{uuid.uuid4().hex}"
    try:
        with get_connection() as db:
            db.execute(
                """INSERT INTO mindmap_artifacts
                   (id, deck_id, status, generation_version, prompt_version, model,
                    content_hash, created_at)
                   VALUES (?, ?, 'generating', ?, ?, ?, ?, ?)""",
                (
                    artifact_id,
                    deck_id,
                    version,
                    prompt_version,
                    model,
                    content_hash,
                    utc_now(),
                ),
            )
    except sqlite3.IntegrityError:
        active = find_generating(deck_id, content_hash, version)
        if active:
            return active, False
        raise
    artifact = get(artifact_id)
    assert artifact is not None
    return artifact, True


def mark_ready(artifact_id: str, payload: dict[str, Any], warnings: list[str]) -> None:
    with get_connection() as db:
        db.execute(
            """UPDATE mindmap_artifacts SET status = 'ready', payload_json = ?,
               quality_warnings_json = ?, error_summary = NULL, generated_at = ?
               WHERE id = ?""",
            (json.dumps(payload, ensure_ascii=False), json.dumps(warnings), utc_now(), artifact_id),
        )


def mark_failed(artifact_id: str, error: str) -> None:
    with get_connection() as db:
        db.execute(
            "UPDATE mindmap_artifacts SET status = 'failed', error_summary = ? WHERE id = ?",
            (error[:1000], artifact_id),
        )


def _decode(row: dict[str, Any]) -> dict[str, Any]:
    row["payload"] = json.loads(row.pop("payload_json")) if row.get("payload_json") else None
    row["quality_warnings"] = json.loads(row.pop("quality_warnings_json"))
    return row
