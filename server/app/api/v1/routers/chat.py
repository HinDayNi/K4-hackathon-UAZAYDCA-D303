from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies import get_tutor_service
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.tutor_service import TutorService

router = APIRouter()

@router.post("", response_model=ChatResponse)
@router.post("/search", response_model=ChatResponse)
def ask_tutor_semantic_search(
    request: ChatRequest,
    service: TutorService = Depends(get_tutor_service),
) -> ChatResponse:
    try:
        return service.answer(request)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống Search: {str(e)}") from exc