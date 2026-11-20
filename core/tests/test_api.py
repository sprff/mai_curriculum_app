import time
from threading import Event

import pytest
from fastapi.testclient import TestClient

import src.api as api
from src.api import app
from src.schemas import Lesson, ScheduleRequest
from src.service.job_manager import JobManager

client = TestClient(app)


def _wait_until_finished(job_id: str) -> dict:
    """Опрашивает статус задачи, пока она в очереди или выполняется (не дольше 10 с)."""
    for _ in range(200):
        state = client.get(f"/jobs/{job_id}").json()
        if state["status"] not in ("queued", "running"):
            return state
        time.sleep(0.05)
    raise AssertionError("задача не завершилась за 10 с")


def test_create_job_returns_schedule(small_request: ScheduleRequest) -> None:
    """Корректные данные: задача создаётся и в итоге возвращает расписание."""
    response = client.post("/jobs", json=small_request.model_dump())
    assert response.status_code == 202

    state = _wait_until_finished(response.json()["job_id"])
    assert state["status"] == "done"
    assert len(state["result"]) == 27


def test_create_job_with_validation_issues(small_request: ScheduleRequest) -> None:
    """Валидатор нашёл проблему: генерация не запускается, возвращается список проблем."""
    data = small_request.model_dump()
    data["groups"].append({"id": 4, "size": 100})
    response = client.post("/jobs", json=data)
    assert response.status_code == 422
    assert response.json()["issues"][0]["code"] == "group_too_big"


def test_create_job_with_wrong_format() -> None:
    """Данные не в том формате: 422 с кодом invalid_format, валидатор не вызывается."""
    response = client.post("/jobs", json={"groups": "не список"})
    assert response.status_code == 422
    assert response.json()["issues"][0]["code"] == "invalid_format"


def test_cancel_job(small_request: ScheduleRequest) -> None:
    """Отмена существующей задачи возвращает её состояние."""
    job_id = client.post("/jobs", json=small_request.model_dump()).json()["job_id"]
    response = client.post(f"/jobs/{job_id}/cancel")
    assert response.status_code == 200
    assert response.json()["id"] == job_id


def test_unknown_job() -> None:
    """Задачи с таким номером нет: 404."""
    assert client.get("/jobs/nope").status_code == 404
    assert client.post("/jobs/nope/cancel").status_code == 404


def test_evaluate_returns_quality_for_complete_schedule(
    small_request: ScheduleRequest, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ручка считает показатели для готового расписания и сохраняет обычный ответ."""
    lessons = [
        Lesson(
            day=0, lesson_number=number, group_id=1, subject_id=subject, teacher_id=teacher, classroom_id=501
        )
        for number, subject, teacher in [(1, 1, 1), (3, 1, 1), (4, 1, 1), (6, 2, 3), (7, 2, 3)]
    ]

    class ExampleScheduler:
        def __init__(self, time_limit_s: float) -> None:
            pass

        def build(self, request: ScheduleRequest, progress_callback=None, cancel_event=None) -> list[Lesson]:
            return lessons

    monkeypatch.setattr(api, "job_manager", JobManager(scheduler_factory=ExampleScheduler))
    job_id = client.post("/jobs", json=small_request.model_dump()).json()["job_id"]
    state = _wait_until_finished(job_id)
    assert state["status"] == "done"
    assert "quality" not in state
    assert "quality" not in client.get(f"/jobs/{job_id}?evaluate=false").json()

    response = client.get(f"/jobs/{job_id}?evaluate=true")
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == state["result"]
    assert data["quality"] == {
        "first_lessons": 1,
        "late_lessons": 2,
        "group_windows": 2,
        "teacher_windows": 1,
        "overloaded_days": 1,
        "group_clashes": 0,
        "teacher_clashes": 0,
        "room_clashes": 0,
        "capacity_violations": 0,
        "foreign_teachers": 0,
        "missing_lessons": 22,
    }


def test_evaluate_waits_for_finished_schedule(
    small_request: ScheduleRequest, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ожидающая или выполняющаяся задача возвращается без оценки."""
    release = Event()

    class WaitingScheduler:
        def __init__(self, time_limit_s: float) -> None:
            pass

        def build(self, request: ScheduleRequest, progress_callback=None, cancel_event=None) -> list[Lesson]:
            release.wait(timeout=5)
            return []

    monkeypatch.setattr(api, "job_manager", JobManager(scheduler_factory=WaitingScheduler))
    try:
        job_id = client.post("/jobs", json=small_request.model_dump()).json()["job_id"]
        data = client.get(f"/jobs/{job_id}?evaluate=true").json()
        assert data["status"] in ("queued", "running")
        assert data["result"] is None
        assert "quality" not in data
    finally:
        release.set()

    assert _wait_until_finished(job_id)["status"] == "done"
    evaluated = client.get(f"/jobs/{job_id}?evaluate=true").json()
    assert evaluated["result"] == []
    assert evaluated["quality"]["missing_lessons"] == 27


def test_evaluate_failed_job(small_request: ScheduleRequest, monkeypatch: pytest.MonkeyPatch) -> None:
    """Неуспешная задача возвращается без оценки."""

    class FailingScheduler:
        def __init__(self, time_limit_s: float) -> None:
            pass

        def build(self, request: ScheduleRequest, progress_callback=None, cancel_event=None) -> list[Lesson]:
            raise RuntimeError("generation failed")

    monkeypatch.setattr(api, "job_manager", JobManager(scheduler_factory=FailingScheduler))
    job_id = client.post("/jobs", json=small_request.model_dump()).json()["job_id"]
    assert _wait_until_finished(job_id)["status"] == "failed"
    data = client.get(f"/jobs/{job_id}?evaluate=true").json()
    assert data["status"] == "failed"
    assert "quality" not in data


def test_evaluate_unknown_job() -> None:
    """Параметр оценки не меняет ответ для неизвестной задачи."""
    assert client.get("/jobs/nope?evaluate=true").status_code == 404
