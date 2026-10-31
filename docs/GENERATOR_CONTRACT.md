# Контракт backend ↔ генератор расписания

Этот контракт описывает данные для одной функции Python. Он не задаёт HTTP API: backend отвечает за хранение, валидацию исходных данных, запуск функции, отмену и сохранение результата. Генератор получает готовый снимок входных данных и не обращается к БД.

## Интерфейс функции

```python
def generate_schedule(
    request: GenerationRequest,
    report_progress: ProgressCallback | None = None
) -> GenerationResult:
    ...
```

`GenerationRequest` и `GenerationResult` — типизированные объекты на Python-границе. При запуске отдельным процессом они сериализуются как JSON с полями `camelCase`; для Python-моделей можно задать aliases. Callback прогресса и отмены — локальные функции обвязки, не JSON-поля запроса.

- `report_progress(progress)` вызывается по мере поиска и принимает `GenerationProgress`.
- Ошибки входных данных и ошибки выполнения возвращаются как результат с диагностикой. Исключение допустимо только для аварии самой функции; backend преобразует его в ошибку задачи и не сохраняет расписание.

## Вход `GenerationRequest`

```json
{
    "jobId": "8a6603f7-1c1e-4dc6-8a3e-38e49695b375",
    "period": {
        "id": 12,
        "startsOn": "2026-09-01",
        "endsOn": "2026-12-31"
    },
    "weeks": [
        {
            "weekStartDate": "2026-09-07",
            "teacherAvailability": [
                {
                    "teacherId": 41,
                    "slots": [
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 1,
                            "state": "unavailable"
                        },
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 2,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 3,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 4,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 5,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 6,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 1,
                            "lessonNumber": 7,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 1,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 2,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 3,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 4,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 5,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 6,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 2,
                            "lessonNumber": 7,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 1,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 2,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 3,
                            "state": "preferred"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 4,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 5,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 6,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 3,
                            "lessonNumber": 7,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 1,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 2,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 3,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 4,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 5,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 6,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 4,
                            "lessonNumber": 7,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 1,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 2,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 3,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 4,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 5,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 6,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 5,
                            "lessonNumber": 7,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 1,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 2,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 3,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 4,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 5,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 6,
                            "state": "available"
                        },
                        {
                            "dayOfWeek": 6,
                            "lessonNumber": 7,
                            "state": "available"
                        }
                    ]
                }
            ]
        }
    ],
    "timetableSlots": [
        { "lessonNumber": 1, "startsAt": "09:00", "endsAt": "10:30" },
        { "lessonNumber": 2, "startsAt": "10:45", "endsAt": "12:15" },
        { "lessonNumber": 3, "startsAt": "13:00", "endsAt": "14:30" },
        { "lessonNumber": 4, "startsAt": "14:45", "endsAt": "16:15" },
        { "lessonNumber": 5, "startsAt": "16:30", "endsAt": "18:00" },
        { "lessonNumber": 6, "startsAt": "18:15", "endsAt": "19:45" },
        { "lessonNumber": 7, "startsAt": "20:00", "endsAt": "21:30" }
    ],
    "groups": [{ "id": 7, "studentCount": 24 }],
    "classrooms": [{ "id": 101, "capacity": 40 }],
    "requirements": [
        {
            "id": 501,
            "groupId": 7,
            "subjectId": 88,
            "teacherId": 41,
            "lessonType": "practice",
            "lessonsPerWeek": 2,
            "allowedDaysOfWeek": [1, 3, 5]
        }
    ],
    "timeLimitSeconds": 900,
    "randomSeed": 20261031,
    "weights": {
        "groupGaps": 10,
        "teacherGaps": 10,
        "groupMinimumDailyLoad": 1,
        "groupMaximumDailyLoad": 2,
        "teacherMinimumDailyLoad": 1,
        "teacherMaximumDailyLoad": 2,
        "groupLoadBalance": 5,
        "teacherLoadBalance": 5,
        "earlySlots": 1,
        "lateSlots": 1,
        "teacherPreferences": 10,
        "oversizedClassroom": 1
    },
    "qualityRules": {
        "earlyLessonNumbers": [1],
        "lateLessonNumbers": [7],
        "groupDailyLoad": { "minimum": 1, "maximum": 2 },
        "teacherDailyLoad": { "minimum": 1, "maximum": 3 },
        "oversizedRoomMaxUnusedSeats": 10
    }
}
```

