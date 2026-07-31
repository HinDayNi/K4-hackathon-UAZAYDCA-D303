from fastapi import APIRouter

from app.api.v1.routers import chat, lessons


router = APIRouter()
router.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
