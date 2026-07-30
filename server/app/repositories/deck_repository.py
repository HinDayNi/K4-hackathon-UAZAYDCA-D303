import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_connection


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_deck(*, deck_id: str, filename: str, file_hash: str, file_path: str) -> None:
    with get_connection() as db:
        db.execute(
            """INSERT INTO decks
            (id, filename, file_hash, file_path, processing_status, extraction_version,
             summary_version, created_at)
            VALUES (?, ?, ?, ?, 'queued', 'pptx-v1', 'deepseek-summary-v1', ?)""",
            (deck_id, filename, file_hash, file_path, utc_now()),
        )


def find_deck_by_hash(file_hash: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute("SELECT * FROM decks WHERE file_hash = ?", (file_hash,)).fetchone()
    return dict(row) if row else None


def get_deck(deck_id: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute("SELECT * FROM decks WHERE id = ?", (deck_id,)).fetchone()
    return dict(row) if row else None


def list_decks() -> list[dict[str, Any]]:
    with get_connection() as db:
        rows = db.execute(
            "SELECT * FROM decks ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def update_deck(deck_id: str, *, status: str, slide_count: int | None = None, error: str | None = None) -> None:
    with get_connection() as db:
        db.execute(
            """UPDATE decks SET processing_status = ?,
               slide_count = COALESCE(?, slide_count), error_summary = ?
               WHERE id = ?""",
            (status, slide_count, error, deck_id),
        )


def create_job(job_id: str, deck_id: str) -> None:
    now = utc_now()
    with get_connection() as db:
        db.execute(
            """INSERT INTO ingestion_jobs
            (id, deck_id, status, progress, created_at, updated_at)
            VALUES (?, ?, 'queued', 0, ?, ?)""",
            (job_id, deck_id, now, now),
        )


def get_job(job_id: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute("SELECT * FROM ingestion_jobs WHERE id = ?", (job_id,)).fetchone()
    return dict(row) if row else None


def latest_job(deck_id: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM ingestion_jobs WHERE deck_id = ? ORDER BY created_at DESC LIMIT 1",
            (deck_id,),
        ).fetchone()
    return dict(row) if row else None


def update_job(job_id: str, *, status: str, progress: int, current_slide: int | None = None, error: str | None = None) -> None:
    with get_connection() as db:
        db.execute(
            """UPDATE ingestion_jobs SET status = ?, progress = ?, current_slide = ?,
               error = ?, updated_at = ? WHERE id = ?""",
            (status, progress, current_slide, error, utc_now(), job_id),
        )


def replace_slides(deck_id: str, slides: list[dict[str, Any]]) -> None:
    with get_connection() as db:
        db.execute("DELETE FROM slides WHERE deck_id = ?", (deck_id,))
        for slide in slides:
            db.execute(
                """INSERT INTO slides
                (id, deck_id, slide_index, title, full_text, status, warnings, width, height)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    slide["id"], deck_id, slide["slide_index"], slide["title"],
                    slide["full_text"], slide["status"], json.dumps(slide["warnings"]),
                    slide["width"], slide["height"],
                ),
            )
            for block in slide["blocks"]:
                db.execute(
                    """INSERT INTO slide_blocks
                    (id, slide_id, block_type, raw_text, normalized_text, reading_order,
                     bbox_normalized, source_shape_id, extraction_confidence, included_in_ai_context)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        block["id"], slide["id"], block["block_type"], block["raw_text"],
                        block["normalized_text"], block["reading_order"],
                        json.dumps(block["bbox_normalized"]) if block["bbox_normalized"] else None,
                        block["source_shape_id"], block["extraction_confidence"],
                        int(block["included_in_ai_context"]),
                    ),
                )


def rebuild_search_index(deck_id: str) -> None:
    with get_connection() as db:
        db.execute("DELETE FROM slide_search WHERE deck_id = ?", (deck_id,))
        db.execute(
            """INSERT INTO slide_search
            (deck_id, slide_id, block_id, slide_title, normalized_text, summary)
            SELECT s.deck_id, s.id, b.id, s.title, b.normalized_text,
                   COALESCE(b.summary, '') || ' ' || COALESCE(s.summary, '')
            FROM slides s
            JOIN slide_blocks b ON b.slide_id = s.id
            WHERE s.deck_id = ? AND b.included_in_ai_context = 1""",
            (deck_id,),
        )


def get_blocks_by_ids(deck_id: str, block_ids: list[str]) -> list[dict[str, Any]]:
    if not block_ids:
        return []
    placeholders = ", ".join("?" for _ in block_ids)
    with get_connection() as db:
        rows = db.execute(
            f"""SELECT b.*, s.deck_id, s.slide_index, s.title AS slide_title
                FROM slide_blocks b
                JOIN slides s ON s.id = b.slide_id
                WHERE s.deck_id = ? AND b.id IN ({placeholders})""",
            (deck_id, *block_ids),
        ).fetchall()
    by_id = {row["id"]: _decode_search_block(dict(row)) for row in rows}
    return [by_id[block_id] for block_id in block_ids if block_id in by_id]


def search_blocks(deck_id: str, query: str, limit: int = 20) -> list[dict[str, Any]]:
    match_query = _fts_query(query)
    if not match_query:
        return []
    with get_connection() as db:
        rows = db.execute(
            """SELECT b.*, s.deck_id, s.slide_index, s.title AS slide_title,
                      bm25(slide_search, 0.0, 0.0, 0.0, 2.0, 1.0, 0.5) AS rank
               FROM slide_search
               JOIN slide_blocks b ON b.id = slide_search.block_id
               JOIN slides s ON s.id = slide_search.slide_id
               WHERE slide_search MATCH ? AND slide_search.deck_id = ?
               ORDER BY rank
               LIMIT ?""",
            (match_query, deck_id, max(1, min(limit, 100))),
        ).fetchall()
    return [_decode_search_block(dict(row)) for row in rows]


def _fts_query(query: str) -> str:
    normalized = unicodedata.normalize("NFKC", query).lower()
    terms = re.findall(r"[\wÀ-ỹ]+", normalized, flags=re.UNICODE)
    unique_terms = list(dict.fromkeys(term for term in terms if len(term) > 1))
    return " OR ".join(f'"{term.replace(chr(34), chr(34) * 2)}"' for term in unique_terms[:24])


def list_slides(deck_id: str) -> list[dict[str, Any]]:
    with get_connection() as db:
        rows = db.execute(
            "SELECT * FROM slides WHERE deck_id = ? ORDER BY slide_index", (deck_id,)
        ).fetchall()
    return [_decode_slide(dict(row)) for row in rows]


def get_slide(deck_id: str, slide_id: str) -> dict[str, Any] | None:
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM slides WHERE deck_id = ? AND id = ?", (deck_id, slide_id)
        ).fetchone()
        if not row:
            return None
        blocks = db.execute(
            "SELECT * FROM slide_blocks WHERE slide_id = ? ORDER BY reading_order", (slide_id,)
        ).fetchall()
    result = _decode_slide(dict(row))
    result["blocks"] = [_decode_block(dict(block)) for block in blocks]
    return result


def update_block_summary(block_id: str, summary: str | None) -> None:
    with get_connection() as db:
        db.execute("UPDATE slide_blocks SET summary = ? WHERE id = ?", (summary, block_id))


def update_slide_summary(slide_id: str, *, summary: str | None, block_ids: list[str], status: str, warnings: list[str]) -> None:
    with get_connection() as db:
        db.execute(
            """UPDATE slides SET summary = ?, summary_block_ids = ?, status = ?, warnings = ?
               WHERE id = ?""",
            (summary, json.dumps(block_ids), status, json.dumps(warnings), slide_id),
        )


def mindmap_input(deck_id: str) -> list[dict[str, Any]]:
    with get_connection() as db:
        slides = db.execute(
            """SELECT id, slide_index, title, summary, summary_block_ids
               FROM slides WHERE deck_id = ? ORDER BY slide_index""",
            (deck_id,),
        ).fetchall()
        blocks = db.execute(
            """SELECT b.id, b.slide_id, b.summary, b.normalized_text
               FROM slide_blocks b JOIN slides s ON s.id = b.slide_id
               WHERE s.deck_id = ? AND b.included_in_ai_context = 1
               ORDER BY s.slide_index, b.reading_order""",
            (deck_id,),
        ).fetchall()
    by_slide: dict[str, list[dict[str, Any]]] = {}
    for block in blocks:
        by_slide.setdefault(block["slide_id"], []).append(dict(block))
    result = []
    for row in slides:
        item = dict(row)
        item["summary_block_ids"] = json.loads(item["summary_block_ids"])
        item["blocks"] = by_slide.get(item["id"], [])
        result.append(item)
    return result


def _decode_slide(row: dict[str, Any]) -> dict[str, Any]:
    row["warnings"] = json.loads(row["warnings"])
    row["summary_block_ids"] = json.loads(row["summary_block_ids"])
    return row


def _decode_block(row: dict[str, Any]) -> dict[str, Any]:
    row["bbox_normalized"] = json.loads(row["bbox_normalized"]) if row["bbox_normalized"] else None
    row["included_in_ai_context"] = bool(row["included_in_ai_context"])
    return row


def _decode_search_block(row: dict[str, Any]) -> dict[str, Any]:
    row["bbox_normalized"] = json.loads(row["bbox_normalized"]) if row["bbox_normalized"] else None
    row["included_in_ai_context"] = bool(row["included_in_ai_context"])
    if "rank" in row:
        row["bm25_rank"] = float(row.pop("rank"))
    return row
