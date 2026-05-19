from __future__ import annotations

from fastapi.testclient import TestClient


def test_about_page_is_public(client: TestClient):
    response = client.get("/about")
    assert response.status_code == 200
    body = response.text
    assert "Browser compatibility" in body
    assert "Brave" in body
    assert "Chromium" in body
    assert "Firefox" in body


def test_nav_links_about_page(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert 'href="/about"' in response.text


def test_about_page_lists_vendor_fingerprints(client: TestClient):
    response = client.get("/about")
    assert response.status_code == 200
    body = response.text
    assert "Vendored libraries" in body
    assert "wllama/multi-thread/wllama.wasm" in body
    assert "sha256" in body
