from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.schemas import JobCreated, JobResponse, ScheduleRequest
from src.dependencies import get_job_manager
from src.service.jobs import JobManager
from src.service.scheduler import validate_request

router = APIRouter(prefix="/jobs", tags=["jobs"])

_Jobs = Annotated[JobManager, Depends(get_job_manager)]


@router.post("", status_code=202)
def create_job(request: ScheduleRequest, jobs: _Jobs) -> JobCreated:
    """Проверяет данные и ставит генерацию в очередь."""
    validate_request(request)
    return JobCreated(id=jobs.submit(request))


@router.get("/{job_id}")
def get_job(job_id: str, jobs: _Jobs) -> JobResponse:
    """Статус задачи, а когда готово, ещё и расписание."""
    return jobs.get(job_id)
