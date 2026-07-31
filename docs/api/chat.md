---
title: Deck Chat API
status: implemented
last_verified: 2026-07-31
source_of_truth:
  - server/app/api/v1/routes/chat.py
  - server/app/schemas/chat.py
  - server/tests/test_chat_api.py
---

# Deck Chat API

Answers questions using evidence from one ready deck. When evidence is absent,
it returns `no_basis` instead of inventing an answer.

## Ask the Tutor

`POST /api/v1/decks/{deck_id}/chat`

| Field | Type | Required | Constraints |
|---|---|---:|---|
| `question` | string | Yes | 3–1500 characters after trimming |
| `selection` | object or null | No | Selected source context |
| `current_slide_id` | string or null | No | Maximum 80 characters |
| `history` | array | No | Maximum 3 items |

`selection` requires non-blank `text` (1–6000 characters), `slide_id`
(1–80 characters), and 1–20 `block_ids`. Each history item has `question`
(1–1500 characters) and `answer` (1–4000 characters).

```bash
curl -X POST "http://localhost:8000/api/v1/decks/deck_demo/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"When does a product create value?","history":[]}'
```

HTTP `200`, answered:

```json
{
  "status": "answered",
  "answer": "A product creates value when it solves a real user need.",
  "citations": [{
    "deck_id": "deck_demo",
    "deck_name": "product.pptx",
    "slide_id": "sld_007",
    "slide_index": 7,
    "slide_title": "User needs",
    "block_ids": ["blk_007_1"],
    "excerpt": "A product creates value when it solves the right user need."
  }],
  "confidence": 92,
  "grounded": true
}
```

HTTP `200`, insufficient evidence:

```json
{
  "status": "no_basis",
  "answer": "This information is not available in the deck.",
  "citations": [],
  "confidence": 0,
  "grounded": false
}
```

Clients must inspect `status`; HTTP `200` alone does not mean the question was
answered.

## Important Errors

| Status | Condition | Retry guidance |
|---:|---|---|
| `404` | Deck not found | Correct `deck_id` |
| `409` | Deck not ready | Poll ingestion before retrying |
| `422` | Invalid request or source selection | Correct the request |
| `503` | Upstream AI failure | Retry with bounded backoff |

## Known Limitations

- Authentication is not implemented.
- History is request-scoped and limited to three items.
- There is no shared application error model.
