from __future__ import annotations

import html
import logging
from functools import lru_cache

from app.config import Settings

log = logging.getLogger("app.analytics")

_CLOUD_SCRIPT_URL = "https://cloud.umami.is/script.js"


@lru_cache(maxsize=8)
def _build_tag(url: str | None, website_id: str | None, do_not_track: bool) -> str:
    if not website_id:
        log.debug("Umami analytics not configured (UMAMI_WEBSITE_ID unset)")
        return ""
    script_url = f"{url.rstrip('/')}/script.js" if url else _CLOUD_SCRIPT_URL
    dnt_value = "true" if do_not_track else "false"
    tag = (
        f'<script defer src="{html.escape(script_url, quote=True)}" '
        f'data-website-id="{html.escape(website_id, quote=True)}" '
        f'data-do-not-track="{dnt_value}"></script>'
    )
    log.info(
        "Umami analytics enabled: src=%s website_id=%s do_not_track=%s",
        script_url,
        website_id,
        dnt_value,
    )
    return tag


def umami_script_tag(settings: Settings) -> str:
    return _build_tag(settings.umami_url, settings.umami_website_id, settings.umami_do_not_track)


def analytics_context(settings: Settings) -> dict[str, str]:
    return {"umami_script": umami_script_tag(settings)}
