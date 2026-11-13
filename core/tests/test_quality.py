from src.schemas import Lesson, ScheduleRequest
from src.service.quality import evaluate
from src.service.scheduler import Scheduler


def lesson(
    day: int = 0, number: int = 2, group: int = 1, subject: int = 1, teacher: int = 1, room: int = 501
) -> Lesson:
    """Пара с удобными значениями по умолчанию: вторая пара понедельника, группа 1, аудитория 501."""
    return Lesson(
        day=day,
        lesson_number=number,
        group_id=group,
        subject_id=subject,
        teacher_id=teacher,
        classroom_id=room,
    )


def test_empty_schedule_has_no_first_lessons(small_request: ScheduleRequest) -> None:
    """В пустом расписании нет первых пар."""
    assert evaluate(small_request, []).first_lessons == 0


def test_first_lessons_counted(small_request: ScheduleRequest) -> None:
    """Считаются только пары с номером 1."""
    report = evaluate(small_request, [lesson(number=1), lesson(day=1, number=3)])
    assert report.first_lessons == 1


def test_late_lessons_counted(small_request: ScheduleRequest) -> None:
    """Поздние пары - шестая и седьмая, пятая не поздняя."""
    report = evaluate(small_request, [lesson(number=5), lesson(day=1, number=6), lesson(day=2, number=7)])
    assert report.late_lessons == 2


def test_group_window(small_request: ScheduleRequest) -> None:
    """Первая и третья пара в один день дают одно окно."""
    report = evaluate(small_request, [lesson(number=1), lesson(number=3)])
    assert report.group_windows == 1


def test_no_window_between_days(small_request: ScheduleRequest) -> None:
    """Первая пара в понедельник и третья во вторник - это не окно."""
    report = evaluate(small_request, [lesson(day=0, number=1), lesson(day=1, number=3)])
    assert report.group_windows == 0


def test_no_window_between_groups(small_request: ScheduleRequest) -> None:
    """Первая пара у одной группы и третья у другой - это не окно."""
    report = evaluate(small_request, [lesson(group=1, number=1), lesson(group=2, number=3, room=502)])
    assert report.group_windows == 0


def test_teacher_windows(small_request: ScheduleRequest) -> None:
    """Вторая и пятая пара преподавателя в один день дают два окна, у групп окон нет."""
    report = evaluate(small_request, [lesson(group=1, number=2), lesson(group=2, number=5, room=502)])
    assert report.teacher_windows == 2
    assert report.group_windows == 0


def test_overloaded_day(small_request: ScheduleRequest) -> None:
    """Пять пар в день - перегрузка, четыре - ещё нет."""
    five = [lesson(day=0, number=n) for n in range(1, 6)]
    four = [lesson(day=1, number=n) for n in range(1, 5)]
    assert evaluate(small_request, five + four).overloaded_days == 1


def test_group_clash(small_request: ScheduleRequest) -> None:
    """У группы две пары в одном слоте."""
    report = evaluate(small_request, [lesson(teacher=1, room=501), lesson(teacher=2, room=502)])
    assert report.group_clashes == 1


def test_teacher_clash(small_request: ScheduleRequest) -> None:
    """Преподаватель ведёт две пары в одном слоте у разных групп."""
    report = evaluate(small_request, [lesson(group=1, room=501), lesson(group=2, room=502)])
    assert report.teacher_clashes == 1
    assert report.group_clashes == 0


def test_room_clash(small_request: ScheduleRequest) -> None:
    """Две группы в одной аудитории в одном слоте."""
    report = evaluate(small_request, [lesson(group=1, teacher=1), lesson(group=2, teacher=2)])
    assert report.room_clashes == 1


def test_room_too_small(small_request: ScheduleRequest) -> None:
    """Группа 3 (28 чел.) не помещается в аудиторию 502 на 25 мест, группа 2 (20 чел.) в 503 помещается."""
    report = evaluate(small_request, [lesson(group=3, room=502), lesson(group=2, room=503, number=3)])
    assert report.capacity_violations == 1


def test_foreign_teacher(small_request: ScheduleRequest) -> None:
    """Преподаватель 1 не ведёт дисциплину 2, а преподаватель 2 может вести дисциплину 1."""
    report = evaluate(small_request, [lesson(subject=2, teacher=1), lesson(subject=1, teacher=2, number=3)])
    assert report.foreign_teachers == 1


def test_missing_lessons(small_request: ScheduleRequest) -> None:
    """По плану у трёх групп по 9 пар в неделю, поставлена одна."""
    assert evaluate(small_request, []).missing_lessons == 27
    assert evaluate(small_request, [lesson()]).missing_lessons == 26


def test_empty_schedule_is_invalid(small_request: ScheduleRequest) -> None:
    """Пустое расписание негодно: пары не поставлены."""
    assert not evaluate(small_request, []).is_valid


def test_generated_schedule_is_valid(small_request: ScheduleRequest) -> None:
    """Расписание от генератора не нарушает жёстких ограничений."""
    lessons = Scheduler(time_limit_s=10).build(small_request)
    assert evaluate(small_request, lessons).is_valid
