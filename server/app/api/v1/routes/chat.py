from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_tutor_service
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.tutor_service import (
    DeckNotReadyError,
    InvalidSourceError,
    TutorService,
    UpstreamAIError,
)


router = APIRouter()


@router.post("/{deck_id}/chat", response_model=ChatResponse)
def ask_tutor(
    deck_id: str,
    request: ChatRequest,
    service: TutorService = Depends(get_tutor_service),
) -> ChatResponse:
    try:
        return service.answer(deck_id, request)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except DeckNotReadyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InvalidSourceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except UpstreamAIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
