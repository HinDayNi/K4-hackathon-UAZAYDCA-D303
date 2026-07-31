---
title: Decks and Slides API
status: implemented
last_verified: 2026-07-31
source_of_truth:
  - server/app/api/v1/routes/decks.py
  - server/app/repositories/deck_repository.py
  - server/tests/test_deck_ingestion.py
---

# Decks and Slides API

## Upload

`POST /api/v1/decks` accepts `multipart/form-data` with a required `.pptx`
`file`.

```bash
curl -X POST "http://localhost:8000/api/v1/decks" -F "file=@lesson.pptx"
```

HTTP `202`:

```json
{"deck_id":"deck_abc123","job_id":"job_def456","duplicate":false}
```

Identical content reuses the existing deck and returns `duplicate: true`;
`job_id` may be null when no previous job exists.

| Status | Condition | Retry guidance |
|---:|---|---|
| `413` | Upload exceeds configured size | Use a smaller file |
| `415` | Extension is not `.pptx` | Use a supported file |
| `422` | Archive is invalid, unreadable, or empty | Repair the file |

## Decks and Slides

| Method | Path | Result |
|---|---|---|
| `GET` | `/api/v1/decks` | Decks ordered newest first |
| `GET` | `/api/v1/decks/{deck_id}` | Deck metadata |
| `GET` | `/api/v1/decks/{deck_id}/slides` | Slides ordered by index |
| `GET` | `/api/v1/decks/{deck_id}/slides/{slide_id}` | Slide, blocks, and `source_target` |

Example deck fields:

```json
{
  "id": "deck_abc123",
  "filename": "lesson.pptx",
  "file_hash": "sha256-value",
  "slide_count": 12,
  "processing_status": "ready",
  "extraction_version": "pptx-v1",
  "summary_version": "deepseek-summary-v1",
  "created_at": "2026-07-31T08:00:00+00:00",
  "error_summary": null
}
```

The internal `file_path` is removed. Slide detail adds:

```json
{
  "source_target": {
    "deck_id": "deck_abc123",
    "slide_id": "sld_001",
    "slide_index": 1,
    "block_ids": ["blk_001_1"]
  }
}
```

Unknown decks or slides return `404`.

## Retry

`POST /api/v1/decks/{deck_id}/retry` is allowed only for `failed` or
`ready_with_warnings` decks. It returns HTTP `202`:

```json
{"deck_id":"deck_abc123","job_id":"job_retry789"}
```

Unknown decks return `404`; non-retryable decks return `409`.

## Client Flow

Upload, poll `/api/v1/jobs/{job_id}`, wait for processing to finish, then read
the deck and slides. Retry only for the explicitly eligible states.

## Known Limitations

- These routes return untyped dictionaries rather than Pydantic response
  models. Fields above are verified output but not strict OpenAPI schemas.
- Authentication is not implemented.
