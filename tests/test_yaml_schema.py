from datetime import datetime

import pytest
import yaml
from pydantic import ValidationError

from app.schema import Box, OcrBlock, OcrToken, Page, Survey


def _minimal_survey(**overrides) -> dict:
    data = {
        "name": "Depression screening v3",
        "slug": "depression-screening-v3",
        "created_at": "2026-05-20T10:00:00Z",
        "pages": [
            {
                "index": 0,
                "image": "page-1.png",
                "width": 2480,
                "height": 3508,
                "rasterised_dpi": 200,
                "ocr_tokens": [
                    {"text": "Question", "bbox": [10, 10, 80, 20], "confidence": 0.92}
                ],
                "ocr_blocks": [
                    {
                        "id": "B1",
                        "text": "Question 1 of 5",
                        "bbox": [10, 10, 200, 20],
                        "words": [
                            {"text": "Question", "bbox": [10, 10, 80, 20]},
                            {"text": "1", "bbox": [95, 10, 10, 20]},
                        ],
                    }
                ],
                "boxes": [
                    {
                        "id": "Q1",
                        "header": "Q1",
                        "description": "Sleep quality",
                        "type": "multi-choice",
                        "choices": ["1", "2", "3", "4", "5"],
                        "bbox": [100, 200, 50, 20],
                    }
                ],
            }
        ],
    }
    data.update(overrides)
    return data


def test_round_trips_through_yaml():
    raw = _minimal_survey()
    yaml_text = yaml.safe_dump(raw)
    parsed = yaml.safe_load(yaml_text)
    survey = Survey.model_validate(parsed)
    assert survey.slug == "depression-screening-v3"
    assert survey.pages[0].boxes[0].type == "multi-choice"


def test_rejects_duplicate_headers_across_pages():
    data = _minimal_survey()
    second_page = dict(data["pages"][0])
    second_page = {
        **second_page,
        "index": 1,
        "image": "page-2.png",
        "boxes": [
            {
                "id": "Q2",
                "header": "Q1",
                "description": "duplicate header",
                "type": "text",
                "bbox": [10, 10, 50, 20],
            }
        ],
    }
    data["pages"].append(second_page)

    with pytest.raises(ValidationError) as exc:
        Survey.model_validate(data)
    assert "duplicate header" in str(exc.value)


def test_rejects_bad_slug():
    with pytest.raises(ValidationError):
        Survey.model_validate(_minimal_survey(slug="Bad Slug!"))


def test_multi_select_requires_choices():
    data = _minimal_survey()
    data["pages"][0]["boxes"] = [
        {
            "id": "MS",
            "header": "symptoms",
            "description": "check all that apply",
            "type": "multi-select",
            "bbox": [10, 10, 50, 20],
        }
    ]
    with pytest.raises(ValidationError) as exc:
        Survey.model_validate(data)
    assert "requires non-empty 'choices'" in str(exc.value)


def test_text_box_must_not_define_choices():
    data = _minimal_survey()
    data["pages"][0]["boxes"] = [
        {
            "id": "T1",
            "header": "notes",
            "description": "free text",
            "type": "text",
            "choices": ["a", "b"],
            "bbox": [10, 10, 50, 20],
        }
    ]
    with pytest.raises(ValidationError):
        Survey.model_validate(data)


def test_page_indices_must_be_sequential():
    data = _minimal_survey()
    data["pages"][0]["index"] = 2
    with pytest.raises(ValidationError) as exc:
        Survey.model_validate(data)
    assert "page indices" in str(exc.value)


def test_multi_select_box_round_trips():
    data = _minimal_survey()
    data["pages"][0]["boxes"][0] = {
        "id": "MS",
        "header": "symptoms",
        "description": "check all that apply",
        "type": "multi-select",
        "choices": ["nausea", "headache", "fatigue"],
        "bbox": [10, 10, 50, 20],
    }
    survey = Survey.model_validate(data)
    assert survey.pages[0].boxes[0].choices == ["nausea", "headache", "fatigue"]


