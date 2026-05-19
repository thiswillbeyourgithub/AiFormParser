from __future__ import annotations

import hashlib
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

import yaml

from app.schema import Survey
from app.version import APP_VERSION
from app.wllama_info import read_wllama_build_info

SURVEY_FILENAME = "survey.yaml"


class StorageError(Exception):
    pass


class SurveyNotFound(StorageError):
    pass


class SurveyConflict(StorageError):
    pass


class MissingPageImage(StorageError):
    pass


@dataclass(frozen=True)
class SurveySummary:
    slug: str
    name: str
    page_count: int


def _survey_dir(data_dir: Path, slug: str) -> Path:
    return data_dir / slug


def _is_survey_dir(p: Path) -> bool:
    return p.is_dir() and (p / SURVEY_FILENAME).is_file()


def list_surveys(data_dir: Path) -> list[SurveySummary]:
    if not data_dir.is_dir():
        return []
    out: list[SurveySummary] = []
    for child in sorted(data_dir.iterdir()):
        if not _is_survey_dir(child):
            continue
        try:
            survey = read_survey(data_dir, child.name)
        except StorageError:
            continue
        out.append(SurveySummary(slug=survey.slug, name=survey.name, page_count=len(survey.pages)))
    return out


def read_survey(data_dir: Path, slug: str) -> Survey:
    folder = _survey_dir(data_dir, slug)
    yaml_path = folder / SURVEY_FILENAME
    if not yaml_path.is_file():
        raise SurveyNotFound(slug)
    with yaml_path.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return Survey.model_validate(raw)


def _serialise_survey(survey: Survey, image_hashes: dict[str, str] | None = None) -> str:
    data = survey.model_dump(mode="json")
    data["app_version"] = APP_VERSION
    wllama_version, wllama_commit = read_wllama_build_info()
    data["wllama_version"] = wllama_version
    data["wllama_commit"] = wllama_commit
    if image_hashes is not None:
        for page in data.get("pages", []):
            h = image_hashes.get(page.get("image"))
            if h is not None:
                page["image_sha256"] = h
    return yaml.safe_dump(data, sort_keys=False, allow_unicode=True)


def write_survey(
    data_dir: Path,
    survey: Survey,
    page_images: dict[str, bytes],
    *,
    overwrite: bool = False,
) -> None:
    expected = {page.image for page in survey.pages}
    missing = expected - set(page_images.keys())
    if missing:
        raise MissingPageImage(f"missing page images: {sorted(missing)}")

    image_hashes = {
        name: hashlib.sha256(blob).hexdigest()
        for name, blob in page_images.items()
        if name in expected
    }

    folder = _survey_dir(data_dir, survey.slug)
    if folder.exists():
        if not overwrite:
            raise SurveyConflict(f"survey {survey.slug!r} already exists")
        shutil.rmtree(folder)

    folder.mkdir(parents=True)
    (folder / SURVEY_FILENAME).write_text(
        _serialise_survey(survey, image_hashes), encoding="utf-8"
    )
    for name, blob in page_images.items():
        if name not in expected:
            continue
        (folder / name).write_bytes(blob)


def delete_survey(data_dir: Path, slug: str) -> None:
    folder = _survey_dir(data_dir, slug)
    if not folder.is_dir():
        raise SurveyNotFound(slug)
    shutil.rmtree(folder)


def duplicate_survey(data_dir: Path, src_slug: str, dst_slug: str) -> Survey:
    if src_slug == dst_slug:
        raise SurveyConflict("source and destination slugs are identical")
    src = _survey_dir(data_dir, src_slug)
    dst = _survey_dir(data_dir, dst_slug)
    if not src.is_dir():
        raise SurveyNotFound(src_slug)
    if dst.exists():
        raise SurveyConflict(dst_slug)

    shutil.copytree(src, dst)
    survey = read_survey(data_dir, src_slug)
    new_survey = survey.model_copy(update={"slug": dst_slug})
    # Re-validate the slug through the pydantic constructor.
    new_survey = Survey.model_validate(new_survey.model_dump(mode="json"))
    (dst / SURVEY_FILENAME).write_text(_serialise_survey(new_survey), encoding="utf-8")
    return new_survey


