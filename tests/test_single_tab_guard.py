from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize("path", ["/", "/about", "/test", "/admin"])
def test_guard_script_is_loaded_on_every_page(client: TestClient, path: str):
    response = client.get(path, follow_redirects=True)
    assert response.status_code == 200
    assert '/static/app/single-tab-guard.js' in response.text


def test_guard_static_asset_is_served(client: TestClient):
    response = client.get("/static/app/single-tab-guard.js")
    assert response.status_code == 200
    assert "navigator.locks" in response.text
