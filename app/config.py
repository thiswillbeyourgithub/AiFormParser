from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    admin_password: str = Field(alias="ADMIN_PASSWORD")
    session_secret: str = Field(alias="SESSION_SECRET")
    data_dir: Path = Field(default=Path("/data"), alias="DATA_DIR")
    models_dir: Path | None = Field(default=None, alias="MODELS_DIR")
    llm_timeout_seconds: int = Field(default=300, alias="LLM_TIMEOUT_SECONDS")

    umami_url: str | None = Field(default=None, alias="UMAMI_URL")
    umami_website_id: str | None = Field(default=None, alias="UMAMI_WEBSITE_ID")
    umami_do_not_track: bool = Field(default=True, alias="UMAMI_DO_NOT_TRACK")

    @property
    def resolved_models_dir(self) -> Path:
        return self.models_dir if self.models_dir is not None else (self.data_dir / "models")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
