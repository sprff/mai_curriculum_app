# core

Генератор недельного расписания: `Scheduler(time_limit_s).build(request) -> list[Lesson]`.

Вход и выход описаны в `src/schemas.py`. Вход должен быть провалидирован заранее: генератор не проверяет ссылки и не ищет противоречия в данных.

```bash
pip install -e ".[dev]"
pytest
```
