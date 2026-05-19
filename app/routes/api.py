from __future__ import annotations

import logging
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import ValidationError

from app import storage
from app.config import get_settings
from app.schema import Survey

log = logging.getLogger("app.api")

router = APIRouter(prefix="/api", tags=["api"])


def _survey_payload(survey: Survey, slug: str) -> dict:
    return {
        "survey": survey.model_dump(mode="json"),
        "page_images": [
            {
                "filename": page.image,
                "url": f"/api/surveys/{slug}/images/{page.image}",
            }
            for page in survey.pages
        ],
    }


@router.get("/surveys")
def list_surveys() -> JSONResponse:
    settings = get_settings()
    summaries = storage.list_surveys(settings.data_dir)
    return JSONResponse(
        {
            "surveys": [
                {"slug": s.slug, "name": s.name, "page_count": s.page_count} for s in summaries
            ]
        }
    )


@router.get("/surveys/{slug}")
def get_survey(slug: str) -> JSONResponse:
    settings = get_settings()
    try:
        survey = storage.read_survey(settings.data_dir, slug)
    except storage.SurveyNotFound:
        raise HTTPException(404, f"survey {slug!r} not found")
    return JSONResponse(_survey_payload(survey, slug))


@router.get("/surveys/{slug}/images/{filename}")
def get_survey_image(slug: str, filename: str):
    settings = get_settings()
    # Defensive: refuse path traversal. Image names live alongside survey.yaml.
    if "/" in filename or ".." in filename or filename.startswith("."):
        raise HTTPException(400, "invalid image filename")
    folder = settings.data_dir / slug
    candidate = folder / filename
    if not candidate.is_file():
        raise HTTPException(404, "image not found")
    return FileResponse(candidate)


@router.get("/models")
def list_models() -> JSONResponse:
    settings = get_settings()
    models_dir = settings.resolved_models_dir
    entries = storage.list_models(models_dir)
    # Vision models need a matching mmproj GGUF loaded alongside the
    # weights. With the folder-per-model layout each subdirectory pairs
    # its own projector. Missing projectors are non-fatal but surface in
    # docker logs so the operator notices before researchers hit silent
    # vision failures.
    missing = [e.name for e in entries if e.mmproj_path is None]
    if missing:
        log.warning(
            "No mmproj GGUF found alongside %d self-hosted model(s) in %s (%s). "
            "Place a *mmproj*.gguf next to each model file in its subdirectory.",
            len(missing),
            models_dir,
            ", ".join(missing),
        )
    return JSONResponse(
        {
            "models": [
                {
                    "name": e.name,
                    "url": f"/static/models/{e.path}",
                    "mmproj_url": f"/static/models/{e.mmproj_path}" if e.mmproj_path else None,
                }
                for e in entries
            ],
            "llm_timeout_seconds": settings.llm_timeout_seconds,
        }
    )
