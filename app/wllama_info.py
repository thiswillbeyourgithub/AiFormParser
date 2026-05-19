from __future__ import annotations

import json
from pathlib import Path

# Written by scripts/build-wllama.sh (local builds) or scripts/update-vendor.sh
# (npm releases). Local builds populate both fields; npm releases leave
# `commit` empty because the tarball does not carry a git SHA.
BUILD_INFO_PATH = (
    Path(__file__).parent / "static" / "vendor" / "wllama" / "BUILD_INFO.json"
)


def read_wllama_build_info(
    path: Path = BUILD_INFO_PATH,
) -> tuple[str | None, str | None]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None, None
    if not isinstance(data, dict):
        return None, None
    version = data.get("version") or None
    commit = data.get("commit") or None
    return version, commit
