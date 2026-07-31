---
title: Mindmap API
status: implemented
last_verified: 2026-07-31
source_of_truth:
  - server/app/api/v1/routes/mindmaps.py
  - server/app/schemas/mindmap.py
  - server/tests/test_mindmap_api.py
---

# Mindmap API

Generates, reuses, polls, and reads a learning map. The deck must exist and
have status `ready` or `ready_with_warnings`.

## Generate or Reuse

`POST /api/v1/decks/{deck_id}/mindmap/generate`

HTTP `202` when generating:

```json
{
  "deck_id": "deck_abc123",
  "status": "generating",
  "job_id": "mindmap_artifact_123",
  "reused": false,
  "poll_url": "/api/v1/decks/deck_abc123/mindmap",
  "generation_version": "learning-map-v3"
}
```

HTTP `200` when a ready artifact is reused:

```json
{
  "deck_id": "deck_abc123",
  "status": "ready",
  "reused": true,
  "mindmap_url": "/api/v1/decks/deck_abc123/mindmap",
  "generation_version": "learning-map-v3"
}
```

## Poll or Read

`GET /api/v1/decks/{deck_id}/mindmap`

HTTP `202`:

```json
{"deck_id":"deck_abc123","status":"generating","job_id":"mindmap_artifact_123","progress":94}
```

HTTP `200`:

```json
{
  "deck_id": "deck_abc123",
  "status": "ready",
  "generation_version": "learning-map-v3",
  "stale": false,
  "generated_at": "2026-07-31T08:05:00+00:00",
  "quality_warnings": [],
  "stats": {"depth":2,"node_count":15,"section_count":4},
  "tree": {
    "id": "root",
    "type": "root",
    "title": "AI Product Foundations",
    "summary": "Core concepts from the deck.",
    "order": 0,
    "depth": 0,
    "importance": {
      "level": "important",
      "label": "Quan trọng",
      "score": 90,
      "reason": "Central concept.",
      "confidence": 90
    },
    "sources": [],
    "coverage": null,
    "children": []
  }
}
```

`stale: true` means the artifact version differs from the server's current
generation version.

## Important Errors

| Status | Condition | Retry guidance |
|---:|---|---|
| `404` | Deck not found | Correct `deck_id` |
| `409` | Invalid deck state, missing map, failed validation, or oversized context | Inspect `detail` first |
| `422` | Generation failed or AI output was truncated | Read `detail.retryable` |

Example:

```json
{
  "detail": {
    "code": "ai_response_truncated",
    "message": "DeepSeek stopped before completing the mindmap JSON.",
    "purpose": "mindmap",
    "retryable": true
  }
}
```

## Client Flow

Call generate once. If `ready`, fetch `mindmap_url`. If `generating`, poll
`poll_url` until HTTP `200` with `status: "ready"` or an error.

## Known Limitations

- Progress is coarse, not continuously updated.
- Authentication and a shared error model are not implemented.
