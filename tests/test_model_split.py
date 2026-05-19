from __future__ import annotations

import logging
import subprocess
from pathlib import Path

import pytest

from app import model_split


def _write(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        f.truncate(size)


def test_noop_when_models_dir_missing(tmp_path: Path):
    # Should be silent when MODELS_DIR doesn't exist yet on first boot.
    model_split.split_oversized_models(tmp_path / "missing")


def test_noop_when_all_files_under_threshold(tmp_path: Path, monkeypatch):
    _write(tmp_path / "qwen" / "qwen.gguf", 100)
    called: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        called.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)
    assert called == []


def test_warns_when_binary_missing(tmp_path: Path, monkeypatch, caplog):
    _write(tmp_path / "qwen" / "qwen.gguf", 2048)

    monkeypatch.setattr(model_split.shutil, "which", lambda _: None)
    caplog.set_level(logging.WARNING, logger="app.model_split")

    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)
    # The oversized file is still on disk because we couldn't split it.
    assert (tmp_path / "qwen" / "qwen.gguf").is_file()
    assert any("not found on PATH" in r.message for r in caplog.records)


def test_skips_mmproj_above_threshold(tmp_path: Path, monkeypatch, caplog):
    _write(tmp_path / "qwen" / "mmproj-F16.gguf", 4096)
    _write(tmp_path / "qwen" / "qwen.gguf", 100)

    calls: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(model_split.shutil, "which", lambda _: "/usr/bin/llama-gguf-split")
    monkeypatch.setattr(subprocess, "run", fake_run)
    caplog.set_level(logging.WARNING, logger="app.model_split")

    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)
    assert calls == []
    assert any("Skipping split for mmproj" in r.message for r in caplog.records)
    assert (tmp_path / "qwen" / "mmproj-F16.gguf").is_file()


def test_skips_existing_shards(tmp_path: Path, monkeypatch):
    _write(tmp_path / "qwen" / "qwen-00001-of-00002.gguf", 4096)
    _write(tmp_path / "qwen" / "qwen-00002-of-00002.gguf", 4096)

    calls: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(model_split.shutil, "which", lambda _: "/usr/bin/llama-gguf-split")
    monkeypatch.setattr(subprocess, "run", fake_run)

    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)
    assert calls == []


def test_splits_and_deletes_original(tmp_path: Path, monkeypatch, caplog):
    target = tmp_path / "qwen" / "qwen.gguf"
    _write(target, 4096)

    def fake_run(cmd, **kwargs):
        # cmd is [binary, "--split-max-size", "512M", src, prefix]
        prefix = Path(cmd[-1])
        for i in (1, 2):
            _write(prefix.with_name(f"{prefix.name}-{i:05d}-of-00002.gguf"), 2048)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(model_split.shutil, "which", lambda _: "/usr/bin/llama-gguf-split")
    monkeypatch.setattr(subprocess, "run", fake_run)
    caplog.set_level(logging.INFO, logger="app.model_split")

    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)

    assert not target.exists()
    assert (tmp_path / "qwen" / "qwen-00001-of-00002.gguf").is_file()
    assert (tmp_path / "qwen" / "qwen-00002-of-00002.gguf").is_file()


def test_keeps_original_when_split_command_fails(tmp_path: Path, monkeypatch, caplog):
    target = tmp_path / "qwen" / "qwen.gguf"
    _write(target, 4096)

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, 1, "", "boom")

    monkeypatch.setattr(model_split.shutil, "which", lambda _: "/usr/bin/llama-gguf-split")
    monkeypatch.setattr(subprocess, "run", fake_run)
    caplog.set_level(logging.ERROR, logger="app.model_split")

    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)

    assert target.is_file()
    assert any("llama-gguf-split failed" in r.message for r in caplog.records)


def test_keeps_original_when_no_shards_were_produced(tmp_path: Path, monkeypatch, caplog):
    target = tmp_path / "qwen" / "qwen.gguf"
    _write(target, 4096)

    def fake_run(cmd, **kwargs):
        # Pretend success but produce nothing on disk.
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(model_split.shutil, "which", lambda _: "/usr/bin/llama-gguf-split")
    monkeypatch.setattr(subprocess, "run", fake_run)
    caplog.set_level(logging.ERROR, logger="app.model_split")

    model_split.split_oversized_models(tmp_path, threshold_bytes=1024)

    assert target.is_file()
    assert any("no shards were produced" in r.message for r in caplog.records)