### Объекты и поля входа

| Объект                  | Поля                                                                                             | Для чего нужны                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `period`                | `id: int`, `startsOn`, `endsOn: YYYY-MM-DD`                                                      | Контекст версии и проверка границ дат.                                                                                                                                  |
| `weeks[]`               | `weekStartDate` — понедельник; `teacherAvailability[]`                                           | Перечень учебных недель, на которые строится расписание. Backend исключает каникулы и даты вне периода.                                                                 |
| `teacherAvailability[]` | `teacherId: int`, `slots[]`                                                                      | Эффективная доступность преподавателя для конкретной недели: уже объединённый шаблон периода и недельное переопределение.                                               |
| `slots[]` доступности   | `dayOfWeek: 1..6`, `lessonNumber: 1..N`, `state`                                                 | `unavailable` — жёсткий запрет; `preferred` — мягкое предпочтение; `available` — без предпочтения. Передаётся ровно одна запись на каждую ячейку сетки (6 × число пар). |
| `timetableSlots[]`      | `lessonNumber`, `startsAt`, `endsAt` (`HH:MM`)                                                   | Доступные номера пар и их время. Генератор назначает именно `lessonNumber`.                                                                                             |
| `groups[]`              | `id: int`, `studentCount: int`                                                                   | Идентификатор группы и проверка вместимости аудитории.                                                                                                                  |
| `classrooms[]`          | `id: int`, `capacity: int`                                                                       | Только активные аудитории. Идентификатор результата и ограничение вместимости.                                                                                          |
| `requirements[]`        | `id`, `groupId`, `subjectId`, `teacherId`, `lessonType`, `lessonsPerWeek`, `allowedDaysOfWeek[]` | Каждое требование нужно выполнить заданное число раз в каждой переданной неделе. Преподаватель закреплён за требованием; квалификацию backend проверяет до вызова.      |
| `timeLimitSeconds`      | положительное целое число                                                                        | Верхняя граница поиска.                                                                                                                                                 |
| `randomSeed`            | целое или `null`                                                                                 | Необязательный seed для воспроизводимого запуска. Backend сохраняет его у задачи при необходимости повторить расчёт.                                                    |
| `weights`               | 12 целых неотрицательных коэффициентов                                                           | Веса критериев из панели настройки генерации. Ноль отключает соответствующий мягкий критерий.                                                                           |
| `qualityRules`          | границы нагрузок, номера ранних/поздних пар, порог пустых мест                                   | Конкретизирует смысл критериев, для которых одной величины веса недостаточно. Передаётся из конфигурации backend; значения не зашиты неявно в алгоритм.                 |

Все ID — положительные int32 из БД. Имена и отображаемые подписи генератору не нужны: backend подставляет их в API-ответы через JOIN. Нельзя передавать пароль, email или иные данные пользователей.

Доступность для каждой недели передаётся в эффективном виде. Для преподавателя без отдельных настроек backend передаёт 42 ячейки со `state: "available"`. Не передавайте в генератор сырые строки `teachers_preferences`: backend заранее переводит их в состояния API и применяет политику предпочтений.

### Жёсткие ограничения

Генератор должен соблюдать эти правила независимо от весов:

1. Для каждого требования и каждой недели назначить ровно `lessonsPerWeek` занятий.
2. Использовать только дни из `allowedDaysOfWeek`.
3. Не ставить в один день и пару одну группу или одного преподавателя дважды.
4. Не ставить в один день и пару две группы в одну аудиторию.
5. Не назначать `unavailable` слот преподавателю.
6. Вместимость аудитории должна быть не меньше `studentCount` группы.
7. Каждое назначение попадает в даты соответствующей недели и период.

