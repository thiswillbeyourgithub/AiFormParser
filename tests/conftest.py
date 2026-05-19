from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def settings_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "models").mkdir()
    monkeypatch.setenv("ADMIN_PASSWORD", "hunter2")
    monkeypatch.setenv("SESSION_SECRET", "test-secret-please-rotate")
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    monkeypatch.setenv("MODELS_DIR", str(data_dir / "models"))
    # The Settings object is cached; reset it so each test reads its own env.
    from app.config import get_settings

    get_settings.cache_clear()
    yield data_dir
    get_settings.cache_clear()


@pytest.fixture
def client(settings_env: Path) -> TestClient:
    # Import after env is set; main calls get_settings at import time.
    from app.main import create_app

    return TestClient(create_app())
