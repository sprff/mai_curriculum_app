"""Очередь фоновых задач для генератора расписания"""

from copy import deepcopy
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from queue import Queue
from threading import Event, Lock, Thread
from typing import Callable
from uuid import uuid4

from src.exceptions import JobNotFoundError, ScheduleCancelledError
from src.schemas import Lesson, ScheduleRequest
from src.service.scheduler import Scheduler

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class JobState:
    """Состояние задачи, которое можно безопасно вернуть вызывающему коду"""

    id: str
    status: str
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    progress_placed: int
    progress_total: int
    error: str | None
    result: list[Lesson] | None
    cancel_requested: bool


@dataclass
class _JobRecord:
    """Внутренние данные задачи, которые меняются во время работы"""

    id: str
    request: ScheduleRequest
    created_at: datetime
    status: str = "queued"
    started_at: datetime | None = None
    finished_at: datetime | None = None
    progress_placed: int = 0
    progress_total: int = 0
    error: str | None = None
    result: list[Lesson] | None = None
    cancel_event: Event = field(default_factory=Event)
    logged_progress_percent: int = 0


class JobManager:
    """Хранит задачи в памяти и обрабатывает их последовательно"""

    def __init__(
        self,
        time_limit_s: float = 120,
        scheduler_factory: Callable[[float], Scheduler] = Scheduler,
    ) -> None:
        # Словарь позволяет быстро найти задачу по её id
        self._jobs: dict[str, _JobRecord] = {}

        # Очередь сохраняет порядок поступления запросов
        self._queue: Queue[str] = Queue()

        # Блокировка не даёт разным потокам менять задачу одновременно
        self._lock = Lock()
        self._time_limit_s = time_limit_s
        self._scheduler_factory = scheduler_factory

        # Только один рабочий поток, поэтому одновременно выполняется одна задача
        self._worker = Thread(target=self._run_worker, daemon=True, name="schedule-job-worker")
        self._worker.start()

    def submit(self, request: ScheduleRequest) -> str:
        """Создаёт задачу, ставит в очередь и сразу возвращает её id"""
        # Сохраняем копию, чтобы изменения данных после запуска не влияли на задачу
        saved_request = request.model_copy(deep=True)
        weekly = {subject.id: subject.weekly_number_of_lessons for subject in saved_request.subjects}
        total = sum(weekly[gs.subject_id] for gs in saved_request.group_subjects)

        job_id = uuid4().hex
        record = _JobRecord(
            id=job_id,
            request=saved_request,
            created_at=datetime.now(timezone.utc),
            progress_total=total,
        )

        with self._lock:
            self._jobs[job_id] = record

        # Логируем создание до запуска, чтобы события шли в правильном порядке
        logger.info("Задача создана: id=%s, статус=queued, пар=%d", job_id, total)
        self._queue.put(job_id)
        return job_id

    def get(self, job_id: str) -> JobState:
        """Возвращает состояние задачи на момент запроса"""
        with self._lock:
            record = self._find(job_id)
            return self._snapshot(record)

    def cancel(self, job_id: str) -> JobState:
        """Отменяет задачу в очереди или отправляет сигнал работающей задаче"""
        action = None
        with self._lock:
            record = self._find(job_id)

            if record.status == "queued":
                # Задача ещё не запустилась, сразу отмечаем её отменённой
                record.cancel_event.set()
                record.status = "cancelled"
                record.finished_at = datetime.now(timezone.utc)
                action = "Задача отменена в очереди"
            elif record.status == "running":
                # Работающая задача увидит сигнал при следующей проверке
                record.cancel_event.set()
                action = "Запрошена отмена работающей задачи"

            # Для done, failed и cancelled повторная отмена ничего не меняет
            state = self._snapshot(record)

        if action is not None:
            logger.info("%s: id=%s", action, job_id)
        return state

    def _find(self, job_id: str) -> _JobRecord:
        """Ищет задачу, вызывается только внутри блокировки"""
        record = self._jobs.get(job_id)
        if record is None:
            raise JobNotFoundError(f"задача {job_id} не найдена")
        return record

    def _snapshot(self, record: _JobRecord) -> JobState:
        """Копирует результат, чтобы его нельзя было изменить снаружи"""
        return JobState(
            id=record.id,
            status=record.status,
            created_at=record.created_at,
            started_at=record.started_at,
            finished_at=record.finished_at,
            progress_placed=record.progress_placed,
            progress_total=record.progress_total,
            error=record.error,
            result=deepcopy(record.result),
            cancel_requested=record.cancel_event.is_set(),
        )

    def _update_progress(self, job_id: str, placed: int, total: int) -> None:
        """Сохраняет прогресс; пишет в лог не чаще каждого нового десятка процентов"""
        logged_percent = None
        with self._lock:
            record = self._jobs[job_id]
            if record.status == "running":
                record.progress_placed = placed
                record.progress_total = total

                if total > 0:
                    percent = min(100, max(0, placed * 100 // total))
                    bucket = percent // 10 * 10
                    if bucket > record.logged_progress_percent:
                        record.logged_progress_percent = bucket
                        logged_percent = bucket

        if logged_percent is not None:
            logger.info("Прогресс генерации: id=%s, %d%% (%d/%d)", job_id, logged_percent, placed, total)

    def _run_worker(self) -> None:
        """Забирает задачи из очереди и выполняет их по одной"""
        while True:
            job_id = self._queue.get()
            try:
                with self._lock:
                    record = self._jobs[job_id]
                    if record.status == "cancelled":
                        # Отменённая задача остаётся в истории, но не запускается
                        continue
                    record.status = "running"
                    record.started_at = datetime.now(timezone.utc)

                logger.info("Генерация началась: id=%s, статус=running", job_id)
                try:
                    scheduler = self._scheduler_factory(self._time_limit_s)
                    result = scheduler.build(
                        record.request,
                        progress_callback=lambda placed, total: self._update_progress(job_id, placed, total),
                        cancel_event=record.cancel_event,
                    )
                    with self._lock:
                        if record.cancel_event.is_set():
                            # Отмена могла прийти прямо перед завершением генерации
                            record.status = "cancelled"
                        else:
                            record.status = "done"
                            record.progress_placed = record.progress_total
                            record.result = result
                        record.finished_at = datetime.now(timezone.utc)
                        final_status = record.status

                    logger.info("Генерация завершена: id=%s, статус=%s", job_id, final_status)
                except ScheduleCancelledError:
                    with self._lock:
                        record.status = "cancelled"
                        record.finished_at = datetime.now(timezone.utc)
                    logger.info("Генерация отменена: id=%s, статус=cancelled", job_id)
                except Exception as error:
                    with self._lock:
                        # Сюда попадёт и ScheduleTimeoutError
                        if record.cancel_event.is_set():
                            record.status = "cancelled"
                        else:
                            record.status = "failed"
                            record.error = str(error)
                        record.finished_at = datetime.now(timezone.utc)
                        final_status = record.status

                    if final_status == "failed":
                        # Добавляем traceback: по нему удобнее искать причину ошибки
                        logger.exception("Ошибка генерации: id=%s, статус=failed", job_id)
                    else:
                        logger.info("Генерация отменена: id=%s, статус=cancelled", job_id)
            finally:
                # Сообщаем очереди, что эта задача больше не выполняется
                self._queue.task_done()
