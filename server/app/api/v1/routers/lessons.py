# from fastapi import APIRouter, Depends, HTTPException

# from app.api.dependencies import get_lesson_repository
# from app.repositories.lesson_repository import LessonRepository
# from app.schemas.lesson import LessonDetail, LessonSummary


# router = APIRouter()


# @router.get("", response_model=list[LessonSummary])
# def list_lessons(
#     repository: LessonRepository = Depends(get_lesson_repository),
# ) -> list[LessonSummary]:
#     return repository.list()


# @router.get("/{lesson_id}", response_model=LessonDetail)
# def get_lesson(
#     lesson_id: str,
#     repository: LessonRepository = Depends(get_lesson_repository),
# ) -> LessonDetail:
#     lesson = repository.get(lesson_id)
#     if lesson is None:
#         raise HTTPException(status_code=404, detail="Không tìm thấy bài học.")
#     return lesson
from fastapi import APIRouter, HTTPException
import firebase_config as firebase_service

router = APIRouter()

@router.get("")
def list_lessons():
    """Lấy danh sách học liệu từ Firebase Firestore"""
    try:
        # Lấy danh sách từ collection raw_resources trên Firebase
        docs = firebase_service.db.collection("raw_resources").stream()
        lessons = []
        for doc in docs:
            data = doc.to_dict() or {}
            lessons.append({
                "id": doc.id,
                "title": data.get("name", "Bài học"),
                "description": f"File {data.get('fileType', 'pdf').upper()}",
                "segment_count": len(data.get("images", []))
            })
        return lessons
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{lesson_id}")
def get_lesson(lesson_id: str):
    """Lấy chi tiết 1 bài học kèm chunks từ Firebase"""
    resource = firebase_service.get_raw_resource_with_chunks(lesson_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học trên Firebase")
    return resource