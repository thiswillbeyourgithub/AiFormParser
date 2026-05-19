from __future__ import annotations

import hmac
from dataclasses import dataclass
from typing import Annotated

from fastapi import Cookie, HTTPException, status
from itsdangerous import BadSignature, URLSafeSerializer

from app.config import Settings, get_settings

SESSION_COOKIE_NAME = "afp_session"
SESSION_SALT = "afp-session-v1"

# TODO: when we add per-user accounts, extend SessionInfo with the real user id
# and swap verify_password for a per-user lookup. The route layer should not
# need to change.


@dataclass(frozen=True)
class SessionInfo:
    user_id: str


def _serializer(settings: Settings) -> URLSafeSerializer:
    return URLSafeSerializer(settings.session_secret, salt=SESSION_SALT)


def verify_password(plain: str, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    return hmac.compare_digest(plain.encode("utf-8"), settings.admin_password.encode("utf-8"))


def issue_session(settings: Settings | None = None, *, user_id: str = "admin") -> str:
    settings = settings or get_settings()
    return _serializer(settings).dumps({"u": user_id})


def read_session(cookie: str | None, settings: Settings | None = None) -> SessionInfo | None:
    if not cookie:
        return None
    settings = settings or get_settings()
    try:
        payload = _serializer(settings).loads(cookie)
    except BadSignature:
        return None
    user_id = payload.get("u") if isinstance(payload, dict) else None
    if not user_id:
        return None
    return SessionInfo(user_id=user_id)


def require_admin(
    afp_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> SessionInfo:
    info = read_session(afp_session)
    if info is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="admin login required")
    return info
