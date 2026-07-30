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
