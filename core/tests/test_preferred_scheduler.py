import pytest

from src.constants import DAYS_PER_WEEK, LESSONS_PER_DAY
from src.exceptions import NoSolutionError
from src.schemas import Classroom, Group, GroupSubject, Subject, TeacherSubject
from src.service.preferred_scheduler import (
    PreferredScheduleRequest,
    PreferredScheduler,
    TeacherPreferredSlot,
    TeacherUnavailableSlot,
)


@pytest.fixture
def single_lesson_request() -> PreferredScheduleRequest:
    """Одна группа, одна дисциплина и один преподаватель."""
    return PreferredScheduleRequest(
        classrooms=[Classroom(id_number=101, capacity=30)],
        groups=[Group(id=1, size=20)],
        subjects=[Subject(id=1, weekly_number_of_lessons=1)],
        teacher_subjects=[TeacherSubject(teacher_id=1, subject_id=1)],
        group_subjects=[GroupSubject(group_id=1, subject_id=1)],
    )


def test_preferred_scheduler_keeps_marked_slot_after_improvement(
    single_lesson_request: PreferredScheduleRequest,
) -> None:
    """Выбирает преподавателя с отметкой и сохраняет слот после локального поиска."""
    single_lesson_request.teacher_subjects.append(TeacherSubject(teacher_id=2, subject_id=1))
    single_lesson_request.teacher_preferred_slots.append(
        TeacherPreferredSlot(teacher_id=2, day=1, lesson_number=1)
    )

    (lesson,) = PreferredScheduler(time_limit_s=10).build(single_lesson_request)

    assert (lesson.teacher_id, lesson.day, lesson.lesson_number) == (2, 1, 1)


def test_preferred_scheduler_does_not_double_book_teacher() -> None:
    """Ставит занятия двух групп с одним преподавателем на разные слоты."""
    request = PreferredScheduleRequest(
        classrooms=[
            Classroom(id_number=101, capacity=30),
            Classroom(id_number=102, capacity=30),
        ],
        groups=[Group(id=1, size=20), Group(id=2, size=20)],
        subjects=[Subject(id=1, weekly_number_of_lessons=1)],
        teacher_subjects=[TeacherSubject(teacher_id=1, subject_id=1)],
        group_subjects=[
            GroupSubject(group_id=1, subject_id=1),
            GroupSubject(group_id=2, subject_id=1),
        ],
        teacher_preferred_slots=[
            TeacherPreferredSlot(teacher_id=1, day=1, lesson_number=1),
        ],
    )

    lessons = PreferredScheduler(time_limit_s=10).build(request)
    slots = {(lesson.day, lesson.lesson_number) for lesson in lessons}

    assert len(lessons) == 2
    assert len(slots) == 2
    assert (1, 1) in slots


def test_preferred_scheduler_gives_unavailability_priority(
    single_lesson_request: PreferredScheduleRequest,
) -> None:
    """Запрет действует, даже если преподаватель отметил тот же слот как предпочтительный."""
    single_lesson_request.teacher_preferred_slots.append(
        TeacherPreferredSlot(teacher_id=1, day=0, lesson_number=2)
    )
    single_lesson_request.teacher_unavailable_slots.append(
        TeacherUnavailableSlot(teacher_id=1, day=0, lesson_number=2)
    )

    (lesson,) = PreferredScheduler(time_limit_s=10).build(single_lesson_request)

    assert (lesson.day, lesson.lesson_number) != (0, 2)


def test_preferred_scheduler_does_not_move_lesson_to_unavailable_slot(
    single_lesson_request: PreferredScheduleRequest,
) -> None:
    """Оставляет пару в единственном доступном слоте даже со штрафом за раннее время."""
    single_lesson_request.teacher_unavailable_slots = [
        TeacherUnavailableSlot(teacher_id=1, day=day, lesson_number=number)
        for day in range(DAYS_PER_WEEK)
        for number in range(1, LESSONS_PER_DAY + 1)
        if (day, number) != (0, 1)
    ]

    (lesson,) = PreferredScheduler(time_limit_s=10).build(single_lesson_request)

    assert (lesson.day, lesson.lesson_number) == (0, 1)


def test_preferred_scheduler_raises_when_teacher_has_no_available_slots(
    single_lesson_request: PreferredScheduleRequest,
) -> None:
    """Сообщает об отсутствии решения, когда единственный преподаватель недоступен всю неделю."""
    single_lesson_request.teacher_unavailable_slots = [
        TeacherUnavailableSlot(teacher_id=1, day=day, lesson_number=number)
        for day in range(DAYS_PER_WEEK)
        for number in range(1, LESSONS_PER_DAY + 1)
    ]

    with pytest.raises(NoSolutionError):
        PreferredScheduler(time_limit_s=10).build(single_lesson_request)