def rename_survey(data_dir: Path, src_slug: str, dst_slug: str) -> Survey:
    if src_slug == dst_slug:
        return read_survey(data_dir, src_slug)
    src = _survey_dir(data_dir, src_slug)
    dst = _survey_dir(data_dir, dst_slug)
    if not src.is_dir():
        raise SurveyNotFound(src_slug)
    if dst.exists():
        raise SurveyConflict(dst_slug)

    src.rename(dst)
    survey = read_survey(data_dir, dst_slug)
    new_survey = Survey.model_validate(survey.model_dump(mode="json") | {"slug": dst_slug})
    (dst / SURVEY_FILENAME).write_text(_serialise_survey(new_survey), encoding="utf-8")
    return new_survey


@dataclass(frozen=True)
class ModelEntry:
    name: str
    path: str
    mmproj_path: str | None


def _is_mmproj(name: str) -> bool:
    # wllama needs a multimodal projector GGUF loaded alongside the main
    # weights for vision support. HF naming convention puts the substring
    # "mmproj" somewhere in the filename (e.g. "model-mmproj-f16.gguf");
    # everything else is treated as a standalone model.
    return "mmproj" in name.lower()


# llama-gguf-split emits chunks named "<basename>-NNNNN-of-NNNNN.gguf".
# wllama auto-discovers the remaining chunks from the first one, so we only
# surface chunk #1 in the model list and skip the rest.
SPLIT_SUFFIX_RE = re.compile(r"-(\d{5})-of-(\d{5})\.gguf$")


def _split_chunk_index(name: str) -> int | None:
    m = SPLIT_SUFFIX_RE.search(name)
    return int(m.group(1)) if m else None


def _pick_main_gguf(ggufs: list[Path]) -> Path | None:
    """Return the entry point for a model: prefer an unsplit file, else the
    first shard of a split set. Subsequent shards are filtered out so they
    don't masquerade as standalone models."""
    unsplit: list[Path] = []
    first_shards: list[Path] = []
    for p in ggufs:
        if _is_mmproj(p.name):
            continue
        idx = _split_chunk_index(p.name)
        if idx is None:
            unsplit.append(p)
        elif idx == 1:
            first_shards.append(p)
    # Defensive: an unsplit file wins so a half-finished split run (shards
    # written, original not yet removed) doesn't make wllama load both.
    if unsplit:
        return unsplit[0]
    return first_shards[0] if first_shards else None


def list_models(models_dir: Path) -> list[ModelEntry]:
    # Two layouts are supported under MODELS_DIR:
    #   <file>.gguf                          -> flat, no mmproj
    #   <model-name>/<file>.gguf [+ mmproj]  -> folder per model, paired projector
    if not models_dir.is_dir():
        return []
    out: list[ModelEntry] = []
    for child in sorted(models_dir.iterdir()):
        if child.is_file() and child.suffix == ".gguf":
            if _is_mmproj(child.name):
                continue
            if _split_chunk_index(child.name) not in (None, 1):
                continue
            out.append(ModelEntry(name=child.name, path=child.name, mmproj_path=None))
            continue
        if not child.is_dir():
            continue
        ggufs = sorted(p for p in child.iterdir() if p.is_file() and p.suffix == ".gguf")
        model_file = _pick_main_gguf(ggufs)
        mmproj_file = next((p for p in ggufs if _is_mmproj(p.name)), None)
        if model_file is None:
            continue
        out.append(
            ModelEntry(
                name=child.name,
                path=f"{child.name}/{model_file.name}",
                mmproj_path=f"{child.name}/{mmproj_file.name}" if mmproj_file else None,
            )
        )
    return out
