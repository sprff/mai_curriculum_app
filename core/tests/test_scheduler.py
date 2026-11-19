from collections import Counter

import pytest

from src.exceptions import ScheduleTimeoutError
from src.schemas import Lesson, ScheduleRequest
from src.service.scheduler import Scheduler, _cost, _window_cost


def _clashes(lessons: list[Lesson]) -> int:
    """Сколько раз группа, препод или аудитория стоят дважды в одном слоте."""
    total = 0
    for key in ("group_id", "teacher_id", "classroom_id"):
        seen = Counter((getattr(x, key), x.day, x.lesson_number) for x in lessons)
        total += sum(n - 1 for n in seen.values())
    return total


def test_schedule_satisfies_hard_constraints(small_request: ScheduleRequest) -> None:
    """Все пары поставлены и ни одно жёсткое ограничение не нарушено."""
    lessons = Scheduler(time_limit_s=10).build(small_request)
    weekly = {s.id: s.weekly_number_of_lessons for s in small_request.subjects}
    size = {g.id: g.size for g in small_request.groups}
    capacity = {c.id_number: c.capacity for c in small_request.classrooms}
    can_teach = {(ts.teacher_id, ts.subject_id) for ts in small_request.teacher_subjects}

    assert _clashes(lessons) == 0
    count = Counter((x.group_id, x.subject_id) for x in lessons)
    assert count == {
        (gs.group_id, gs.subject_id): weekly[gs.subject_id] for gs in small_request.group_subjects
    }
    assert all(capacity[x.classroom_id] >= size[x.group_id] for x in lessons)
    assert all((x.teacher_id, x.subject_id) in can_teach for x in lessons)
    assert all(n == 1 for n in Counter((x.group_id, x.subject_id, x.day) for x in lessons).values())
    teachers = {}
    for x in lessons:
        assert teachers.setdefault((x.group_id, x.subject_id), x.teacher_id) == x.teacher_id


def test_same_input_same_schedule(small_request: ScheduleRequest) -> None:
    """Генерация детерминирована: одинаковый вход даёт одинаковое расписание."""
    scheduler = Scheduler(time_limit_s=10)
    assert scheduler.build(small_request) == scheduler.build(small_request)


def test_timeout(small_request: ScheduleRequest) -> None:
    """Лимит времени соблюдается."""
    with pytest.raises(ScheduleTimeoutError):
        Scheduler(time_limit_s=0).build(small_request)


def test_window_cost_is_quadratic() -> None:
    """Окно в две пары стоит как четыре окна в одну пару."""
    assert _window_cost({1, 2, 3}) == 0
    assert _window_cost({1, 3}) == 1
    assert _window_cost({1, 4}) == 4
    assert _window_cost({1, 3, 5}) == 2


def test_extra_attempts_not_worse(small_request: ScheduleRequest) -> None:
    """Дополнительные попытки не ухудшают штраф расписания."""
    one = Scheduler(time_limit_s=10, extra_attempts=0).build(small_request)
    many = Scheduler(time_limit_s=10, extra_attempts=3).build(small_request)
    assert _cost(many) <= _cost(one)
