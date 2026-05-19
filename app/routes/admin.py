from __future__ import annotations

from typing import Annotated

import yaml
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import ValidationError

from app import auth, storage
from app.analytics import analytics_context
from app.config import get_settings
from app.schema import Survey

router = APIRouter(tags=["admin"])

# TODO: when per-user accounts arrive, replace the shared-password flow with a
# real user lookup. The require_admin dep already returns a SessionInfo, so
# downstream routes do not need to change.


def _templates(request: Request):
    return request.app.state.templates


@router.get("/admin", response_class=HTMLResponse)
def admin_page(
    request: Request,
    afp_session: Annotated[str | None, Cookie(alias=auth.SESSION_COOKIE_NAME)] = None,
):
    if auth.read_session(afp_session) is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    settings = get_settings()
    return _templates(request).TemplateResponse(
        request,
        "admin.html",
        analytics_context(settings),
    )


@router.get("/admin/login", response_class=HTMLResponse)
def admin_login_page(request: Request):
    return _templates(request).TemplateResponse(
        request,
        "admin_login.html",
        {"error": None, **analytics_context(get_settings())},
    )


@router.post("/admin/login")
def admin_login(
    request: Request,
    password: Annotated[str, Form()],
):
    if not auth.verify_password(password):
        return _templates(request).TemplateResponse(
            request,
            "admin_login.html",
            {"error": "wrong password", **analytics_context(get_settings())},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    response = RedirectResponse("/admin", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        auth.SESSION_COOKIE_NAME,
        auth.issue_session(),
        httponly=True,
        samesite="lax",
        secure=False,  # docker-compose ships over plain HTTP behind the operator's reverse proxy.
    )
    return response


@router.post("/admin/logout")
def admin_logout():
    response = RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(auth.SESSION_COOKIE_NAME)
    return response


@router.post("/admin/upload-yaml")
def parse_yaml(
    yaml_text: Annotated[str, Form(alias="yaml")],
    _: auth.SessionInfo = Depends(auth.require_admin),
) -> JSONResponse:
    try:
        raw = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise HTTPException(400, f"invalid YAML: {exc}")
    try:
        survey = Survey.model_validate(raw)
    except ValidationError as exc:
        raise HTTPException(400, f"invalid survey: {exc.errors()}")
    return JSONResponse({"survey": survey.model_dump(mode="json")})


@router.post("/api/surveys")
async def create_or_update_survey(
    yaml_text: Annotated[str, Form(alias="yaml")],
    images: Annotated[list[UploadFile], File()],
    overwrite: Annotated[bool, Form()] = False,
    _: auth.SessionInfo = Depends(auth.require_admin),
) -> JSONResponse:
    try:
        raw = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise HTTPException(400, f"invalid YAML: {exc}")
    try:
        survey = Survey.model_validate(raw)
    except ValidationError as exc:
        raise HTTPException(400, f"invalid survey: {exc.errors()}")

    image_blobs: dict[str, bytes] = {}
    for upload in images:
        if not upload.filename:
            continue
        image_blobs[upload.filename] = await upload.read()

    settings = get_settings()
    try:
        storage.write_survey(settings.data_dir, survey, image_blobs, overwrite=overwrite)
    except storage.SurveyConflict as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    except storage.MissingPageImage as exc:
        raise HTTPException(400, str(exc))
    return JSONResponse({"slug": survey.slug}, status_code=status.HTTP_201_CREATED)


@router.delete("/api/surveys/{slug}")
def delete_survey(
    slug: str,
    _: auth.SessionInfo = Depends(auth.require_admin),
):
    settings = get_settings()
    try:
        storage.delete_survey(settings.data_dir, slug)
    except storage.SurveyNotFound:
        raise HTTPException(404, f"survey {slug!r} not found")
    return JSONResponse({"slug": slug, "deleted": True})


@router.post("/api/surveys/{slug}/duplicate")
def duplicate_survey(
    slug: str,
    new_slug: Annotated[str, Form()],
    _: auth.SessionInfo = Depends(auth.require_admin),
):
    settings = get_settings()
    try:
        survey = storage.duplicate_survey(settings.data_dir, slug, new_slug)
    except storage.SurveyNotFound:
        raise HTTPException(404, f"survey {slug!r} not found")
    except storage.SurveyConflict as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    except ValidationError as exc:
        raise HTTPException(400, f"invalid destination slug: {exc.errors()}")
    return JSONResponse({"slug": survey.slug}, status_code=status.HTTP_201_CREATED)


@router.post("/api/surveys/{slug}/rename")
def rename_survey(
    slug: str,
    new_slug: Annotated[str, Form()],
    _: auth.SessionInfo = Depends(auth.require_admin),
):
    settings = get_settings()
    try:
        survey = storage.rename_survey(settings.data_dir, slug, new_slug)
    except storage.SurveyNotFound:
        raise HTTPException(404, f"survey {slug!r} not found")
    except storage.SurveyConflict as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    except ValidationError as exc:
        raise HTTPException(400, f"invalid destination slug: {exc.errors()}")
    return JSONResponse({"slug": survey.slug})
