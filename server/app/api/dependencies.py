from functools import lru_cache
from app.services.tutor_service import TutorService

@lru_cache
def get_tutor_service() -> TutorService:
    return TutorService()

# --- KHÔI PHỤC TẠM ĐỂ KHÔNG BỊ LỖI IMPORT CÁC ROUTE CŨ ---
class MockLessonRepository:
    def list(self):
        return []
    def get(self, lesson_id: str):
        return None

@lru_cache
def get_lesson_repository():
    return MockLessonRepository()