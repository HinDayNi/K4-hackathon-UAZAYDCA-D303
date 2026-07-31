import re
import uuid
from pathlib import Path
from typing import Any
from pypdf import PdfReader


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_pdf(path: Path, deck_id: str) -> list[dict[str, Any]]:
    reader = PdfReader(str(path))
    extracted: list[dict[str, Any]] = []

    for slide_index, page in enumerate(reader.pages, start=1):
        raw_text = (page.extract_text() or "").strip()
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        title = lines[0] if lines else f"Trang slide {slide_index}"
        if len(title) > 120:
            title = title[:119] + "…"

        blocks = []
        for order, line in enumerate(lines):
            normalized = normalize_text(line)
            if not normalized:
                continue
            blocks.append({
                "id": f"blk_{uuid.uuid4().hex}",
                "block_type": "title" if order == 0 else "text_box",
                "raw_text": line,
                "normalized_text": normalized,
                "bbox_normalized": {"x": 0.05, "y": 0.1 * order, "width": 0.9, "height": 0.1},
                "source_shape_id": f"pdf_page_{slide_index}_line_{order}",
                "reading_order": order,
                "extraction_confidence": 1.0,
                "included_in_ai_context": True,
            })

        warnings: list[str] = []
        if not blocks:
            warnings.append("no_extractable_text")

        extracted.append({
            "id": f"sld_{uuid.uuid4().hex}",
            "deck_id": deck_id,
            "slide_index": slide_index,
            "title": title,
            "full_text": "\n".join(lines),
            "status": "low_content" if warnings else "extracted",
            "warnings": warnings,
            "width": 1920,
            "height": 1080,
            "blocks": blocks,
        })

    return extracted
