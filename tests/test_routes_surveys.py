from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from app import auth
from app.config import get_settings


@pytest.fixture
def logged_in_client(client: TestClient) -> TestClient:
    client.cookies.set(auth.SESSION_COOKIE_NAME, auth.issue_session())
    return client


def _yaml_text(slug: str = "demo", header: str = "Q1", image: str = "page-1.png") -> str:
    return yaml.safe_dump(
        {
            "name": "Demo",
            "slug": slug,
            "created_at": "2026-05-20T10:00:00Z",
            "pages": [
                {
                    "index": 0,
                    "image": image,
                    "width": 100,
                    "height": 100,
                    "rasterised_dpi": 200,
                    "boxes": [
                        {
                            "id": "B1",
                            "header": header,
                            "description": "desc",
                            "type": "text",
                            "bbox": [0, 0, 10, 10],
                        }
                    ],
                }
            ],
        }
    )


def _post_survey(client: TestClient, slug: str = "demo", header: str = "Q1") -> None:
    response = client.post(
        "/api/surveys",
        data={"yaml": _yaml_text(slug, header)},
        files=[("images", ("page-1.png", b"PNGDATA", "image/png"))],
    )
    assert response.status_code == 201, response.text


def test_list_empty(client: TestClient):
    response = client.get("/api/surveys")
    assert response.status_code == 200
    assert response.json() == {"surveys": []}


def test_create_survey_requires_admin(client: TestClient):
    response = client.post(
        "/api/surveys",
        data={"yaml": _yaml_text()},
        files=[("images", ("page-1.png", b"PNGDATA", "image/png"))],
    )
    assert response.status_code == 401


def test_create_then_list_then_get(logged_in_client: TestClient):
    _post_survey(logged_in_client)
    listed = logged_in_client.get("/api/surveys").json()
    assert listed == {"surveys": [{"slug": "demo", "name": "Demo", "page_count": 1}]}

    fetched = logged_in_client.get("/api/surveys/demo").json()
    assert fetched["survey"]["slug"] == "demo"
    assert fetched["page_images"] == [
        {"filename": "page-1.png", "url": "/api/surveys/demo/images/page-1.png"}
    ]


def test_create_refuses_overwrite_without_flag(logged_in_client: TestClient):
    _post_survey(logged_in_client)
    response = logged_in_client.post(
        "/api/surveys",
        data={"yaml": _yaml_text()},
        files=[("images", ("page-1.png", b"PNGDATA", "image/png"))],
    )
    assert response.status_code == 409


def test_create_with_overwrite_replaces(logged_in_client: TestClient):
    _post_survey(logged_in_client)
    response = logged_in_client.post(
        "/api/surveys",
        data={"yaml": _yaml_text(header="Q9"), "overwrite": "true"},
        files=[("images", ("page-1.png", b"NEW", "image/png"))],
    )
    assert response.status_code == 201
    fetched = logged_in_client.get("/api/surveys/demo").json()
    assert fetched["survey"]["pages"][0]["boxes"][0]["header"] == "Q9"


def test_get_image_serves_the_file(logged_in_client: TestClient):
    _post_survey(logged_in_client)
    response = logged_in_client.get("/api/surveys/demo/images/page-1.png")
    assert response.status_code == 200
    assert response.content == b"PNGDATA"


def test_get_image_rejects_traversal(logged_in_client: TestClient):
    _post_survey(logged_in_client)
    response = logged_in_client.get("/api/surveys/demo/images/..%2Fsurvey.yaml")
    assert response.status_code in (400, 404)


def test_delete_survey(logged_in_client: TestClient):
    _post_survey(logged_in_client)
    response = logged_in_client.delete("/api/surveys/demo")
    assert response.status_code == 200
    assert logged_in_client.get("/api/surveys").json() == {"surveys": []}


def test_delete_requires_admin(client: TestClient):
    response = client.delete("/api/surveys/demo")
    assert response.status_code == 401


def test_duplicate_survey(logged_in_client: TestClient):
    _post_survey(logged_in_client, "src-v1")
    response = logged_in_client.post(
        "/api/surveys/src-v1/duplicate", data={"new_slug": "src-v2"}
    )
    assert response.status_code == 201, response.text
    assert response.json() == {"slug": "src-v2"}
    listed = logged_in_client.get("/api/surveys").json()["surveys"]
    assert sorted(s["slug"] for s in listed) == ["src-v1", "src-v2"]


