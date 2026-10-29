import time

import pytest

from src.api.schemas import ScheduleRequest

pytest.importorskip("fastapi")
pytest.importorskip("pydantic_settings")

from fastapi.testclient import TestClient  # noqa: E402

from src.main import app  # noqa: E402

_client = TestClient(app)


def test_create_and_get(small_request: ScheduleRequest) -> None:
    """POST /jobs отдаёт id, GET /jobs/{id} в итоге отдаёт расписание."""
    response = _client.post("/jobs", json=small_request.model_dump())
    assert response.status_code == 202
    job_id = response.json()["id"]
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        job = _client.get(f"/jobs/{job_id}").json()
        if job["status"] in ("done", "failed"):
            break
        time.sleep(0.05)
    assert job["status"] == "done"
    assert len(job["lessons"]) == 27


def test_invalid_request(small_request: ScheduleRequest) -> None:
    """Противоречивые данные отклоняются сразу."""
    small_request.groups[0].size = 100
    response = _client.post("/jobs", json=small_request.model_dump())
    assert response.status_code == 422


def test_unknown_job() -> None:
    """Неизвестный id."""
    assert _client.get("/jobs/nope").status_code == 404
