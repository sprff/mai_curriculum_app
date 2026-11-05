"""Проверка входных данных до запуска генератора.
Если validate вернула пустой список - можно запускать генератор.
При этом нет гарантии, что расписание найдётся."""

from src.schemas import ScheduleRequest

DAYS_PER_WEEK = 6
LESSONS_PER_DAY = 7
SLOTS_PER_WEEK = DAYS_PER_WEEK * LESSONS_PER_DAY


def validate(request: ScheduleRequest) -> list[str]:
    """Возвращает список проблем."""
    errors = check_references(request)
    if errors:
        return errors
    return check_contradictions(request) + check_capacity(request)


def check_references(request: ScheduleRequest) -> list[str]:
    """Проверяет, что нет ссылок на несуществующие группы и дисциплины,
    и группа не изучает одну дисциплину дважды."""
    errors = []
    group_ids = {g.id for g in request.groups}
    subject_ids = {s.id for s in request.subjects}

    for ts in request.teacher_subjects:
        if ts.subject_id not in subject_ids:
            errors.append(
                f"преподаватель {ts.teacher_id} ведёт дисциплину {ts.subject_id}, которой нет в списке"
            )

    seen = set()
    for gs in request.group_subjects:
        if gs.group_id not in group_ids:
            errors.append(f"группы {gs.group_id} нет в списке групп")
        if gs.subject_id not in subject_ids:
            errors.append(f"группа {gs.group_id} изучает дисциплину {gs.subject_id}, которой нет в списке")
        if (gs.group_id, gs.subject_id) in seen:
            errors.append(f"группа {gs.group_id} изучает дисциплину {gs.subject_id} дважды")
        seen.add((gs.group_id, gs.subject_id))

    return errors


def check_contradictions(request: ScheduleRequest) -> list[str]:
    """Проверяет, что у дисциплины есть преподаватель, группа помещается в аудиторию,
    у группы не больше 42 пар и дисциплина у группы стоит не чаще раза в день."""
    errors = []

    subjects_with_teacher = {ts.subject_id for ts in request.teacher_subjects}
    for subject_id in sorted({gs.subject_id for gs in request.group_subjects}):
        if subject_id not in subjects_with_teacher:
            errors.append(f"дисциплину {subject_id} некому вести: у неё нет ни одного преподавателя")

    biggest_room = max((c.capacity for c in request.classrooms), default=0)
    for g in request.groups:
        if g.size > biggest_room:
            errors.append(
                f"группа {g.id} ({g.size} чел.) не помещается ни в одну аудиторию, "
                f"самая большая аудитория на {biggest_room} мест"
            )

    for group_id, lessons in count_group_lessons(request).items():
        if lessons > SLOTS_PER_WEEK:
            errors.append(
                f"у группы {group_id} {lessons} пар в неделю, а в сетке всего {SLOTS_PER_WEEK} слота"
            )

    for s in request.subjects:
        if s.weekly_number_of_lessons > DAYS_PER_WEEK:
            errors.append(
                f"у дисциплины {s.id} {s.weekly_number_of_lessons} пар в неделю, а максимум - {DAYS_PER_WEEK}"
            )

    return errors


def check_capacity(request: ScheduleRequest) -> list[str]:
    """Проверяет хватает ли преподавателей и аудиторий нужного размера на 42 пары в неделю."""
    errors = []

    teachers = {s.id: set() for s in request.subjects}
    for ts in request.teacher_subjects:
        teachers[ts.subject_id].add(ts.teacher_id)

    weekly = {s.id: s.weekly_number_of_lessons for s in request.subjects}
    need = {s.id: 0 for s in request.subjects}
    for gs in request.group_subjects:
        need[gs.subject_id] += weekly[gs.subject_id]

    for subject_id in need:
        count = len(teachers[subject_id])
        limit = count * SLOTS_PER_WEEK
        if count > 0 and need[subject_id] > limit:
            errors.append(
                f"дисциплине {subject_id} нужно {need[subject_id]} пар в неделю, "
                f"а её преподаватели ({count} чел.) могут провести максимум {limit}"
            )

    lessons = count_group_lessons(request)
    for size in sorted({g.size for g in request.groups}):
        need_rooms = sum(lessons[g.id] for g in request.groups if g.size >= size)
        rooms = sum(1 for c in request.classrooms if c.capacity >= size)
        limit = rooms * SLOTS_PER_WEEK
        if rooms > 0 and need_rooms > limit:
            errors.append(
                f"не хватает аудиторий на {size} и больше мест: у групп от {size} человек "
                f"{need_rooms} пар в неделю, а в подходящих аудиториях ({rooms} шт.) "
                f"возможно провести максимум {limit}"
            )

    return errors


def count_group_lessons(request: ScheduleRequest) -> dict[int, int]:
    """Проверяет сколько пар в неделю у каждой группы."""
    weekly = {s.id: s.weekly_number_of_lessons for s in request.subjects}
    lessons = {g.id: 0 for g in request.groups}
    for gs in request.group_subjects:
        lessons[gs.group_id] += weekly[gs.subject_id]
    return lessons
