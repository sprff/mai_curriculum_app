import time

import pytest

from src.api.schemas import JobResponse, JobStatus, ScheduleRequest
from src.exceptions import JobNotFoundError
from src.service.jobs import JobManager


def _wait(manager: JobManager, job_id: str, timeout_s: float = 10) -> JobResponse:
    """Ждёт, пока задача завершится."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        job = manager.get(job_id)
        if job.status in (JobStatus.DONE, JobStatus.FAILED):
            return job
        time.sleep(0.05)
    raise AssertionError("задача не завершилась")


def test_job_done(small_request: ScheduleRequest) -> None:
    """Задача проходит путь до done и отдаёт расписание."""
    manager = JobManager(time_limit_s=10)
    job_id = manager.submit(small_request)
    job = _wait(manager, job_id)
    assert job.status == JobStatus.DONE
    assert job.error is None
    assert len(job.lessons) == 27


def test_job_failed_on_timeout(small_request: ScheduleRequest) -> None:
    """Ошибка генерации попадает в статус failed с текстом."""
    manager = JobManager(time_limit_s=0)
    job = _wait(manager, manager.submit(small_request))
    assert job.status == JobStatus.FAILED
    assert "не уложились" in job.error
    assert job.lessons is None


def test_unknown_job() -> None:
    """Неизвестный id."""
    with pytest.raises(JobNotFoundError):
        JobManager(time_limit_s=1).get("nope")
