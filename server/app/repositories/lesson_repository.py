from app.core.database import get_connection
from app.schemas.lesson import LessonDetail, LessonSegment, LessonSummary


class LessonRepository:
    def list(self) -> list[LessonSummary]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT l.id, l.title, l.description, COUNT(s.id) AS segment_count
                FROM lessons l
                LEFT JOIN lesson_segments s ON s.lesson_id = l.id
                GROUP BY l.id
                ORDER BY l.id
                """
            ).fetchall()
        return [LessonSummary(**dict(row)) for row in rows]

    def get(self, lesson_id: str) -> LessonDetail | None:
        with get_connection() as connection:
            lesson = connection.execute(
                """
                SELECT l.id, l.title, l.description, COUNT(s.id) AS segment_count
                FROM lessons l
                LEFT JOIN lesson_segments s ON s.lesson_id = l.id
                WHERE l.id = ?
                GROUP BY l.id
                """,
                (lesson_id,),
            ).fetchone()
            if lesson is None:
                return None
            segments = connection.execute(
                """
                SELECT id, position, content
                FROM lesson_segments
                WHERE lesson_id = ?
                ORDER BY position
                """,
                (lesson_id,),
            ).fetchall()
        return LessonDetail(
            **dict(lesson),
            segments=[LessonSegment(**dict(row)) for row in segments],
        )
