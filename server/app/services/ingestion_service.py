from pathlib import Path

from app.repositories import deck_repository as repo
from app.services.pptx_extractor import extract_pptx
from app.services.summary_service import summarize_block, summarize_slide
from app.services.mindmap_service import MindmapService


def process_deck(deck_id: str, job_id: str, file_path: str) -> None:
    warnings = 0
    try:
        repo.update_job(job_id, status="extracting", progress=5)
        repo.update_deck(deck_id, status="extracting")
        slides = extract_pptx(Path(file_path), deck_id)
        repo.replace_slides(deck_id, slides)
        repo.update_deck(deck_id, status="summarizing_blocks", slide_count=len(slides))
        repo.update_job(job_id, status="summarizing_blocks", progress=20)

        for index, slide in enumerate(slides, start=1):
            repo.update_job(
                job_id, status="summarizing_blocks",
                progress=20 + int(45 * index / max(1, len(slides))), current_slide=index,
            )
            for block in slide["blocks"]:
                try:
                    block["summary"] = summarize_block(block)
                    repo.update_block_summary(block["id"], block["summary"])
                except Exception as exc:
                    warnings += 1
                    slide["warnings"].append(f"block_summary_failed:{type(exc).__name__}")

        repo.update_deck(deck_id, status="summarizing_slides")
        repo.update_job(job_id, status="summarizing_slides", progress=65)
        for index, slide in enumerate(slides, start=1):
            try:
                result = summarize_slide(slide)
            except Exception as exc:
                warnings += 1
                slide["warnings"].append(f"slide_summary_failed:{type(exc).__name__}")
                result = {"summary": None, "block_ids": [], "status": "needs_review"}
            if result["status"] != "ok":
                warnings += 1
            repo.update_slide_summary(
                slide["id"], summary=result["summary"], block_ids=result["block_ids"],
                status=result["status"], warnings=slide["warnings"],
            )
            repo.update_job(
                job_id, status="summarizing_slides",
                progress=65 + int(25 * index / max(1, len(slides))), current_slide=index,
            )

        repo.update_job(job_id, status="validating", progress=90)
        repo.rebuild_search_index(deck_id)
        repo.update_deck(deck_id, status="generating_mindmap")
        repo.update_job(job_id, status="generating_mindmap", progress=94)
        try:
            MindmapService().generate(deck_id)
            repo.update_job(job_id, status="validating_mindmap", progress=98)
        except Exception as exc:
            warnings += 1
            mindmap_error = f"mindmap_failed:{type(exc).__name__}"
            repo.update_job(
                job_id, status="validating_mindmap", progress=98, error=mindmap_error
            )
        final_status = "ready_with_warnings" if warnings else "ready"
        repo.update_deck(deck_id, status=final_status, slide_count=len(slides))
        repo.update_job(job_id, status=final_status, progress=100)
    except Exception as exc:
        message = f"{type(exc).__name__}: {exc}"
        repo.update_deck(deck_id, status="failed", error=message)
        repo.update_job(job_id, status="failed", progress=100, error=message)
