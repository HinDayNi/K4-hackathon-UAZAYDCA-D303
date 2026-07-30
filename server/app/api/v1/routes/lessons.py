from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_lesson_repository
from app.repositories.lesson_repository import LessonRepository
from app.schemas.lesson import LessonDetail, LessonSummary


router = APIRouter()


@router.get("", response_model=list[LessonSummary])
def list_lessons(
    repository: LessonRepository = Depends(get_lesson_repository),
) -> list[LessonSummary]:
    return repository.list()


@router.get("/{lesson_id}", response_model=LessonDetail)
def get_lesson(
    lesson_id: str,
    repository: LessonRepository = Depends(get_lesson_repository),
) -> LessonDetail:
    lesson = repository.get(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học.")
    return lesson
