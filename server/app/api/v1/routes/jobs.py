from fastapi import APIRouter, HTTPException

from app.repositories import deck_repository as repo


router = APIRouter()


@router.get("/{job_id}")
def read_job(job_id: str) -> dict:
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
