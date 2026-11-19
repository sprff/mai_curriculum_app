from threading import Event
from typing import Callable

from pydantic import Field

from src.constants import DAYS_PER_WEEK, LESSONS_PER_DAY
from src.schemas import Lesson, ScheduleRequest, _Frozen
from src.service.scheduler import Scheduler, _Pair, _Placement, _Slot

_W_TEACHER_PREFERENCE = 5


class _TeacherSlot(_Frozen):
    """Слот преподавателя в учебной неделе."""

    teacher_id: int
    day: int = Field(ge=0, lt=DAYS_PER_WEEK)
    lesson_number: int = Field(ge=1, le=LESSONS_PER_DAY)


class TeacherPreferredSlot(_TeacherSlot):
    """Предпочтительный слот преподавателя."""


class TeacherUnavailableSlot(_TeacherSlot):
    """Слот, в котором преподаватель не может вести пару."""


class PreferredScheduleRequest(ScheduleRequest):
    """Снимок данных для генерации с учётом отметок преподавателей."""

    teacher_preferred_slots: list[TeacherPreferredSlot] = Field(default_factory=list)
    teacher_unavailable_slots: list[TeacherUnavailableSlot] = Field(default_factory=list)


class PreferredScheduler(Scheduler):
    """Генератор расписания с учётом предпочтений и недоступности преподавателей."""

    def build(
        self,
        request: ScheduleRequest,
        progress_callback: Callable[[int, int], None] | None = None,
        cancel_event: Event | None = None,
    ) -> list[Lesson]:
        """Подготавливает отметки и запускает поиск базового генератора."""
        preferences: list[TeacherPreferredSlot] = []
        unavailable: list[TeacherUnavailableSlot] = []
        if isinstance(request, PreferredScheduleRequest):
            preferences = request.teacher_preferred_slots
            unavailable = request.teacher_unavailable_slots

        # Все попытки поиска в рамках одной генерации используют одни и те же отметки
        self._preferred_slots = {
            (mark.teacher_id, _Slot(mark.day, mark.lesson_number))
            for mark in preferences
        }
        self._unavailable_slots = {
            (mark.teacher_id, _Slot(mark.day, mark.lesson_number))
            for mark in unavailable
        }

        return super().build(request, progress_callback=progress_callback, cancel_event=cancel_event)

    def _free_teacher(self, pair: _Pair, slot: _Slot) -> int | None:
        """Выбирает доступного и свободного препода с учётом отметки и загрузки."""
        if not self._preferred_slots and not self._unavailable_slots:
            return super()._free_teacher(pair, slot)

        chosen = self._chosen_teacher.get((pair.group_id, pair.subject_id))
        candidates = [chosen] if chosen is not None else self._teachers_for[pair.subject_id]

        # Сначала исключаем недоступных, чтобы предпочтение не могло обойти запрет
        free = [
            t
            for t in candidates
            if (t, slot) not in self._unavailable_slots
            and slot.lesson_number not in self._teacher_day[(t, slot.day)]
        ]

        # При равных предпочтениях сохраняем выбор по меньшей загрузке
        return min(
            free,
            key=lambda t: ((t, slot) not in self._preferred_slots, self._teacher_load[t]),
            default=None,
        )

    def _preference_cost(self, teacher_id: int, slot: _Slot) -> int:
        """Снижает штраф за пару в отмеченном преподавателем слоте."""
        return -_W_TEACHER_PREFERENCE * ((teacher_id, slot) in self._preferred_slots)

    def _penalty(self, pair: _Pair, placement: _Placement) -> int:
        """Учитывает предпочтение при выборе времени для пары."""
        return super()._penalty(pair, placement) + self._preference_cost(placement.teacher_id, placement.slot)

    def _move_delta(self, group_id: int, teacher_id: int, old: _Slot, new: _Slot) -> int:
        """Учитывает недоступность и изменение бонуса при переносе пары."""
        if (teacher_id, new) in self._unavailable_slots:
            # Локальный поиск принимает только переносы со строго отрицательным delta
            return 0

        delta = super()._move_delta(group_id, teacher_id, old, new)

        # При переносе заменяем вклад старого слота в штраф вкладом нового
        return delta + self._preference_cost(teacher_id, new) - self._preference_cost(teacher_id, old)