---
title: VLearn AI Tutor API
status: implemented
last_verified: 2026-07-31
source_of_truth:
  - server/app/main.py
  - server/app/api/v1/router.py
---

# API Overview

FastAPI backend for importing PowerPoint decks, inspecting extracted content,
asking grounded questions, and generating learning maps.

## Runtime

- Base URL: `http://localhost:8000`
- API prefix: `/api/v1`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
- Authentication: not implemented
- Upload format: `.pptx` (default maximum 25 MiB)

## Endpoint Index

| Method | Path | Details |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/lessons` | [Lessons and jobs](lessons-and-jobs.md) |
| `GET` | `/api/v1/lessons/{lesson_id}` | [Lessons and jobs](lessons-and-jobs.md) |
| `GET` | `/api/v1/decks` | [Decks](decks.md) |
| `POST` | `/api/v1/decks` | [Decks](decks.md) |
| `GET` | `/api/v1/decks/{deck_id}` | [Decks](decks.md) |
| `GET` | `/api/v1/decks/{deck_id}/slides` | [Decks](decks.md) |
| `GET` | `/api/v1/decks/{deck_id}/slides/{slide_id}` | [Decks](decks.md) |
| `POST` | `/api/v1/decks/{deck_id}/retry` | [Decks](decks.md) |
| `GET` | `/api/v1/jobs/{job_id}` | [Lessons and jobs](lessons-and-jobs.md) |
| `POST` | `/api/v1/decks/{deck_id}/chat` | [Chat](chat.md) |
| `POST` | `/api/v1/decks/{deck_id}/mindmap/generate` | [Mindmaps](mindmaps.md) |
| `GET` | `/api/v1/decks/{deck_id}/mindmap` | [Mindmaps](mindmaps.md) |

`GET /health` returns `{"status":"ok"}`.

## Main Workflow

1. Upload a deck.
2. Poll the returned ingestion job.
3. Read the processed deck and slides.
4. Ask grounded questions or generate and poll a mindmap.

HTTP status and response `status` are separate signals. Chat may return HTTP
`200` with `no_basis`; mindmap polling may return HTTP `202` with `generating`.

## Error Shape

There is no shared application error model. FastAPI places errors under
`detail`, which may be a string, object, or validation array.
