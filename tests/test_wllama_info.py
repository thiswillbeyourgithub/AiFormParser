import json
from pathlib import Path

from app.wllama_info import read_wllama_build_info


def test_returns_none_when_file_missing(tmp_path: Path):
    assert read_wllama_build_info(tmp_path / "missing.json") == (None, None)


def test_reads_version_and_commit(tmp_path: Path):
    p = tmp_path / "BUILD_INFO.json"
    p.write_text(json.dumps({"version": "2.5.0", "commit": "abc1234"}))
    assert read_wllama_build_info(p) == ("2.5.0", "abc1234")


def test_empty_fields_become_none(tmp_path: Path):
    p = tmp_path / "BUILD_INFO.json"
    p.write_text(json.dumps({"version": "2.5.0", "commit": ""}))
    assert read_wllama_build_info(p) == ("2.5.0", None)


def test_invalid_json_returns_none(tmp_path: Path):
    p = tmp_path / "BUILD_INFO.json"
    p.write_text("not json")
    assert read_wllama_build_info(p) == (None, None)


def test_non_dict_payload_returns_none(tmp_path: Path):
    p = tmp_path / "BUILD_INFO.json"
    p.write_text(json.dumps(["2.5.0", "abc1234"]))
    assert read_wllama_build_info(p) == (None, None)
