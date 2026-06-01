from __future__ import annotations

import datetime as _dt
import hashlib
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.analytics import analytics_context
from app.config import get_settings
from app.version import APP_VERSION

router = APIRouter(tags=["about"])

_VENDOR_ROOT = Path(__file__).resolve().parents[1] / "static" / "vendor"

# Fingerprinted on the about page so the operator can confirm what is
# actually being served (e.g. distinguish the published prebuilt wllama
# from a locally rebuilt wasm produced by scripts/build-wllama.sh).
# Upstream version pins live in app/static/vendor/VERSIONS.md.
_VENDOR_FILES: list[tuple[str, str]] = [
    ("pdf.js", "pdfjs/pdf.min.mjs"),
    ("pdf.js worker", "pdfjs/pdf.worker.min.mjs"),
    ("tesseract.js", "tesseract/tesseract.esm.min.js"),
    ("tesseract.js worker", "tesseract/worker.min.js"),
    ("tesseract-core relaxed-simd", "tesseract/tesseract-core-relaxedsimd-lstm.wasm"),
    ("tesseract-core simd", "tesseract/tesseract-core-simd-lstm.wasm"),
    ("tesseract-core plain", "tesseract/tesseract-core-lstm.wasm"),
    ("tessdata eng", "tesseract-lang/eng.traineddata.gz"),
    ("tessdata fra", "tesseract-lang/fra.traineddata.gz"),
    ("js-yaml", "js-yaml/js-yaml.mjs"),
    ("xlsx (SheetJS)", "xlsx/xlsx.mini.min.js"),
    ("wllama (JS)", "wllama/index.min.js"),
    ("wllama (wasm)", "wllama/multi-thread/wllama.wasm"),
]


@lru_cache(maxsize=256)
def _sha256(path_str: str, mtime_ns: int, size: int) -> str:
    h = hashlib.sha256()
    with open(path_str, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _human_size(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KiB"
    return f"{n / (1024 * 1024):.2f} MiB"


def _vendor_fingerprints() -> list[dict]:
    out: list[dict] = []
    for label, rel in _VENDOR_FILES:
        p = _VENDOR_ROOT / rel
        try:
            st = p.stat()
        except FileNotFoundError:
            out.append({"label": label, "path": rel, "exists": False})
            continue
        sha = _sha256(str(p), st.st_mtime_ns, st.st_size)
        mtime = _dt.datetime.fromtimestamp(st.st_mtime, tz=_dt.timezone.utc)
        out.append(
            {
                "label": label,
                "path": rel,
                "exists": True,
                "size_h": _human_size(st.st_size),
                "mtime": mtime.strftime("%Y-%m-%d %H:%M UTC"),
                "sha256_short": sha[:12],
                "sha256": sha,
            }
        )
    return out


@router.get("/about", response_class=HTMLResponse)
def about_page(request: Request):
    settings = get_settings()
    ctx = analytics_context(settings)
    ctx["app_version"] = APP_VERSION
    ctx["vendor_fingerprints"] = _vendor_fingerprints()
    return request.app.state.templates.TemplateResponse(
        request,
        "about.html",
        ctx,
    )
