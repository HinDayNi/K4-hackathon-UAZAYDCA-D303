from functools import lru_cache

from app.repositories.lesson_repository import LessonRepository
from app.services.tutor_service import TutorService
from app.services.mindmap_service import MindmapService


@lru_cache
def get_lesson_repository() -> LessonRepository:
    return LessonRepository()


def get_tutor_service() -> TutorService:
    return TutorService()


def get_mindmap_service() -> MindmapService:
    return MindmapService()
