import hashlib
from datetime import datetime, timezone
from pathlib import Path

import pytest

import yaml

from app import storage
from app.schema import Box, Page, Survey
from app.version import APP_VERSION


def _make_survey(slug: str = "demo", header: str = "Q1") -> Survey:
    return Survey(
        name="Demo",
        slug=slug,
        created_at=datetime(2026, 5, 20, 10, 0, tzinfo=timezone.utc),
        pages=[
            Page(
                index=0,
                image="page-1.png",
                width=100,
                height=100,
                rasterised_dpi=200,
                boxes=[
                    Box(
                        id="B1",
                        header=header,
                        description="desc",
                        type="text",
                        bbox=(0, 0, 10, 10),
                    )
                ],
            )
        ],
    )


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    return tmp_path


def test_write_and_read_round_trip(data_dir: Path):
    survey = _make_survey()
    storage.write_survey(data_dir, survey, {"page-1.png": b"PNGDATA"})

    assert (data_dir / "demo" / "survey.yaml").is_file()
    assert (data_dir / "demo" / "page-1.png").read_bytes() == b"PNGDATA"

    loaded = storage.read_survey(data_dir, "demo")
    assert loaded.slug == "demo"
    assert loaded.pages[0].boxes[0].header == "Q1"


def test_write_refuses_missing_image(data_dir: Path):
    survey = _make_survey()
    with pytest.raises(storage.MissingPageImage):
        storage.write_survey(data_dir, survey, {})


def test_write_refuses_overwrite_by_default(data_dir: Path):
    survey = _make_survey()
    storage.write_survey(data_dir, survey, {"page-1.png": b"a"})
    with pytest.raises(storage.SurveyConflict):
        storage.write_survey(data_dir, survey, {"page-1.png": b"b"})


def test_write_overwrite_replaces_existing(data_dir: Path):
    survey = _make_survey()
    storage.write_survey(data_dir, survey, {"page-1.png": b"a"})
    storage.write_survey(data_dir, survey, {"page-1.png": b"b"}, overwrite=True)
    assert (data_dir / "demo" / "page-1.png").read_bytes() == b"b"


def test_list_surveys_returns_summaries(data_dir: Path):
    storage.write_survey(data_dir, _make_survey("a-survey", header="Q1"), {"page-1.png": b"x"})
    storage.write_survey(data_dir, _make_survey("b-survey", header="Q2"), {"page-1.png": b"y"})
    summaries = storage.list_surveys(data_dir)
    assert [s.slug for s in summaries] == ["a-survey", "b-survey"]
    assert summaries[0].page_count == 1


def test_list_surveys_skips_non_survey_dirs(data_dir: Path):
    (data_dir / "models").mkdir()
    (data_dir / "models" / "weights.gguf").write_bytes(b"x")
    assert storage.list_surveys(data_dir) == []


def test_delete_survey(data_dir: Path):
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": b"x"})
    storage.delete_survey(data_dir, "demo")
    assert not (data_dir / "demo").exists()
    with pytest.raises(storage.SurveyNotFound):
        storage.delete_survey(data_dir, "demo")


def test_duplicate_survey(data_dir: Path):
    storage.write_survey(data_dir, _make_survey("source-v1"), {"page-1.png": b"x"})
    dup = storage.duplicate_survey(data_dir, "source-v1", "source-v2")
    assert dup.slug == "source-v2"
    assert (data_dir / "source-v2" / "page-1.png").read_bytes() == b"x"
    loaded = storage.read_survey(data_dir, "source-v2")
    assert loaded.slug == "source-v2"


def test_duplicate_refuses_collision(data_dir: Path):
    storage.write_survey(data_dir, _make_survey("a"), {"page-1.png": b"x"})
    storage.write_survey(data_dir, _make_survey("b", header="Q9"), {"page-1.png": b"y"})
    with pytest.raises(storage.SurveyConflict):
        storage.duplicate_survey(data_dir, "a", "b")


def test_rename_survey(data_dir: Path):
    storage.write_survey(data_dir, _make_survey("old-slug"), {"page-1.png": b"x"})
    renamed = storage.rename_survey(data_dir, "old-slug", "new-slug")
    assert renamed.slug == "new-slug"
    assert not (data_dir / "old-slug").exists()
    assert storage.read_survey(data_dir, "new-slug").slug == "new-slug"


