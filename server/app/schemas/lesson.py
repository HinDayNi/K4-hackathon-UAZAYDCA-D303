from pydantic import BaseModel


class LessonSummary(BaseModel):
    id: str
    title: str
    description: str
    segment_count: int


class LessonSegment(BaseModel):
    id: str
    position: int
    content: str


class LessonDetail(LessonSummary):
    segments: list[LessonSegment]
