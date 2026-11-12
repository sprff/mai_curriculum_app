# core

Генератор недельного расписания: `Scheduler(time_limit_s).build(request) -> list[Lesson]`.

Вход и выход описаны в `src/schemas.py`. Вход должен быть провалидирован заранее: генератор не проверяет ссылки и не ищет противоречия в данных.

```bash
pip install -e ".[dev]"
pytest
```

## API

HTTP-сервер для бэкенда: валидирует данные и запускает генерацию в фоне.

```bash
uvicorn src.api:app --reload
```

Документация и контракт: http://127.0.0.1:8000/docs (OpenAPI — `/openapi.json`).

- `POST /jobs` — данные в формате `ScheduleRequest`. Ответ `202 {"job_id": "..."}`; при ошибках формата или проблемах в данных — `422 {"issues": [{"code": "...", "message": "..."}]}`, генерация не запускается.
- `GET /jobs/{job_id}` — состояние задачи: `status` (`queued` / `running` / `done` / `failed` / `cancelled`), прогресс, `error`. При `done` в `result` — список пар (`Lesson`); `day` — день недели от 0 (пн) до 5 (сб).
- `POST /jobs/{job_id}/cancel` — отмена задачи.
- `404` — задачи с таким `job_id` нет.