def test_missing_is_empty_defaults_false_and_round_trips():
    data = _minimal_survey()
    survey = Survey.model_validate(data)
    assert survey.pages[0].boxes[0].missing_is_empty is False

    data["pages"][0]["boxes"][0]["missing_is_empty"] = True
    survey = Survey.model_validate(data)
    assert survey.pages[0].boxes[0].missing_is_empty is True

    yaml_text = yaml.safe_dump(survey.model_dump(mode="json"))
    reparsed = Survey.model_validate(yaml.safe_load(yaml_text))
    assert reparsed.pages[0].boxes[0].missing_is_empty is True


def test_presets_default_empty_and_round_trip():
    data = _minimal_survey()
    survey = Survey.model_validate(data)
    assert survey.presets == []

    data["presets"] = [
        {
            "name": "Fast",
            "model": "Qwen3.5-4B-Q4_K_M",
            "load_params": {"n_ctx": 2048, "image_max_tokens": 128},
            "sample_params": {"temperature": 0.2},
            "is_default": True,
        },
        {
            "name": "Quality",
            "model": "Qwen3.5-4B-Q5_K_M",
            "load_params": {},
            "sample_params": {"temperature": 0.7},
        },
    ]
    survey = Survey.model_validate(data)
    assert [p.name for p in survey.presets] == ["Fast", "Quality"]
    assert survey.presets[0].is_default is True
    assert survey.presets[1].is_default is False
    assert survey.presets[0].load_params["image_max_tokens"] == 128

    yaml_text = yaml.safe_dump(survey.model_dump(mode="json"))
    reparsed = Survey.model_validate(yaml.safe_load(yaml_text))
    assert [p.name for p in reparsed.presets] == ["Fast", "Quality"]


def test_presets_reject_duplicate_names():
    data = _minimal_survey()
    data["presets"] = [
        {"name": "P", "model": "m", "is_default": True},
        {"name": "P", "model": "n"},
    ]
    with pytest.raises(ValidationError) as exc:
        Survey.model_validate(data)
    assert "duplicate preset name" in str(exc.value)


def test_presets_require_exactly_one_default():
    data = _minimal_survey()
    data["presets"] = [
        {"name": "A", "model": "m"},
        {"name": "B", "model": "n"},
    ]
    with pytest.raises(ValidationError) as exc:
        Survey.model_validate(data)
    assert "is_default=true" in str(exc.value)


def test_presets_reject_two_defaults():
    data = _minimal_survey()
    data["presets"] = [
        {"name": "A", "model": "m", "is_default": True},
        {"name": "B", "model": "n", "is_default": True},
    ]
    with pytest.raises(ValidationError) as exc:
        Survey.model_validate(data)
    assert "at most one preset" in str(exc.value)


def test_legacy_recommended_model_migrates_to_default_preset():
    data = _minimal_survey()
    data["recommended_model"] = "Qwen3.5-4B-Q4_K_M"
    survey = Survey.model_validate(data)
    assert len(survey.presets) == 1
    assert survey.presets[0].name == "Default"
    assert survey.presets[0].model == "Qwen3.5-4B-Q4_K_M"
    assert survey.presets[0].is_default is True
    # The legacy field must not appear on the new model.
    assert not hasattr(survey, "recommended_model")


def test_missing_is_empty_accepted_for_all_types():
    for box_type in ("text", "number", "checkbox", "date"):
        data = _minimal_survey()
        data["pages"][0]["boxes"] = [
            {
                "id": "B",
                "header": "h",
                "description": "d",
                "type": box_type,
                "bbox": [10, 10, 50, 20],
                "missing_is_empty": True,
            }
        ]
        survey = Survey.model_validate(data)
        assert survey.pages[0].boxes[0].missing_is_empty is True
