"""HTTP API ядра: запуск генерации расписания, статус задачи и отмена."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.exceptions import JobNotFoundError
from src.schemas import ScheduleRequest
from src.service.job_manager import JobManager, JobState
from src.service.validator import ValidationIssue, validate

app = FastAPI(title="MAI Curriculum Core")
job_manager = JobManager()


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
def create_job(request: ScheduleRequest) -> JobCreated | JSONResponse:
    """Проверяет данные и ставит генерацию в очередь."""
    issues = validate(request)
    if issues:
        return JSONResponse(status_code=422, content=ValidationIssues(issues=issues).model_dump())
    return JobCreated(job_id=job_manager.submit(request))


@app.get("/jobs/{job_id}", responses=NOT_FOUND)
def get_job(job_id: str) -> JobState:
    """Возвращает состояние задачи."""
    try:
        return job_manager.get(job_id)
    except JobNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/jobs/{job_id}/cancel", responses=NOT_FOUND)
def cancel_job(job_id: str) -> JobState:
    """Отменяет задачу."""
    try:
        return job_manager.cancel(job_id)
    except JobNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
