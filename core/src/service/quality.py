from collections import Counter, defaultdict
from dataclasses import dataclass

from src.schemas import Lesson, ScheduleRequest

LATE_FROM = 6
MAX_PER_DAY = 4


@dataclass
class QualityReport:
    """Оценка готового расписания."""

    first_lessons: int = 0
    late_lessons: int = 0
    group_windows: int = 0
    teacher_windows: int = 0
    overloaded_days: int = 0
    group_clashes: int = 0
    teacher_clashes: int = 0
    room_clashes: int = 0
    capacity_violations: int = 0
    foreign_teachers: int = 0
    missing_lessons: int = 0

    @property
    def is_valid(self) -> bool:
        """Жёсткие ограничения не нарушены: расписание можно публиковать."""
        hard = (
            self.group_clashes,
            self.teacher_clashes,
            self.room_clashes,
            self.capacity_violations,
            self.foreign_teachers,
            self.missing_lessons,
        )
        return not any(hard)


def evaluate(request: ScheduleRequest, lessons: list[Lesson]) -> QualityReport:
    """Считает показатели качества расписания."""
    return QualityReport(
        first_lessons=sum(x.lesson_number == 1 for x in lessons),
        late_lessons=sum(x.lesson_number >= LATE_FROM for x in lessons),
        group_windows=_windows(lessons, "group_id"),
        teacher_windows=_windows(lessons, "teacher_id"),
        overloaded_days=sum(n > MAX_PER_DAY for n in Counter((x.group_id, x.day) for x in lessons).values()),
        group_clashes=_clashes(lessons, "group_id"),
        teacher_clashes=_clashes(lessons, "teacher_id"),
        room_clashes=_clashes(lessons, "classroom_id"),
        capacity_violations=_capacity_violations(request, lessons),
        foreign_teachers=_foreign_teachers(request, lessons),
        missing_lessons=_missing_lessons(request, lessons),
    )


def _windows(lessons: list[Lesson], who: str) -> int:
    """Окна по дням у групп (who="group_id") или у преподавателей (who="teacher_id")."""
    days: dict[tuple[int, int], set[int]] = defaultdict(set)
    for x in lessons:
        days[(getattr(x, who), x.day)].add(x.lesson_number)
    return sum(max(s) - min(s) + 1 - len(s) for s in days.values())


def _clashes(lessons: list[Lesson], who: str) -> int:
    """Сколько раз группа, преподаватель или аудитория (поле who) стоят дважды в одном слоте."""
    seen = Counter((getattr(x, who), x.day, x.lesson_number) for x in lessons)
    return sum(n - 1 for n in seen.values())


def _capacity_violations(request: ScheduleRequest, lessons: list[Lesson]) -> int:
    """Пары, где группа не помещается в аудиторию."""
    size = {g.id: g.size for g in request.groups}
    capacity = {c.id_number: c.capacity for c in request.classrooms}
    return sum(size[x.group_id] > capacity[x.classroom_id] for x in lessons)


def _foreign_teachers(request: ScheduleRequest, lessons: list[Lesson]) -> int:
    """Пары, которые ведёт преподаватель, не закреплённый за дисциплиной."""
    can_teach = {(ts.teacher_id, ts.subject_id) for ts in request.teacher_subjects}
    return sum((x.teacher_id, x.subject_id) not in can_teach for x in lessons)


def _missing_lessons(request: ScheduleRequest, lessons: list[Lesson]) -> int:
    """Сколько пар из учебного плана не поставлено."""
    weekly = {s.id: s.weekly_number_of_lessons for s in request.subjects}
    placed = Counter((x.group_id, x.subject_id) for x in lessons)
    return sum(
        max(weekly[gs.subject_id] - placed[(gs.group_id, gs.subject_id)], 0) for gs in request.group_subjects
    )
