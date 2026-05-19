from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.analytics import analytics_context
from app.config import get_settings

router = APIRouter(tags=["test"])


@router.get("/test", response_class=HTMLResponse)
def test_page(request: Request):
    settings = get_settings()
    return request.app.state.templates.TemplateResponse(
        request,
        "test.html",
        analytics_context(settings),
    )
