from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.core.config import get_settings
from app.core.database import initialize_database

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routers import chat  # Hoặc từ đường dẫn file chat.py của bạn
# Thêm import ở đầu file main.py
from app.api.search import router as search_router

app = FastAPI()
# Cấu hình CORS cho phép Preflight Request (OPTIONS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hoặc ["http://localhost:5173", "http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Bắt buộc có "*" để nhận cả OPTIONS, POST, GET...
    allow_headers=["*"],  # Bắt buộc có "*" để nhận Authorization, Content-Type...
)

@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(api_v1_router, prefix=settings.api_prefix)

app.include_router(chat.router, prefix="/api/chat", tags=["Chat & RAG Search"])

app.include_router(search_router)

@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
