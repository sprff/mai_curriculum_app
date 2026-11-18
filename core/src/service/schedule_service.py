from src.schemas import ScheduleRequest
from src.service.job_manager import JobManager, JobState
from src.service.validator import ValidationIssue, validate


class ScheduleValidationError(Exception):
    """Входные данные не прошли проверку перед генерацией."""

    def __init__(self, issues: list[ValidationIssue]) -> None:
        super().__init__("Входные данные не прошли проверку")
        self.issues = issues


class ScheduleService:
    """Предоставляет API операции запуска, статуса и отмены генерации."""

    def __init__(self, job_manager: JobManager) -> None:
        self._job_manager = job_manager

    def start(self, request: ScheduleRequest) -> str:
        """Проверяет данные и возвращает ID поставленной в очередь задачи."""
        issues = validate(request)
        if issues:
            raise ScheduleValidationError(issues)

        return self._job_manager.submit(request)

    def get_status(self, job_id: str) -> JobState:
        """Возвращает текущее состояние задачи."""
        return self._job_manager.get(job_id)

    def cancel(self, job_id: str) -> JobState:
        """Запрашивает отмену и возвращает текущее состояние задачи."""
        return self._job_manager.cancel(job_id)
