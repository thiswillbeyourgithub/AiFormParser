"""Auto-split oversized GGUF weights at startup.

Per the wllama README, local model files should be split into chunks of at
most 512MB. Two things go wrong without splitting:

1. Browsers cap an ArrayBuffer at 2GB, so a single GGUF above that limit
   cannot be loaded at all.
2. Below 2GB, single-file downloads can't parallelise and a corrupt byte
   forces a full retry. wllama loads chunked weights in parallel from the
   first shard URL.

This module scans ``MODELS_DIR`` once at FastAPI startup, runs
``llama-gguf-split --split-max-size 512M`` on every oversized non-mmproj
GGUF, and deletes the original on success. Already-split shards (matching
``-NNNNN-of-NNNNN.gguf``) are left alone. Multimodal projector files are
not split: we have not yet confirmed wllama loads split mmproj weights
correctly (see CLAUDE.md).
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from app.storage import SPLIT_SUFFIX_RE, _is_mmproj

log = logging.getLogger("app.model_split")

SPLIT_THRESHOLD_BYTES = 512 * 1024 * 1024
SPLIT_MAX_SIZE_ARG = "512M"
SPLIT_BINARY = "llama-gguf-split"


def _is_split_shard(name: str) -> bool:
    return SPLIT_SUFFIX_RE.search(name) is not None


def _iter_candidate_ggufs(models_dir: Path):
    for path in models_dir.rglob("*.gguf"):
        if path.is_file():
            yield path


def split_oversized_models(
    models_dir: Path,
    *,
    binary: str = SPLIT_BINARY,
    threshold_bytes: int = SPLIT_THRESHOLD_BYTES,
) -> None:
    """Split any non-mmproj GGUF above ``threshold_bytes`` in place.

    Idempotent: previously split shards are skipped; oversized mmproj files
    are warned about but not modified.
    """
    if not models_dir.is_dir():
        return

    binary_path = shutil.which(binary)
    pending: list[Path] = []
    for path in _iter_candidate_ggufs(models_dir):
        if _is_split_shard(path.name):
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size <= threshold_bytes:
            continue
        if _is_mmproj(path.name):
            log.warning(
                "Skipping split for mmproj projector %s (%.1f MiB > %d MiB). "
                "wllama support for split mmproj has not been verified; "
                "consider using a smaller projector quant.",
                path,
                size / (1024 * 1024),
                threshold_bytes // (1024 * 1024),
            )
            continue
        pending.append(path)

    if not pending:
        return

    if binary_path is None:
        log.warning(
            "%s not found on PATH; cannot auto-split %d oversized GGUF(s): %s. "
            "Add it to the image or split the files manually with "
            "`llama-gguf-split --split-max-size %s <file> <prefix>`.",
            binary,
            len(pending),
            ", ".join(str(p) for p in pending),
            SPLIT_MAX_SIZE_ARG,
        )
        return

    for path in pending:
        _split_one(path, binary_path)


def _split_one(path: Path, binary_path: str) -> None:
    prefix = path.with_suffix("")  # strips the trailing .gguf
    log.info(
        "Splitting %s into %s chunks (prefix %s)",
        path,
        SPLIT_MAX_SIZE_ARG,
        prefix.name,
    )
    try:
        result = subprocess.run(
            [binary_path, "--split-max-size", SPLIT_MAX_SIZE_ARG, str(path), str(prefix)],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError as exc:
        log.error("Failed to exec %s: %s", binary_path, exc)
        return

    if result.returncode != 0:
        log.error(
            "llama-gguf-split failed for %s (exit %d): %s",
            path,
            result.returncode,
            (result.stderr or result.stdout).strip(),
        )
        return

    shards = sorted(path.parent.glob(f"{prefix.name}-?????-of-?????.gguf"))
    if not shards:
        log.error(
            "llama-gguf-split reported success for %s but no shards were produced; "
            "leaving the original in place.",
            path,
        )
        return

    try:
        path.unlink()
    except OSError as exc:
        log.error("Split succeeded but could not delete original %s: %s", path, exc)
        return

    log.info("Split %s into %d shard(s); original removed.", path.name, len(shards))
