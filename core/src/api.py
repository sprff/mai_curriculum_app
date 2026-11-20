"""HTTP API ядра: запуск генерации расписания, статус задачи и отмена."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.exceptions import JobNotFoundError
from src.service.job_manager import JobManager, JobState
from src.service.preferred_scheduler import PreferredScheduler, PreferredScheduleRequest
from src.service.schedule_service import ScheduleService, ScheduleValidationError
from src.service.validator import ValidationIssue

app = FastAPI(title="MAI Curriculum Core")
job_manager = JobManager(scheduler_factory=PreferredScheduler)
schedule_service = ScheduleService(job_manager)


class JobCreated(BaseModel):
    """Ответ на запуск генерации: номер созданной задачи."""

    job_id: str


class ValidationIssues(BaseModel):
    """Ответ, если валидатор нашёл проблемы в данных."""

    issues: list[ValidationIssue]


NOT_FOUND = {404: {"description": "Задачи с таким номером нет"}}


@app.exception_handler(RequestValidationError)
def wrong_format(request: Request, error: RequestValidationError) -> JSONResponse:
    """Неверный формат JSON: отвечаем в том же виде, что и при проблемах от валидатора."""
    issues = [
        ValidationIssue("invalid_format", f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}")
        for item in error.errors()
    ]
    return JSONResponse(status_code=422, content=ValidationIssues(issues=issues).model_dump())


@app.post(
    "/jobs",
    status_code=202,
    response_model=JobCreated,
    responses={
        422: {
            "model": ValidationIssues,
            "description": "Неверный формат или проблемы в данных, генерация не запущена",
        }
    },
)
def create_job(request: PreferredScheduleRequest) -> JobCreated | JSONResponse:
    """Принимает запрос на запуск генерации."""
    try:
        job_id = schedule_service.start(request)
    except ScheduleValidationError as error:
        return JSONResponse(
            status_code=422,
            content=ValidationIssues(issues=error.issues).model_dump(),
        )
    return JobCreated(job_id=job_id)


@app.get("/jobs/{job_id}", responses=NOT_FOUND)
def get_job(job_id: str) -> JobState:
    """Возвращает состояние задачи."""
    try:
        return schedule_service.get_status(job_id)
    except JobNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/jobs/{job_id}/cancel", responses=NOT_FOUND)
def cancel_job(job_id: str) -> JobState:
    """Отменяет задачу."""
    try:
        return schedule_service.cancel(job_id)
    except JobNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