def test_rename_refuses_collision(data_dir: Path):
    storage.write_survey(data_dir, _make_survey("a"), {"page-1.png": b"x"})
    storage.write_survey(data_dir, _make_survey("b", header="Q9"), {"page-1.png": b"y"})
    with pytest.raises(storage.SurveyConflict):
        storage.rename_survey(data_dir, "a", "b")


def _read_yaml(data_dir: Path, slug: str) -> dict:
    return yaml.safe_load((data_dir / slug / "survey.yaml").read_text(encoding="utf-8"))


def test_write_stamps_current_app_version(data_dir: Path):
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": b"x"})
    assert _read_yaml(data_dir, "demo")["app_version"] == APP_VERSION


def test_overwrite_restamps_current_app_version(data_dir: Path):
    survey = _make_survey()
    storage.write_survey(data_dir, survey, {"page-1.png": b"x"})
    stale = survey.model_copy(update={"app_version": "0.0.0-stale"})
    storage.write_survey(data_dir, stale, {"page-1.png": b"y"}, overwrite=True)
    assert _read_yaml(data_dir, "demo")["app_version"] == APP_VERSION


def test_duplicate_and_rename_stamp_current_app_version(data_dir: Path):
    storage.write_survey(data_dir, _make_survey("src"), {"page-1.png": b"x"})
    storage.duplicate_survey(data_dir, "src", "dup")
    storage.rename_survey(data_dir, "dup", "renamed")
    assert _read_yaml(data_dir, "renamed")["app_version"] == APP_VERSION


def test_write_stamps_wllama_build_info(data_dir: Path, monkeypatch):
    monkeypatch.setattr(
        storage, "read_wllama_build_info", lambda: ("2.5.0", "abc1234")
    )
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": b"x"})
    raw = _read_yaml(data_dir, "demo")
    assert raw["wllama_version"] == "2.5.0"
    assert raw["wllama_commit"] == "abc1234"


def test_write_stamps_wllama_build_info_when_missing(data_dir: Path, monkeypatch):
    monkeypatch.setattr(storage, "read_wllama_build_info", lambda: (None, None))
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": b"x"})
    raw = _read_yaml(data_dir, "demo")
    assert raw["wllama_version"] is None
    assert raw["wllama_commit"] is None


def test_overwrite_restamps_wllama_build_info(data_dir: Path, monkeypatch):
    monkeypatch.setattr(
        storage, "read_wllama_build_info", lambda: ("2.5.0", "abc1234")
    )
    survey = _make_survey()
    storage.write_survey(data_dir, survey, {"page-1.png": b"x"})

    monkeypatch.setattr(
        storage, "read_wllama_build_info", lambda: ("2.6.0", "def5678")
    )
    stale = survey.model_copy(
        update={"wllama_version": "2.5.0", "wllama_commit": "abc1234"}
    )
    storage.write_survey(data_dir, stale, {"page-1.png": b"y"}, overwrite=True)
    raw = _read_yaml(data_dir, "demo")
    assert raw["wllama_version"] == "2.6.0"
    assert raw["wllama_commit"] == "def5678"


def test_duplicate_and_rename_stamp_current_wllama_build_info(
    data_dir: Path, monkeypatch
):
    monkeypatch.setattr(
        storage, "read_wllama_build_info", lambda: ("2.5.0", "abc1234")
    )
    storage.write_survey(data_dir, _make_survey("src"), {"page-1.png": b"x"})

    monkeypatch.setattr(
        storage, "read_wllama_build_info", lambda: ("2.6.0", "def5678")
    )
    storage.duplicate_survey(data_dir, "src", "dup")
    storage.rename_survey(data_dir, "dup", "renamed")
    raw = _read_yaml(data_dir, "renamed")
    assert raw["wllama_version"] == "2.6.0"
    assert raw["wllama_commit"] == "def5678"


def test_write_stamps_image_sha256(data_dir: Path):
    payload = b"PNGDATA"
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": payload})
    page = _read_yaml(data_dir, "demo")["pages"][0]
    assert page["image_sha256"] == hashlib.sha256(payload).hexdigest()


def test_overwrite_restamps_image_sha256(data_dir: Path):
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": b"first"})
    storage.write_survey(data_dir, _make_survey(), {"page-1.png": b"second"}, overwrite=True)
    page = _read_yaml(data_dir, "demo")["pages"][0]
    assert page["image_sha256"] == hashlib.sha256(b"second").hexdigest()


