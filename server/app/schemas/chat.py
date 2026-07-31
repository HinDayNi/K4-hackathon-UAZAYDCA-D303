from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatSelection(BaseModel):
    text: str = Field(min_length=1, max_length=6000)
    slide_id: str = Field(min_length=1, max_length=80)
    block_ids: list[str] = Field(min_length=1, max_length=20)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Selection text must not be blank.")
        return cleaned


class ChatHistoryItem(BaseModel):
    question: str = Field(min_length=1, max_length=1500)
    answer: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1500)
    selection: ChatSelection | None = None
    current_slide_id: str | None = Field(default=None, max_length=80)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=3)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 3:
            raise ValueError("Câu hỏi phải có ít nhất 3 ký tự.")
        return cleaned


class Citation(BaseModel):
    deck_id: str
    deck_name: str
    slide_id: str
    slide_index: int = Field(ge=1)
    slide_title: str
    block_ids: list[str]
    excerpt: str


class ChatResponse(BaseModel):
    status: Literal["answered", "no_basis"]
    answer: str
    citations: list[Citation]
    confidence: int = Field(ge=0, le=100)
    grounded: bool
