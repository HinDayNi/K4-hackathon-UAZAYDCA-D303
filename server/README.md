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

`TutorService` hiện là điểm mở rộng dành cho retrieval, OpenAI và kiểm tra
citation. Không commit `.env`, API key hay file `storage/*.db`.
