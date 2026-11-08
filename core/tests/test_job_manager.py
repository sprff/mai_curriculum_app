"""Проверки очереди, отмены, таймаута и получения результата"""

import time
from threading import Event

import pytest

from src.exceptions import JobNotFoundError
from src.schemas import ScheduleRequest
from src.service.job_manager import JobManager


def wait_status(manager: JobManager, job_id: str, expected: str, timeout: float = 3):
    """Ждёт нужного статуса, чтобы тесты не зависели от скорости компьютера"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = manager.get(job_id)
        if state.status == expected:
            return state
        time.sleep(0.01)
    pytest.fail(f"задача {job_id} не перешла в {expected}, сейчас {manager.get(job_id).status}")


def test_job_reaches_done(small_request: ScheduleRequest) -> None:
    """Обычная задача завершается и возвращает расписание"""
    manager = JobManager(time_limit_s=10)

    job_id = manager.submit(small_request)
    state = wait_status(manager, job_id, "done")

    assert state.id == job_id
    assert state.created_at <= state.started_at <= state.finished_at
    assert state.progress_total == 27
    assert state.progress_placed == state.progress_total
    assert len(state.result) == state.progress_total
    assert state.error is None


def test_cancel_running_job(small_request: ScheduleRequest) -> None:
    """Работающая задача видит сигнал отмены"""
    started = Event()

    class SlowScheduler:
        def __init__(self, time_limit_s: float):
            self.time_limit_s = time_limit_s

        def build(self, request, progress_callback=None, cancel_event=None):
            started.set()
            if progress_callback is not None:
                progress_callback(2, 27)
            if not cancel_event.wait(2):
                raise RuntimeError("тест не получил сигнал отмены")
            from src.exceptions import ScheduleCancelledError

            raise ScheduleCancelledError("генерация отменена")

    manager = JobManager(scheduler_factory=SlowScheduler)
    job_id = manager.submit(small_request)
    assert started.wait(2)

    manager.cancel(job_id)
    state = wait_status(manager, job_id, "cancelled")
    assert state.progress_placed == 2
    assert state.result is None
    assert state.finished_at is not None


def test_cancel_queued_job(small_request: ScheduleRequest) -> None:
    """Задача из очереди не передаётся генератору после отмены"""
    started = Event()
    release = Event()
    calls = []

    class SlowScheduler:
        def __init__(self, time_limit_s: float):
            self.time_limit_s = time_limit_s

        def build(self, request, progress_callback=None, cancel_event=None):
            calls.append(request)
            started.set()
            assert release.wait(2)
            return []

    manager = JobManager(scheduler_factory=SlowScheduler)
    first_id = manager.submit(small_request)
    assert started.wait(2)

    queued_id = manager.submit(small_request)
    assert manager.get(queued_id).status == "queued"
    manager.cancel(queued_id)
    cancelled = manager.get(queued_id)

    assert cancelled.status == "cancelled"
    assert cancelled.started_at is None
    assert cancelled.finished_at is not None

    release.set()
    wait_status(manager, first_id, "done")
    assert len(calls) == 1


def test_timeout_is_failed(small_request: ScheduleRequest) -> None:
    """Истечение времени считается неудачей, а не отменой"""
    manager = JobManager(time_limit_s=-1)
    job_id = manager.submit(small_request)
    state = wait_status(manager, job_id, "failed")

    assert state.error is not None
    assert "не уложились" in state.error
    assert state.result is None
    assert state.finished_at is not None


def test_unknown_id_raises_error() -> None:
    """По несуществующему id возвращается отдельная ошибка"""
    manager = JobManager()
    with pytest.raises(JobNotFoundError):
        manager.get("missing-id")
    with pytest.raises(JobNotFoundError):
        manager.cancel("missing-id")


def test_scheduler_accepts_pre_cancelled_event(small_request: ScheduleRequest) -> None:
    """Сам генератор проверяет сигнал отмены"""
    from src.exceptions import ScheduleCancelledError
    from src.service.scheduler import Scheduler

    stop = Event()
    stop.set()
    with pytest.raises(ScheduleCancelledError):
        Scheduler(time_limit_s=10).build(small_request, cancel_event=stop)


def test_progress_callback_is_throttled(small_request: ScheduleRequest) -> None:
    """Генератор не сообщает промежуточный прогресс слишком часто"""
    from src.service.scheduler import Scheduler

    reports = []

    def on_progress(placed: int, total: int) -> None:
        reports.append((time.monotonic(), placed, total))

    result = Scheduler(time_limit_s=10).build(small_request, progress_callback=on_progress)

    assert result
    assert reports
    assert all(0 <= placed <= total == 27 for _, placed, total in reports)
    for index in range(1, len(reports)):
        assert reports[index][0] - reports[index - 1][0] >= 0.5


