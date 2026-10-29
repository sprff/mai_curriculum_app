from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.api.router import router
from src.exceptions import InvalidRequestError, JobNotFoundError

app = FastAPI(title="core")
app.include_router(router)


@app.exception_handler(InvalidRequestError)
def _invalid_request(_: Request, exc: InvalidRequestError) -> JSONResponse:
    """Противоречивые данные: 422 с текстом проблем."""
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(JobNotFoundError)
def _job_not_found(_: Request, exc: JobNotFoundError) -> JSONResponse:
    """Неизвестный id задачи: 404."""
    return JSONResponse(status_code=404, content={"detail": f"задача {exc} не найдена"})
