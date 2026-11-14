# Структура проекта
```
- backend: Реализация backend HTTP сервера
- frontend: Реализация frontend
- core: Реализация алгоритма построения расписания
- common: Папка для хранения общих ресурсов таких как openapi спецификация
```

# Старт работы

## Подключение хуков
`git config core.hooksPath .githooks`

## Запуск HTTP-сервера

```
cd backend
set -a
source .env
set +a
make generate
make start
```

Настройки сервера, PostgreSQL и core задаются в `backend/configs/config.yaml`.
Пароль PostgreSQL читается из переменной окружения `PG_PASSWORD`.
Локальный `configs/config.yml` больше не используется.
