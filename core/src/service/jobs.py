import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

from src.api.schemas import JobResponse, JobStatus, ScheduleRequest
from src.exceptions import CoreError, JobNotFoundError
from src.service.scheduler import build_schedule


class JobManager:
    """Задачи генерации в памяти процесса, считаются по одной в фоновом потоке."""

    def __init__(self, time_limit_s: float) -> None:
        """time_limit_s: лимит времени на одну генерацию."""
        self._time_limit_s = time_limit_s
        self._jobs: dict[str, JobResponse] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=1)

    def submit(self, request: ScheduleRequest) -> str:
        """Ставит генерацию в очередь и сразу возвращает id задачи."""
        job_id = uuid.uuid4().hex
        with self._lock:
            self._jobs[job_id] = JobResponse(id=job_id, status=JobStatus.QUEUED)
        self._executor.submit(self._run, job_id, request)
        return job_id

    def get(self, job_id: str) -> JobResponse:
        """Текущее состояние задачи."""
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None:
            raise JobNotFoundError(job_id)
        return job

    def _set(self, job_id: str, **fields: object) -> None:
        """Обновляет задачу целиком, чтобы читатель не увидел её наполовину изменённой."""
        with self._lock:
            self._jobs[job_id] = self._jobs[job_id].model_copy(update=fields)

    def _run(self, job_id: str, request: ScheduleRequest) -> None:
        """Выполняет генерацию в фоне."""
        self._set(job_id, status=JobStatus.RUNNING)
        try:
            lessons = build_schedule(request, self._time_limit_s)
        except CoreError as e:
            self._set(job_id, status=JobStatus.FAILED, error=str(e))
            return
        self._set(job_id, status=JobStatus.DONE, lessons=lessons)
