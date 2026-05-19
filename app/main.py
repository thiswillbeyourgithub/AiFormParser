from __future__ import annotations

import logging
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

from app import model_split, storage
from app.config import get_settings
from app.routes import about as about_routes
from app.routes import admin as admin_routes
from app.routes import api as api_routes
from app.routes import test as test_routes
from app.routes import user as user_routes

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("app")

_APP_DIR = Path(__file__).resolve().parent
_TEMPLATES_DIR = _APP_DIR / "templates"
_STATIC_DIR = _APP_DIR / "static"


class CrossOriginIsolationMiddleware(BaseHTTPMiddleware):
    # Enables `crossOriginIsolated` so SharedArrayBuffer and WASM threads work
    # for tesseract.js and wllama. `credentialless` lets cross-origin
    # subresources (e.g. the Umami script) load without needing CORP headers
    # from those origins; the project is Chromium-only so this is safe.
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Embedder-Policy"] = "credentialless"
        return response


def create_app() -> FastAPI:
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.resolved_models_dir.mkdir(parents=True, exist_ok=True)

    app = FastAPI(title="AiFormParser", docs_url=None, redoc_url=None)
    app.add_middleware(CrossOriginIsolationMiddleware)
    app.state.templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

    app.mount(
        "/static/models",
        StaticFiles(directory=str(settings.resolved_models_dir)),
        name="models",
    )
    app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")

    app.include_router(api_routes.router)
    app.include_router(admin_routes.router)
    app.include_router(test_routes.router)
    app.include_router(about_routes.router)
    app.include_router(user_routes.router)

    log.info("AiFormParser started: data_dir=%s models_dir=%s", settings.data_dir, settings.resolved_models_dir)

    models_dir = settings.resolved_models_dir
    model_split.split_oversized_models(models_dir)
    missing_mmproj = [e.name for e in storage.list_models(models_dir) if e.mmproj_path is None]
    if missing_mmproj:
        log.warning(
            "No mmproj GGUF found alongside %d self-hosted model(s) in %s (%s). "
            "Multimodal inference will fail. Place a *mmproj*.gguf next to each model file "
            "in its subdirectory.",
            len(missing_mmproj),
            models_dir,
            ", ".join(missing_mmproj),
        )
    return app


app = create_app()