Мягкие правила вычисляются с переданными `weights` и `qualityRules`. Для однозначного подсчёта предлагается такая единица штрафа:

- `groupGaps` / `teacherGaps`: число пустых пар между первой и последней назначенной парой сущности в день;
- `groupMinimumDailyLoad` / `teacherMinimumDailyLoad`: сумма недостающих пар до `minimum` по активным дням, когда в этот день у группы/преподавателя есть хотя бы одно занятие;
- `groupMaximumDailyLoad` / `teacherMaximumDailyLoad`: сумма пар сверх `maximum` по дням;
- `groupLoadBalance` / `teacherLoadBalance`: разница между максимальной и минимальной нагрузкой по активным дням;
- `earlySlots` / `lateSlots`: количество назначений на номера пар из переданных списков;
- `teacherPreferences`: назначение на непредпочтительную ячейку, если у преподавателя в этой неделе отмечена хотя бы одна предпочтительная ячейка; `unavailable` всегда остаётся жёстким запретом;
- `oversizedClassroom`: суммарное количество пустых мест сверх `oversizedRoomMaxUnusedSeats` для назначенных аудиторий.

Взвешенный вклад критерия равен его raw penalty, умноженному на соответствующий `weight`; `totalPenalty` равен сумме всех вкладов. Если жёсткие ограничения выполнимы, мягкие нарушения допустимы и только влияют на штраф. Если жёстких ограничений выполнить нельзя, функция возвращает `noSolution`.

## Прогресс `GenerationProgress`

```json
{
    "stage": "improving",
    "progressPercent": 42,
    "iterationsProcessed": 18000,
    "bestPenalty": 37.5,
    "message": "Найден вариант с меньшим штрафом"
}
```

`progressPercent` может быть `null`, если алгоритм не может оценить долю выполнения. `bestPenalty` — `null`, пока не найдено допустимое расписание. Backend добавляет время события и сохраняет сообщения в журнал задачи; генератору не нужно формировать системные timestamps.

## Результат `GenerationResult`

### Успешный результат

```json
{
  "status": "completed",
  "terminationReason": "timeLimit",
  "schedule": {
    "periodId": 12,
    "weeks": [
      {
        "weekStartDate": "2026-09-07",
        "days": [
          {
            "date": "2026-09-07",
            "dayOfWeek": 1,
            "lessons": [
              {
                "requirementId": 501,
                "occurrenceIndex": 1,
                "lessonNumber": 2,
                "groupId": 7,
                "subjectId": 88,
                "lessonType": "practice",
                "teacherId": 41,
                "classroomId": 101
              }
            ]
          },
          {"date": "2026-09-08", "dayOfWeek": 2, "lessons": []},
          {
            "date": "2026-09-09",
            "dayOfWeek": 3,
            "lessons": [
              {
                "requirementId": 501,
                "occurrenceIndex": 2,
                "lessonNumber": 3,
                "groupId": 7,
                "subjectId": 88,
                "lessonType": "practice",
                "teacherId": 41,
                "classroomId": 101
              }
            ]
          },
          {"date": "2026-09-10", "dayOfWeek": 4, "lessons": []},
          {"date": "2026-09-11", "dayOfWeek": 5, "lessons": []},
          {"date": "2026-09-12", "dayOfWeek": 6, "lessons": []}
        ]
      }
    ]
  },
  "quality": {
    "totalPenalty": 6,
    "breakdown": {
      "groupGaps": 0,
      "teacherGaps": 0,
      "groupMinimumDailyLoad": 0,
      "groupMaximumDailyLoad": 0,
      "teacherMinimumDailyLoad": 0,
      "teacherMaximumDailyLoad": 0,
      "groupLoadBalance": 0,
      "teacherLoadBalance": 0,
      "earlySlots": 0,
      "lateSlots": 0,
      "teacherPreferences": 0,
      "oversizedClassroom": 6
    }
  },
  "iterationsProcessed": 18000,
  "diagnostics": []
}
```

