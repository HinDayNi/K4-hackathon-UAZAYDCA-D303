---
title: Lessons and Jobs API
status: implemented
last_verified: 2026-07-31
source_of_truth:
  - server/app/api/v1/routes/lessons.py
  - server/app/api/v1/routes/jobs.py
  - server/app/schemas/lesson.py
  - server/tests/test_api.py
---

# Lessons and Jobs API

## Lessons

`GET /api/v1/lessons` returns summaries:

```json
[{
  "id": "lesson_01",
  "title": "AI Product Foundations",
  "description": "Introduction to AI product thinking.",
  "segment_count": 3
}]
```

An unseeded database returns `[]`.

`GET /api/v1/lessons/{lesson_id}` returns the same fields plus ordered
`segments`:

```json
{
  "id": "lesson_01",
  "title": "AI Product Foundations",
  "description": "Introduction to AI product thinking.",
  "segment_count": 1,
  "segments": [{"id":"segment_01","position":1,"content":"Start with a user problem."}]
}
```

An unknown lesson returns `404`.

## Ingestion Jobs

`GET /api/v1/jobs/{job_id}` polls processing started by upload or retry:

```json
{
  "id": "job_def456",
  "deck_id": "deck_abc123",
  "status": "ready",
  "progress": 100,
  "current_slide": null,
  "error": null,
  "created_at": "2026-07-31T08:00:00+00:00",
  "updated_at": "2026-07-31T08:00:10+00:00"
}
```

Unknown jobs return `404`. Poll with a bounded interval. The backend does not
currently publish a typed enum of all terminal job states.

## Known Limitations

- Job responses use untyped dictionaries and lack a strict OpenAPI schema.
- Authentication is not implemented.
