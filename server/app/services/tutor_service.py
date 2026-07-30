from app.repositories.lesson_repository import LessonRepository
from app.schemas.chat import ChatRequest, ChatResponse


class TutorService:
    """Base tutor flow; replace this response with retrieval + OpenAI in the MVP."""

    def __init__(self, lessons: LessonRepository):
        self.lessons = lessons

    def answer(self, request: ChatRequest) -> ChatResponse:
        if self.lessons.get(request.lesson_id) is None:
            raise LookupError("Không tìm thấy bài học.")
        return ChatResponse(
            answer=(
                "Server FastAPI đã sẵn sàng. Bước tiếp theo là kết nối retrieval "
                "và OpenAI để trả lời có dẫn nguồn."
            ),
            citations=[],
            confidence=0,
            grounded=False,
            suggested_questions=[
                "Khái niệm chính của bài học này là gì?",
                "Hãy giải thích phần tôi đang chọn.",
            ],
        )
