import sqlite3
from contextlib import contextmanager
from typing import Iterator

from app.core.config import get_settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS lesson_segments (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id),
    position INTEGER NOT NULL,
    content TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lesson_segments
ON lesson_segments(lesson_id, position);

CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_hash TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    slide_count INTEGER NOT NULL DEFAULT 0,
    processing_status TEXT NOT NULL,
    extraction_version TEXT NOT NULL,
    summary_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    error_summary TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    current_slide INTEGER,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    slide_index INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    full_text TEXT NOT NULL DEFAULT '',
    summary TEXT,
    summary_block_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    warnings TEXT NOT NULL DEFAULT '[]',
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    UNIQUE(deck_id, slide_index)
);

CREATE TABLE IF NOT EXISTS slide_blocks (
    id TEXT PRIMARY KEY,
    slide_id TEXT NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    summary TEXT,
    reading_order INTEGER NOT NULL,
    bbox_normalized TEXT,
    source_shape_id TEXT,
    extraction_confidence REAL NOT NULL,
    included_in_ai_context INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_jobs_deck ON ingestion_jobs(deck_id);
CREATE INDEX IF NOT EXISTS idx_slides_deck ON slides(deck_id, slide_index);
CREATE INDEX IF NOT EXISTS idx_blocks_slide ON slide_blocks(slide_id, reading_order);

CREATE TABLE IF NOT EXISTS mindmap_artifacts (
    id TEXT PRIMARY KEY,
    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    generation_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    model TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    payload_json TEXT,
    quality_warnings_json TEXT NOT NULL DEFAULT '[]',
    error_summary TEXT,
    created_at TEXT NOT NULL,
    generated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mindmaps_deck_version
ON mindmap_artifacts(deck_id, generation_version, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mindmaps_one_active
ON mindmap_artifacts(deck_id, content_hash, generation_version)
WHERE status = 'generating';

CREATE VIRTUAL TABLE IF NOT EXISTS slide_search USING fts5(
    deck_id UNINDEXED,
    slide_id UNINDEXED,
    block_id UNINDEXED,
    slide_title,
    normalized_text,
    summary,
    tokenize = 'unicode61 remove_diacritics 2',
    prefix = '2 3'
);
"""


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    database_path = get_settings().resolved_database_path
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA)
        # The FTS table is a derived index. Rebuilding on startup also indexes
        # ready decks created before search support was added.
        connection.execute("DELETE FROM slide_search")
        connection.execute(
            """INSERT INTO slide_search
            (deck_id, slide_id, block_id, slide_title, normalized_text, summary)
            SELECT s.deck_id, s.id, b.id, s.title, b.normalized_text,
                   COALESCE(b.summary, '') || ' ' || COALESCE(s.summary, '')
            FROM slides s
            JOIN slide_blocks b ON b.slide_id = s.id
            WHERE b.included_in_ai_context = 1"""
        )
