import logging
import time
from threading import Event

import pytest

from src.schemas import ScheduleRequest
from src.service.job_manager import JobManager

def wait_status(manager: JobManager, job_id: str, expected: str, timeout: float = 3):
    """Ждём нужного статуса, чтобы тест не зависел от скорости компьютера"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = manager.get(job_id)
        if state.status == expected:
            return state
        time.sleep(0.01)
    pytest.fail(f"Задача {job_id} не получила статус {expected}")


@pytest.fixture
def log_records():
    """Собирает сообщения от JobManager"""
    logger = logging.getLogger("src.service.job_manager")
    old_level = logger.level
    messages = []

    class RecordCollector(logging.Handler):
        def emit(self, record):
            messages.append(record)

    handler = RecordCollector()
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    yield messages
    logger.removeHandler(handler)
    logger.setLevel(old_level)


def test_logs_success_and_progress(small_request: ScheduleRequest, log_records) -> None:
    """Задача записывает создание, старт, прогресс и завершение"""
    class SimpleScheduler:
        def __init__(self, time_limit_s):
            pass

        def build(self, request, progress_callback=None, cancel_event=None):
            for placed in range(1, 11):
                progress_callback(placed, 10)
            return []

    manager = JobManager(scheduler_factory=SimpleScheduler)
    job_id = manager.submit(small_request)
    wait_status(manager, job_id, "done")
    manager._queue.join()

    messages = [r.getMessage() for r in log_records if job_id in r.getMessage()]
    assert any("Задача создана" in m for m in messages)
    assert any("Генерация началась" in m for m in messages)
    assert any("Прогресс генерации" in m and "10%" in m for m in messages)
    assert any("Прогресс генерации" in m and "100%" in m for m in messages)
    assert any("статус=done" in m for m in messages)


def test_logs_queued_cancellation(small_request: ScheduleRequest, log_records) -> None:
    """Отмена ещё не запущенной задачи отражается в логах"""
    started = Event()
    release = Event()

    class BlockingScheduler:
        def __init__(self, time_limit_s):
            pass

        def build(self, request, progress_callback=None, cancel_event=None):
            started.set()
            assert release.wait(2)
            return []

    manager = JobManager(scheduler_factory=BlockingScheduler)
    first_id = manager.submit(small_request)
    assert started.wait(2)
    second_id = manager.submit(small_request)
    assert manager.cancel(second_id).status == "cancelled"
    release.set()
    wait_status(manager, first_id, "done")
    manager._queue.join()

    assert any("Задача отменена в очереди" in r.getMessage() and second_id in r.getMessage()
               for r in log_records)


def test_logs_failure_with_traceback(small_request: ScheduleRequest, log_records) -> None:
    """При ошибке сохраняются ID задачи и traceback исключения"""
    class BrokenScheduler:
        def __init__(self, time_limit_s):
            pass

        def build(self, request, progress_callback=None, cancel_event=None):
            raise RuntimeError("Проверочная ошибка")

    manager = JobManager(scheduler_factory=BrokenScheduler)
    job_id = manager.submit(small_request)
    wait_status(manager, job_id, "failed")
    manager._queue.join()

    error_records = [r for r in log_records if r.levelno == logging.ERROR and job_id in r.getMessage()]
    assert len(error_records) == 1
    assert error_records[0].exc_info is not None
