import time

from fastapi.testclient import TestClient

from src.api import app
from src.schemas import ScheduleRequest

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


def test_create_job_uses_teacher_slot_marks() -> None:
    """Генерация через API учитывает предпочтения и запреты при поиске и переносе."""
    data = {
        "classrooms": [{"id_number": 101, "capacity": 30}],
        "groups": [{"id": 1, "size": 20}],
        "subjects": [{"id": 1, "weekly_number_of_lessons": 1}],
        "group_subjects": [{"group_id": 1, "subject_id": 1}],
        "teacher_subjects": [{"teacher_id": 1, "subject_id": 1}],
        "teacher_preferred_slots": [
            {"teacher_id": 1, "day": 0, "lesson_number": 2},
            {"teacher_id": 1, "day": 1, "lesson_number": 1},
        ],
        "teacher_unavailable_slots": [{"teacher_id": 1, "day": 0, "lesson_number": 2}],
    }
    response = client.post("/jobs", json=data)
    assert response.status_code == 202

    state = _wait_until_finished(response.json()["job_id"])
    assert state["status"] == "done"
    (lesson,) = state["result"]
    assert (lesson["teacher_id"], lesson["day"], lesson["lesson_number"]) == (1, 1, 1)


def test_create_job_rejects_slot_outside_grid(small_request: ScheduleRequest) -> None:
    """API отклоняет отметку за пределами учебной недели."""
    data = small_request.model_dump()
    data["teacher_unavailable_slots"] = [{"teacher_id": 1, "day": 6, "lesson_number": 1}]
    response = client.post("/jobs", json=data)
    assert response.status_code == 422
    assert response.json()["issues"][0]["code"] == "invalid_format"


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
