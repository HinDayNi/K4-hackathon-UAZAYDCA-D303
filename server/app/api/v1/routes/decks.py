import hashlib
import uuid
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status
from pptx import Presentation
from pptx.exc import PackageNotFoundError

from app.core.config import get_settings
from app.repositories import deck_repository as repo
from app.services.ingestion_service import process_deck


router = APIRouter()


def _public_deck(deck: dict) -> dict:
    return {key: value for key, value in deck.items() if key != "file_path"}


@router.get("")
def list_decks() -> list[dict]:
    return [_public_deck(deck) for deck in repo.list_decks()]


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload_deck(
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(description="PowerPoint .pptx file")],
) -> dict:
    filename = Path(file.filename or "").name
    if Path(filename).suffix.lower() != ".pptx":
        raise HTTPException(status_code=415, detail="MVP only supports .pptx files")
    settings = get_settings()
    content = await file.read(settings.max_upload_bytes + 1)
    await file.close()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds upload limit")
    if not content.startswith(b"PK"):
        raise HTTPException(status_code=422, detail="Invalid PPTX archive")
    try:
        presentation = Presentation(BytesIO(content))
        if not presentation.slides:
            raise HTTPException(status_code=422, detail="PPTX contains no slides")
    except (BadZipFile, PackageNotFoundError, ValueError, KeyError):
        raise HTTPException(status_code=422, detail="Invalid or unreadable PPTX") from None
    file_hash = hashlib.sha256(content).hexdigest()
    existing = repo.find_deck_by_hash(file_hash)
    if existing:
        job = repo.latest_job(existing["id"])
        return {"deck_id": existing["id"], "job_id": job["id"] if job else None, "duplicate": True}

    deck_id, job_id = f"deck_{uuid.uuid4().hex}", f"job_{uuid.uuid4().hex}"
    upload_dir = settings.resolved_upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / f"{deck_id}.pptx"
    target.write_bytes(content)
    repo.create_deck(
        deck_id=deck_id, filename=filename, file_hash=file_hash, file_path=str(target)
    )
    repo.create_job(job_id, deck_id)
    background_tasks.add_task(process_deck, deck_id, job_id, str(target))
    return {"deck_id": deck_id, "job_id": job_id, "duplicate": False}


@router.get("/{deck_id}")
def read_deck(deck_id: str) -> dict:
    deck = repo.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return _public_deck(deck)


@router.get("/{deck_id}/slides")
def read_slides(deck_id: str) -> list[dict]:
    if not repo.get_deck(deck_id):
        raise HTTPException(status_code=404, detail="Deck not found")
    return repo.list_slides(deck_id)


@router.get("/{deck_id}/slides/{slide_id}")
def read_slide(deck_id: str, slide_id: str) -> dict:
    slide = repo.get_slide(deck_id, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    slide["source_target"] = {
        "deck_id": deck_id, "slide_id": slide_id,
        "slide_index": slide["slide_index"],
        "block_ids": [block["id"] for block in slide["blocks"]],
    }
    return slide


@router.post("/{deck_id}/retry", status_code=status.HTTP_202_ACCEPTED)
def retry_deck(deck_id: str, background_tasks: BackgroundTasks) -> dict:
    deck = repo.get_deck(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck["processing_status"] not in {"failed", "ready_with_warnings"}:
        raise HTTPException(status_code=409, detail="Deck is not retryable")
    job_id = f"job_{uuid.uuid4().hex}"
    repo.create_job(job_id, deck_id)
    background_tasks.add_task(process_deck, deck_id, job_id, deck["file_path"])
    return {"deck_id": deck_id, "job_id": job_id}
