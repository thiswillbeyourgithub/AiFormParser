from __future__ import annotations

from fastapi.testclient import TestClient


def test_response_sets_cross_origin_isolation_headers(client: TestClient):
    # Required so the browser exposes SharedArrayBuffer + WASM threads to
    # tesseract.js and wllama (see app/static/app/smoke.js).
    response = client.get("/about")
    assert response.status_code == 200
    assert response.headers["cross-origin-opener-policy"] == "same-origin"
    assert response.headers["cross-origin-embedder-policy"] == "credentialless"


def test_static_assets_also_get_isolation_headers(client: TestClient):
    response = client.get("/static/app/smoke.js")
    assert response.status_code == 200
    assert response.headers["cross-origin-opener-policy"] == "same-origin"
    assert response.headers["cross-origin-embedder-policy"] == "credentialless"
