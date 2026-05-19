from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.analytics import analytics_context
from app.config import get_settings

router = APIRouter(tags=["user"])


@router.get("/", response_class=HTMLResponse)
def user_page(request: Request):
    settings = get_settings()
    return request.app.state.templates.TemplateResponse(
        request,
        "user.html",
        analytics_context(settings),
    )