### Содержимое `schedule`

- `schedule.periodId` — период из запроса.
- `schedule.weeks[]` — каждая запрошенная учебная неделя ровно один раз.
- `weeks[].weekStartDate` — понедельник этой недели.
- `weeks[].days[]` — ровно шесть дней с `dayOfWeek` от 1 (понедельник) до 6 (суббота). В том числе дни без занятий: у них `lessons: []`.
- `days[].date` — календарная дата дня.
- `days[].lessons[]` — все назначенные в этот день пары. Если у разных групп занятия одновременно, это две записи с одинаковыми `lessonNumber`, но разными группами/преподавателями/аудиториями.
- Каждая запись `lessons[]` содержит требование и индекс его вхождения, номер пары, группу, дисциплину, тип, преподавателя и аудиторию. Пустая ячейка пары задаётся отсутствием записи с этим `lessonNumber`; backend или frontend отображает её пустой.

Таким образом, `schedule` — полное сгенерированное расписание по датам, дням и парам, а не только оценка результата. Backend преобразует эти записи в строки `lessons` и связи `lesson_version_items`, обогащает ответ человекочитаемыми названиями через БД. Время пары backend берёт из `timetableSlots` по `lessonNumber`.

`occurrenceIndex` назначается для каждого `requirementId` отдельно в каждой неделе после сортировки его пар по `date`, затем по `lessonNumber`; нумерация начинается с 1. Этот индекс позволяет сравнивать одно и то же недельное требование между версиями расписания.

### Статусы и поля результата

- `status`: `completed`, `noSolution`, `cancelled` или `error`.
- `terminationReason`: `optimal`, `timeLimit`, `infeasible`, `cancelled` или `error`.
- `schedule`: полное расписание только при `completed`; при остальных статусах — `null`. Частичный результат не становится версией расписания.
- Согласованные пары статуса и причины завершения: `completed` → `optimal` или `timeLimit`; `noSolution` → `infeasible` или `timeLimit`; `cancelled` → `cancelled`; `error` → `error`.
- `quality.totalPenalty`: сумма штрафов всех мягких критериев с учётом весов. Меньше — лучше.
- `quality.breakdown`: **взвешенный вклад** каждого критерия; сумма значений должна равняться `totalPenalty` с допустимой погрешностью округления.
- `iterationsProcessed`: число просмотренных/улучшенных вариантов, целое int64.
- `diagnostics[]`: структурированные причины отсутствия решения или ошибки.

Backend переводит `completed` в статус задачи `succeeded` и создаёт черновую версию. `noSolution` и `error` переводятся в `failed`; `cancelled` — в `cancelled`. При `completed` с `terminationReason: "timeLimit"` возвращается лучшее найденное допустимое расписание, а не обязательно оптимальное.

`GenerationDiagnostic`:

```json
{
    "code": "NO_ROOM_FOR_GROUP",
    "message": "Для группы 7 нет активной аудитории вместимостью не менее 24 мест",
    "requirementId": 501,
    "weekStartDate": "2026-09-07",
    "groupId": 7,
    "teacherId": 41,
    "dayOfWeek": null,
    "lessonNumber": null
}
```

Все идентификаторы и координаты диагностики, которые неизвестны, задаются `null`; поля `code` машинно-стабильны, `message` предназначено для журнала администратора. При `infeasible` генератор возвращает максимально конкретные причины, которые смог установить, например дефицит аудиторий, отсутствие доступных слотов преподавателя или недостаток допустимых дней.

## Граница ответственности

Backend до вызова проверяет ссылки, активность аудиторий, квалификацию преподавателя по дисциплине, количество 42 ячеек доступности, даты периода и непротиворечивость входного набора. Генератор строит назначения и оценивает качество. После возврата backend повторно валидирует назначения, формирует метрики API и сохраняет черновую версию. Публикация остаётся отдельным действием backend.
