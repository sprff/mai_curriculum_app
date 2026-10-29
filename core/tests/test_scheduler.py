from collections import Counter

import pytest

from src.api.schemas import GroupSubject, Lesson, ScheduleRequest
from src.exceptions import InvalidRequestError, ScheduleTimeoutError
from src.service.scheduler import build_schedule, validate_request


def _clashes(lessons: list[Lesson]) -> int:
    """Сколько раз группа, препод или аудитория стоят дважды в одном слоте."""
    total = 0
    for key in ("group_id", "teacher_id", "classroom_id"):
        seen = Counter((getattr(x, key), x.day, x.lesson_number) for x in lessons)
        total += sum(n - 1 for n in seen.values())
    return total


def test_schedule_satisfies_hard_constraints(small_request: ScheduleRequest) -> None:
    """Все пары поставлены и ни одно жёсткое ограничение не нарушено."""
    lessons = build_schedule(small_request, time_limit_s=10)
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


def test_unknown_subject_rejected(small_request: ScheduleRequest) -> None:
    """Ссылка на несуществующую дисциплину."""
    small_request.group_subjects.append(GroupSubject(group_id=1, subject_id=99))
    with pytest.raises(InvalidRequestError, match="нет дисциплины 99"):
        validate_request(small_request)


def test_subject_without_teacher_rejected(small_request: ScheduleRequest) -> None:
    """Дисциплину никто не может вести."""
    small_request.teacher_subjects = [ts for ts in small_request.teacher_subjects if ts.subject_id != 2]
    with pytest.raises(InvalidRequestError, match="дисциплину 2 никто не может вести"):
        validate_request(small_request)


def test_group_too_big_rejected(small_request: ScheduleRequest) -> None:
    """Группа не влезает ни в одну аудиторию."""
    small_request.groups[0].size = 100
    with pytest.raises(InvalidRequestError, match="нет аудитории на 100"):
        validate_request(small_request)


def test_timeout(small_request: ScheduleRequest) -> None:
    """Лимит времени соблюдается."""
    with pytest.raises(ScheduleTimeoutError):
        build_schedule(small_request, time_limit_s=0)
