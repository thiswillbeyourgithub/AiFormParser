from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

BoxType = Literal["text", "number", "checkbox", "date", "multi-choice", "multi-select"]

BBox = tuple[int, int, int, int]

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class _Frozen(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BlockWord(_Frozen):
    text: str
    bbox: BBox


class OcrBlock(_Frozen):
    id: str
    text: str
    bbox: BBox
    words: list[BlockWord] = Field(default_factory=list)


class OcrToken(_Frozen):
    text: str
    bbox: BBox
    confidence: float = Field(ge=0.0, le=1.0)


class Box(_Frozen):
    id: str
    header: str
    description: str
    type: BoxType
    choices: list[str] | None = None
    bbox: BBox
    # If true, a "missing" LLM signal is converted to the type's empty value
    # at export time (false for checkbox, "" for text, [] for multi-select,
    # null for number/date/multi-choice). If false (default), a "missing"
    # signal lands in the cell as the literal string "MISSING".
    missing_is_empty: bool = False

    @model_validator(mode="after")
    def _choices_required_for_choice_types(self) -> "Box":
        needs_choices = self.type in ("multi-choice", "multi-select")
        if needs_choices and not self.choices:
            raise ValueError(f"box {self.id!r}: type {self.type!r} requires non-empty 'choices'")
        if not needs_choices and self.choices:
            raise ValueError(f"box {self.id!r}: type {self.type!r} must not define 'choices'")
        return self


class Page(_Frozen):
    index: int = Field(ge=0)
    image: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    rasterised_dpi: int = Field(gt=0)
    # Stamped by storage.write_survey from the uploaded bytes. Optional on
    # load so YAMLs predating hashing still validate.
    image_sha256: str | None = None
    ocr_tokens: list[OcrToken] = Field(default_factory=list)
    ocr_blocks: list[OcrBlock] = Field(default_factory=list)
    boxes: list[Box] = Field(default_factory=list)


class LlmPreset(_Frozen):
    # Display name for the preset, shown to the researcher in the picker
    # and used as the preset's identifier. Must be unique within a survey.
    name: str = Field(min_length=1)
    # Model name as returned by GET /api/models. Free-form so the YAML
    # stays portable: a researcher's instance whose catalogue lacks this
    # name still loads the YAML; they then pick a different preset.
    model: str = Field(min_length=1)
    # Arbitrary wllama load options (image_min_tokens, n_ctx, ...) merged
    # over the client-side defaults at load time. Set a value to the
    # string "model_default" to drop the key entirely so wllama's own
    # default wins.
    load_params: dict[str, Any] = Field(default_factory=dict)
    # Arbitrary completion / sampling parameters (temperature,
    # chat_template_kwargs, ...) passed per call. Same "model_default"
    # sentinel semantics as load_params.
    sample_params: dict[str, Any] = Field(default_factory=dict)
    # Exactly one preset per survey may carry is_default=true; the
    # researcher's picker selects that one by default.
    is_default: bool = False


class Survey(_Frozen):
    name: str
    slug: str
    created_at: datetime
    # Stamped by the server on every write (see storage._serialise_survey).
    # Optional on load so YAMLs predating versioning still validate.
    app_version: str | None = None
    # Wllama version and git commit captured at save time from the vendored
    # build's BUILD_INFO.json. Both are optional: BUILD_INFO.json may be
    # missing (older vendor checkouts) and npm releases have no commit.
    wllama_version: str | None = None
    wllama_commit: str | None = None
    # LLM presets the admin defined for this survey. Researchers must
    # pick one before processing; admin may run the test panel against
    # any preset. An empty list is allowed at save time (admin may save
    # mid-edit) but the researcher UI refuses to process until at least
    # one exists.
    presets: list[LlmPreset] = Field(default_factory=list)
    pages: list[Page] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _migrate_legacy_fields(cls, data: Any) -> Any:
        # Surveys saved before the preset feature carried a top-level
        # `recommended_model` string. Fold it into a single default
        # preset so old YAMLs continue to load cleanly under the new
        # `extra=forbid` rule. The synthesised preset uses empty
        # load_params / sample_params so the admin can edit it the
        # first time they open the survey.
        if not isinstance(data, dict):
            return data
        rec = data.pop("recommended_model", None)
        if rec and not data.get("presets"):
            data["presets"] = [
                {
                    "name": "Default",
                    "model": rec,
                    "load_params": {},
                    "sample_params": {},
                    "is_default": True,
                }
            ]
        return data

    @field_validator("slug")
    @classmethod
    def _slug_is_kebab_case(cls, v: str) -> str:
        if not SLUG_RE.match(v):
            raise ValueError(
                "slug must be lowercase kebab-case (letters, digits, hyphens; no leading/trailing hyphen)"
            )
        return v

    @model_validator(mode="after")
    def _headers_unique_across_pages(self) -> "Survey":
        seen: dict[str, str] = {}
        for page in self.pages:
            for box in page.boxes:
                if box.header in seen:
                    raise ValueError(
                        f"duplicate header {box.header!r}: boxes {seen[box.header]!r} and {box.id!r}"
                    )
                seen[box.header] = box.id
        return self

    @model_validator(mode="after")
    def _page_indices_unique_and_sequential(self) -> "Survey":
        indices = [p.index for p in self.pages]
        if sorted(indices) != list(range(len(indices))):
            raise ValueError(f"page indices must be 0..N-1 with no gaps, got {indices}")
        return self

    @model_validator(mode="after")
    def _presets_consistent(self) -> "Survey":
        seen: set[str] = set()
        defaults: list[str] = []
        for preset in self.presets:
            if preset.name in seen:
                raise ValueError(f"duplicate preset name {preset.name!r}")
            seen.add(preset.name)
            if preset.is_default:
                defaults.append(preset.name)
        if len(defaults) > 1:
            raise ValueError(
                f"at most one preset may have is_default=true, got {defaults!r}"
            )
        if self.presets and not defaults:
            raise ValueError("exactly one preset must have is_default=true when presets are defined")
        return self
