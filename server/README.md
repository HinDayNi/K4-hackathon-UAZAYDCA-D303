# VLearn AI Tutor Server

Base backend FastAPI cho prototype VLearn AI Tutor.

## Cấu trúc

```text
app/
├── api/v1/routes/       # REST endpoints
├── core/                # config, database
├── prompts/             # prompt AI theo phiên bản
├── repositories/        # truy cập SQLite
├── schemas/             # Pydantic request/response
├── services/            # nghiệp vụ AI Tutor
└── main.py              # FastAPI entrypoint
scripts/                 # seed/index dữ liệu
storage/                 # SQLite local, không commit file DB
tests/                   # backend tests
```

## Chạy local

```powershell
cd codebase/server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
python scripts/seed_demo.py
uvicorn app.main:app --reload
```

Swagger UI: `http://localhost:8000/docs`

## Kiểm thử

```powershell
python -m pytest
```

## API base

- `GET /health`
- `GET /api/v1/lessons`
- `GET /api/v1/lessons/{lesson_id}`
- `POST /api/v1/chat`
- `GET /api/v1/decks/{deck_id}/mindmap`
- `POST /api/v1/decks/{deck_id}/mindmap/generate`

Mindmap được tạo ở cuối ingestion và lưu trong SQLite. Endpoint GET chỉ đọc
artifact đã lưu, không gọi AI. Developer có thể chủ động tạo lại bằng:

Deck đã import trước khi có tính năng mindmap có thể gọi endpoint `generate`.
Endpoint đọc dữ liệu slide/block đang có trong SQLite, tái sử dụng cache hoặc
active generation và không yêu cầu upload lại file.

```powershell
python scripts/regenerate_mindmap.py deck_id --force
```

## Ngân sách AI

- Query expansion: 400 output token, timeout 30 giây.
- Rerank: 1.200 output token, timeout 30 giây.
- Block/slide summary: 500/900 output token.
- Tutor answer: 1.600 output token, timeout 60 giây.
- Mindmap: 8.000 output token, timeout 120 giây.

Mọi structured JSON request đều tắt thinking và kiểm tra `finish_reason`
trước khi parse. Response bị cắt được báo bằng `ai_response_truncated`;
backend không tự retry.

Mindmap v3 chỉ gửi alias, title và summary rút gọn của từng slide. Payload
không chứa ID thật hoặc toàn bộ block text, bị giới hạn ở 75.000 ký tự và
được ánh xạ lại sang `SourceTarget` sau khi model trả kết quả.

DeepSeek chỉ nhận diện các tín hiệu importance (`foundational`, `emphasis`,
`applicability`), evidence và quan hệ prerequisite. Backend tính điểm cuối theo
rubric cố định 30/25/20/15/10 cho nền tảng, nhấn mạnh, ảnh hưởng downstream,
khả năng áp dụng và độ bao phủ. `confidence` được tính riêng từ chất lượng và
số bằng chứng; tối đa 30% topic được gắn `important`.

`TutorService` hiện là điểm mở rộng dành cho retrieval, OpenAI và kiểm tra
citation. Không commit `.env`, API key hay file `storage/*.db`.