def test_duplicate_conflict(logged_in_client: TestClient):
    _post_survey(logged_in_client, "a", header="Q1")
    _post_survey(logged_in_client, "b", header="Q9")
    response = logged_in_client.post(
        "/api/surveys/a/duplicate", data={"new_slug": "b"}
    )
    assert response.status_code == 409


def test_rename_survey(logged_in_client: TestClient):
    _post_survey(logged_in_client, "old-slug")
    response = logged_in_client.post(
        "/api/surveys/old-slug/rename", data={"new_slug": "new-slug"}
    )
    assert response.status_code == 200
    assert response.json() == {"slug": "new-slug"}
    assert logged_in_client.get("/api/surveys/old-slug").status_code == 404
    assert logged_in_client.get("/api/surveys/new-slug").status_code == 200


def test_upload_yaml_parses_and_returns_survey(logged_in_client: TestClient):
    response = logged_in_client.post(
        "/admin/upload-yaml", data={"yaml": _yaml_text()}
    )
    assert response.status_code == 200
    assert response.json()["survey"]["slug"] == "demo"


def test_upload_yaml_rejects_bad_yaml(logged_in_client: TestClient):
    response = logged_in_client.post(
        "/admin/upload-yaml", data={"yaml": "not: valid: yaml: ::"}
    )
    assert response.status_code == 400


def test_list_models_when_dir_empty(client: TestClient):
    response = client.get("/api/models")
    assert response.status_code == 200
    body = response.json()
    assert body["models"] == []
    assert "llm_model_url" not in body


def test_list_models_returns_flat_file(client: TestClient, settings_env: Path):
    (settings_env / "models" / "qwen.gguf").write_bytes(b"x")
    body = client.get("/api/models").json()
    assert body["models"] == [
        {"name": "qwen.gguf", "url": "/static/models/qwen.gguf", "mmproj_url": None}
    ]


def test_list_models_pairs_mmproj_in_subfolder(client: TestClient, settings_env: Path):
    models_dir = settings_env / "models" / "qwen"
    models_dir.mkdir()
    (models_dir / "qwen.gguf").write_bytes(b"x")
    (models_dir / "mmproj-F16.gguf").write_bytes(b"y")
    body = client.get("/api/models").json()
    assert body["models"] == [
        {
            "name": "qwen",
            "url": "/static/models/qwen/qwen.gguf",
            "mmproj_url": "/static/models/qwen/mmproj-F16.gguf",
        }
    ]


def test_list_models_skips_subfolder_without_model(client: TestClient, settings_env: Path):
    folder = settings_env / "models" / "orphan"
    folder.mkdir()
    (folder / "mmproj-only.gguf").write_bytes(b"y")
    body = client.get("/api/models").json()
    assert body["models"] == []


def test_list_models_logs_warning_when_mmproj_missing(
    client: TestClient, settings_env: Path, caplog
):
    (settings_env / "models" / "qwen.gguf").write_bytes(b"x")
    with caplog.at_level("WARNING", logger="app.api"):
        client.get("/api/models")
    assert any("No mmproj GGUF" in r.message for r in caplog.records)


def test_admin_page_redirects_when_logged_out(client: TestClient):
    response = client.get("/admin", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == "/admin/login"


def test_admin_page_renders_when_logged_in(logged_in_client: TestClient):
    response = logged_in_client.get("/admin")
    assert response.status_code == 200
    assert "Admin" in response.text


def test_login_success_sets_cookie(client: TestClient):
    response = client.post(
        "/admin/login", data={"password": "hunter2"}, follow_redirects=False
    )
    assert response.status_code == 303
    assert response.headers["location"] == "/admin"
    assert auth.SESSION_COOKIE_NAME in response.cookies


def test_login_failure_returns_401(client: TestClient):
    response = client.post(
        "/admin/login", data={"password": "wrong"}, follow_redirects=False
    )
    assert response.status_code == 401


def test_logout_clears_cookie(logged_in_client: TestClient):
    response = logged_in_client.post("/admin/logout", follow_redirects=False)
    assert response.status_code == 303
    # Trying admin again should redirect to login.
    logged_in_client.cookies.clear()
    follow = logged_in_client.get("/admin", follow_redirects=False)
    assert follow.status_code == 303


def test_user_page_renders(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Researcher" in response.text
