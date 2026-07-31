from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.api.dependencies import get_mindmap_service
from app.core.config import get_settings
from app.repositories import deck_repository
from app.schemas.mindmap import MindmapGenerateResponse, MindmapResponse
from app.services.mindmap_service import (
    MindmapContextTooLargeError,
    MindmapService,
    MindmapValidationError,
)


router = APIRouter()


@router.post(
    "/{deck_id}/mindmap/generate",
    response_model=MindmapGenerateResponse,
    responses={202: {"model": MindmapGenerateResponse}},
)
def generate_mindmap(
    deck_id: str,
    background_tasks: BackgroundTasks,
    service: MindmapService = Depends(get_mindmap_service),
) -> MindmapGenerateResponse | JSONResponse:
    deck = deck_repository.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck["processing_status"] not in {"ready", "ready_with_warnings"}:
        raise HTTPException(status_code=409, detail="Deck is not ready for mindmap")
    try:
        preparation = service.prepare_generation(deck_id)
    except MindmapContextTooLargeError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "mindmap_context_too_large",
                "message": "The compact deck context still exceeds the configured budget.",
                "retryable": False,
            },
        ) from exc
    except MindmapValidationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    url = f"/api/v1/decks/{deck_id}/mindmap"
    if preparation.artifact["status"] == "ready":
        return MindmapGenerateResponse(
            deck_id=deck_id,
            status="ready",
            reused=True,
            mindmap_url=url,
            generation_version=preparation.artifact["generation_version"],
        )
    if preparation.created:
        background_tasks.add_task(service.run_generation_safely, preparation)
    return JSONResponse(
        status_code=202,
        content=MindmapGenerateResponse(
            deck_id=deck_id,
            status="generating",
            job_id=preparation.artifact["id"],
            reused=not preparation.created,
            poll_url=url,
            generation_version=preparation.artifact["generation_version"],
        ).model_dump(),
    )


@router.get("/{deck_id}/mindmap", response_model=None)
def read_mindmap(
    deck_id: str, service: MindmapService = Depends(get_mindmap_service)
) -> MindmapResponse | JSONResponse:
    deck = deck_repository.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    artifact = service.get_latest(deck_id)
    if artifact and artifact["status"] == "ready":
        payload = artifact["payload"]
        return MindmapResponse(
            deck_id=deck_id,
            status="ready",
            generation_version=artifact["generation_version"],
            stale=artifact["generation_version"]
            != get_settings().mindmap_generation_version,
            generated_at=artifact["generated_at"],
            quality_warnings=artifact["quality_warnings"],
            stats=payload["stats"],
            tree=payload["tree"],
        )
    if artifact and artifact["status"] == "generating":
        return JSONResponse(
            status_code=202,
            content={
                "deck_id": deck_id,
                "status": "generating",
                "job_id": artifact["id"],
                "progress": (
                    94 if deck["processing_status"] == "generating_mindmap" else 0
                ),
            },
        )
    if artifact and artifact["status"] == "failed":
        error = artifact["error_summary"] or ""
        if error.startswith("AIResponseTruncatedError:"):
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "ai_response_truncated",
                    "message": "DeepSeek stopped before completing the mindmap JSON.",
                    "purpose": "mindmap",
                    "retryable": True,
                },
            )
        raise HTTPException(
            status_code=422,
            detail={
                "code": "mindmap_generation_failed",
                "message": "The mindmap could not be generated.",
                "purpose": "mindmap",
                "retryable": True,
            },
        )
    if deck["processing_status"] not in {"ready", "ready_with_warnings"}:
        raise HTTPException(status_code=409, detail="Deck is not ready for mindmap")
    raise HTTPException(status_code=409, detail="Mindmap has not been generated")
