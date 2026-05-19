from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _fresh_tag(monkeypatch: pytest.MonkeyPatch, **env: str) -> str:
    """Build the Umami tag from a clean env, bypassing all module caches."""
    from app import analytics
    from app.config import get_settings

    for key in ("UMAMI_URL", "UMAMI_WEBSITE_ID", "UMAMI_DO_NOT_TRACK"):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    get_settings.cache_clear()
    analytics._build_tag.cache_clear()
    return analytics.umami_script_tag(get_settings())


def test_tag_empty_when_website_id_unset(settings_env: Path, monkeypatch: pytest.MonkeyPatch):
    assert _fresh_tag(monkeypatch) == ""


def test_tag_uses_cloud_endpoint_with_only_website_id(
    settings_env: Path, monkeypatch: pytest.MonkeyPatch
):
    tag = _fresh_tag(monkeypatch, UMAMI_WEBSITE_ID="site-abc")
    assert 'src="https://cloud.umami.is/script.js"' in tag
    assert 'data-website-id="site-abc"' in tag
    assert 'data-do-not-track="true"' in tag


def test_tag_uses_self_hosted_url(settings_env: Path, monkeypatch: pytest.MonkeyPatch):
    tag = _fresh_tag(
        monkeypatch,
        UMAMI_URL="https://analytics.example.com",
        UMAMI_WEBSITE_ID="site-abc",
    )
    assert 'src="https://analytics.example.com/script.js"' in tag


def test_tag_strips_trailing_slash_from_url(settings_env: Path, monkeypatch: pytest.MonkeyPatch):
    tag = _fresh_tag(
        monkeypatch,
        UMAMI_URL="https://analytics.example.com/",
        UMAMI_WEBSITE_ID="site-abc",
    )
    assert 'src="https://analytics.example.com/script.js"' in tag


def test_tag_honors_do_not_track_false(settings_env: Path, monkeypatch: pytest.MonkeyPatch):
    tag = _fresh_tag(
        monkeypatch,
        UMAMI_WEBSITE_ID="site-abc",
        UMAMI_DO_NOT_TRACK="false",
    )
    assert 'data-do-not-track="false"' in tag


def test_tag_escapes_html_in_values(settings_env: Path, monkeypatch: pytest.MonkeyPatch):
    tag = _fresh_tag(
        monkeypatch,
        UMAMI_URL='https://x"><script>alert(1)</script>',
        UMAMI_WEBSITE_ID='id"><b>',
    )
    assert "<script>alert" not in tag
    assert "&lt;" in tag or "&quot;" in tag


def _build_client(monkeypatch: pytest.MonkeyPatch, **env: str) -> TestClient:
    from app import analytics
    from app.config import get_settings
    from app.main import create_app

    for key in ("UMAMI_URL", "UMAMI_WEBSITE_ID", "UMAMI_DO_NOT_TRACK"):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    analytics._build_tag.cache_clear()
    return TestClient(create_app())


@pytest.mark.parametrize("path", ["/", "/admin/login"])
def test_routes_omit_tag_when_disabled(
    settings_env: Path, monkeypatch: pytest.MonkeyPatch, path: str
):
    client = _build_client(monkeypatch)
    body = client.get(path).text
    assert "data-website-id" not in body
    assert "umami" not in body.lower()


@pytest.mark.parametrize("path", ["/", "/admin/login"])
def test_routes_emit_tag_when_enabled(
    settings_env: Path, monkeypatch: pytest.MonkeyPatch, path: str
):
    client = _build_client(monkeypatch, UMAMI_WEBSITE_ID="site-abc")
    body = client.get(path).text
    assert 'data-website-id="site-abc"' in body
    assert "cloud.umami.is/script.js" in body


def test_admin_route_emits_tag_when_logged_in(
    settings_env: Path, monkeypatch: pytest.MonkeyPatch
):
    from app import auth

    client = _build_client(monkeypatch, UMAMI_WEBSITE_ID="site-abc")
    client.cookies.set(auth.SESSION_COOKIE_NAME, auth.issue_session())
    body = client.get("/admin").text
    assert 'data-website-id="site-abc"' in body
