from fastapi import APIRouter

from app.api.v1.routes import chat, decks, jobs, lessons, mindmaps


router = APIRouter()
router.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
router.include_router(chat.router, prefix="/decks", tags=["chat"])
router.include_router(decks.router, prefix="/decks", tags=["decks"])
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
router.include_router(mindmaps.router, prefix="/decks", tags=["mindmaps"])
