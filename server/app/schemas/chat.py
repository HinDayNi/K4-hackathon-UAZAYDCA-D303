from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    lesson_id: str = Field(min_length=1, max_length=80)
    question: str = Field(min_length=3, max_length=1500)
    selected_segment_id: str | None = Field(default=None, max_length=20)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("Câu hỏi phải có ít nhất 3 ký tự.")
        return cleaned


class Citation(BaseModel):
    segment_id: str
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float = Field(ge=0, le=1)
    grounded: bool
    suggested_questions: list[str] = Field(max_length=3)