def test_duplicate_and_rename_preserve_image_sha256(data_dir: Path):
    payload = b"PNGDATA"
    storage.write_survey(data_dir, _make_survey("src"), {"page-1.png": payload})
    storage.duplicate_survey(data_dir, "src", "dup")
    storage.rename_survey(data_dir, "dup", "renamed")
    page = _read_yaml(data_dir, "renamed")["pages"][0]
    assert page["image_sha256"] == hashlib.sha256(payload).hexdigest()


def test_list_models_flat_gguf(tmp_path: Path):
    models = tmp_path / "models"
    models.mkdir()
    (models / "qwen.gguf").write_bytes(b"x")
    (models / "readme.txt").write_text("nope")
    entries = storage.list_models(models)
    assert entries == [storage.ModelEntry(name="qwen.gguf", path="qwen.gguf", mmproj_path=None)]


def test_list_models_when_dir_missing(tmp_path: Path):
    assert storage.list_models(tmp_path / "missing") == []


def test_list_models_skips_top_level_mmproj(tmp_path: Path):
    models = tmp_path / "models"
    models.mkdir()
    (models / "qwen.gguf").write_bytes(b"x")
    (models / "mmproj-F16.gguf").write_bytes(b"y")
    # Top-level mmproj files aren't paired with anything; they're just filtered
    # out of the model list so they don't masquerade as a standalone model.
    entries = storage.list_models(models)
    assert entries == [storage.ModelEntry(name="qwen.gguf", path="qwen.gguf", mmproj_path=None)]


def test_list_models_folder_layout_pairs_mmproj(tmp_path: Path):
    models = tmp_path / "models"
    (models / "qwen").mkdir(parents=True)
    (models / "qwen" / "qwen.gguf").write_bytes(b"x")
    (models / "qwen" / "mmproj-F16.gguf").write_bytes(b"y")
    (models / "phi").mkdir()
    (models / "phi" / "phi.gguf").write_bytes(b"z")
    entries = storage.list_models(models)
    assert entries == [
        storage.ModelEntry(name="phi", path="phi/phi.gguf", mmproj_path=None),
        storage.ModelEntry(
            name="qwen", path="qwen/qwen.gguf", mmproj_path="qwen/mmproj-F16.gguf"
        ),
    ]


def test_list_models_folder_without_gguf_is_ignored(tmp_path: Path):
    models = tmp_path / "models"
    (models / "empty").mkdir(parents=True)
    (models / "empty" / "readme.txt").write_text("nope")
    assert storage.list_models(models) == []


def test_list_models_picks_first_shard_in_folder(tmp_path: Path):
    models = tmp_path / "models"
    (models / "qwen").mkdir(parents=True)
    (models / "qwen" / "qwen-00001-of-00003.gguf").write_bytes(b"a")
    (models / "qwen" / "qwen-00002-of-00003.gguf").write_bytes(b"b")
    (models / "qwen" / "qwen-00003-of-00003.gguf").write_bytes(b"c")
    (models / "qwen" / "mmproj-F16.gguf").write_bytes(b"m")
    entries = storage.list_models(models)
    assert entries == [
        storage.ModelEntry(
            name="qwen",
            path="qwen/qwen-00001-of-00003.gguf",
            mmproj_path="qwen/mmproj-F16.gguf",
        )
    ]


def test_list_models_prefers_unsplit_when_both_exist(tmp_path: Path):
    # Defensive: if a previous split run failed to delete the original,
    # the unsplit file wins so users don't double-load weights.
    models = tmp_path / "models"
    (models / "qwen").mkdir(parents=True)
    (models / "qwen" / "qwen.gguf").write_bytes(b"a")
    (models / "qwen" / "qwen-00001-of-00002.gguf").write_bytes(b"b")
    (models / "qwen" / "qwen-00002-of-00002.gguf").write_bytes(b"c")
    entries = storage.list_models(models)
    assert entries == [
        storage.ModelEntry(name="qwen", path="qwen/qwen.gguf", mmproj_path=None)
    ]


def test_list_models_flat_split_chunks(tmp_path: Path):
    models = tmp_path / "models"
    models.mkdir()
    (models / "qwen-00001-of-00002.gguf").write_bytes(b"a")
    (models / "qwen-00002-of-00002.gguf").write_bytes(b"b")
    entries = storage.list_models(models)
    assert entries == [
        storage.ModelEntry(
            name="qwen-00001-of-00002.gguf",
            path="qwen-00001-of-00002.gguf",
            mmproj_path=None,
        )
    ]
