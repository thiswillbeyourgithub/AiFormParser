from __future__ import annotations

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import auth
from app.config import get_settings


def test_verify_password_matches(settings_env: Path):
    assert auth.verify_password("hunter2") is True
    assert auth.verify_password("wrong") is False


def test_session_round_trip(settings_env: Path):
    cookie = auth.issue_session()
    info = auth.read_session(cookie)
    assert info is not None
    assert info.user_id == "admin"


def test_read_session_rejects_tampered(settings_env: Path):
    cookie = auth.issue_session()
    tampered = cookie[:-2] + ("AA" if cookie[-2:] != "AA" else "BB")
    assert auth.read_session(tampered) is None


def test_read_session_rejects_empty(settings_env: Path):
    assert auth.read_session(None) is None
    assert auth.read_session("") is None


def _make_app() -> FastAPI:
    app = FastAPI()

    @app.get("/protected")
    def protected(info: auth.SessionInfo = Depends(auth.require_admin)):
        return {"user_id": info.user_id}

    return app


def test_require_admin_rejects_without_cookie(settings_env: Path):
    client = TestClient(_make_app())
    response = client.get("/protected")
    assert response.status_code == 401


def test_require_admin_accepts_valid_cookie(settings_env: Path):
    client = TestClient(_make_app())
    cookie = auth.issue_session()
    client.cookies.set(auth.SESSION_COOKIE_NAME, cookie)
    response = client.get("/protected")
    assert response.status_code == 200
    assert response.json() == {"user_id": "admin"}


def test_require_admin_rejects_tampered_cookie(settings_env: Path):
    client = TestClient(_make_app())
    cookie = auth.issue_session()
    tampered = cookie[:-2] + ("AA" if cookie[-2:] != "AA" else "BB")
    client.cookies.set(auth.SESSION_COOKIE_NAME, tampered)
    response = client.get("/protected")
    assert response.status_code == 401
