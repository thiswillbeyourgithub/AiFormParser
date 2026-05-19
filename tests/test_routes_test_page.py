from __future__ import annotations

from fastapi.testclient import TestClient


def test_test_page_is_public(client: TestClient):
    response = client.get("/test")
    assert response.status_code == 200
    body = response.text
    # Sanity checks: the relocated capability + smoke section and the new
    # LLM diagnostic both render on the page.
    assert "Client-side capability check" in body
    assert 'id="capability-banner"' in body
    assert 'id="smoke-run"' in body
    assert "LLM diagnostic" in body
    assert 'id="llm-diag-run-all"' in body
    assert 'id="llm-diag-model-opts"' in body
    assert 'id="llm-diag-sampling-opts"' in body
    assert 'id="llm-diag-steps"' in body
    assert 'id="llm-diag-model"' in body
    assert 'src="/static/app/test.js"' in body
    # Benchmarking suite: thread x compute-offload sweep.
    assert "LLM benchmarking" in body
    assert 'id="llm-bench-run"' in body
    assert 'id="llm-bench-tbody"' in body


def test_nav_links_test_page(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert 'href="/test"' in response.text


def test_admin_page_no_longer_has_smoke_section(client: TestClient):
    # /admin redirects unauthenticated, so check the login page is rendered
    # correctly and assert the smoke widgets are gone from the authed page
    # by using the underlying template render path. Easiest: log in.
    from app import auth

    client.cookies.set(auth.SESSION_COOKIE_NAME, auth.issue_session())
    response = client.get("/admin")
    assert response.status_code == 200
    body = response.text
    assert 'id="smoke-run"' not in body
    assert "Client-side capability check" not in body


def test_researcher_page_keeps_one_liner_banner(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    body = response.text
    assert 'id="capability-banner"' in body
    # The full smoke widget is gone but a link to /test remains.
    assert 'id="smoke-run"' not in body
    assert 'href="/test"' in body
