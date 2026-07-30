from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class MindmapSource(BaseModel):
    deck_id: str
    slide_id: str
    slide_index: int = Field(ge=1)
    block_ids: list[str]


class MindmapImportance(BaseModel):
    level: Literal["important", "should_know", "additional"]
    label: Literal["Quan trọng", "Nên biết", "Biết thêm"]
    score: int = Field(ge=0, le=100)
    reason: str = Field(min_length=1, max_length=300)
    confidence: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def label_matches_level(self) -> "MindmapImportance":
        expected = {
            "important": "Quan trọng",
            "should_know": "Nên biết",
            "additional": "Biết thêm",
        }
        if self.label != expected[self.level]:
            raise ValueError("Importance label does not match its level")
        return self


class MindmapImportanceSignals(BaseModel):
    foundational: int = Field(ge=0, le=100)
    emphasis: int = Field(ge=0, le=100)
    applicability: int = Field(ge=0, le=100)
    evidence_refs: list[str] = Field(default_factory=list, max_length=3)
    prerequisite_for: list[str] = Field(default_factory=list)


class MindmapCoverage(BaseModel):
    start_slide_index: int = Field(ge=1)
    end_slide_index: int = Field(ge=1)


class MindmapNode(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    type: Literal["root", "section", "topic"]
    title: str = Field(min_length=1, max_length=180)
    summary: str = Field(min_length=1, max_length=1000)
    order: int = Field(ge=0)
    depth: int = Field(ge=0, le=3)
    importance: MindmapImportance
    sources: list[MindmapSource] = Field(default_factory=list)
    coverage: MindmapCoverage | None = None
    children: list["MindmapNode"] = Field(default_factory=list)


class MindmapStats(BaseModel):
    depth: int
    node_count: int
    section_count: int


class MindmapResponse(BaseModel):
    deck_id: str
    status: Literal["ready"]
    generation_version: str
    stale: bool
    generated_at: str
    quality_warnings: list[str]
    stats: MindmapStats
    tree: MindmapNode


class MindmapPendingResponse(BaseModel):
    deck_id: str
    status: Literal["generating"]
    job_id: str | None
    progress: int


class MindmapGenerateResponse(BaseModel):
    deck_id: str
    status: Literal["ready", "generating"]
    job_id: str | None = None
    reused: bool
    poll_url: str | None = None
    mindmap_url: str | None = None
    generation_version: str | None = None
