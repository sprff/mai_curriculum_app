from src.schemas import Classroom, Group, GroupSubject, ScheduleRequest, Subject, TeacherSubject
from src.service.validator import validate


def make_request(groups: int, teachers: int, rooms: int) -> ScheduleRequest:
    """Помощник для тестов мощности: одна дисциплина 6 пар в неделю,
    все группы по 25 человек, аудитории на 30 мест."""
    return ScheduleRequest(
        classrooms=[Classroom(id_number=100 + i, capacity=30) for i in range(rooms)],
        subjects=[Subject(id=1, weekly_number_of_lessons=6)],
        groups=[Group(id=g, size=25) for g in range(1, groups + 1)],
        teacher_subjects=[TeacherSubject(teacher_id=t, subject_id=1) for t in range(1, teachers + 1)],
        group_subjects=[GroupSubject(group_id=g, subject_id=1) for g in range(1, groups + 1)],
    )


def test_correct_data(small_request: ScheduleRequest) -> None:
    """На данных из conftest.py валидатор не находит проблем."""
    assert validate(small_request) == []


def test_unknown_subject(small_request: ScheduleRequest) -> None:
    """Преподаватель ведёт дисциплину 999, которой нет."""
    small_request.teacher_subjects.append(TeacherSubject(teacher_id=7, subject_id=999))
    assert validate(small_request) == ["преподаватель 7 ведёт дисциплину 999, которой нет в списке"]


def test_unknown_group(small_request: ScheduleRequest) -> None:
    """Группа 999 изучает дисциплину, но такой группы нет."""
    small_request.group_subjects.append(GroupSubject(group_id=999, subject_id=1))
    assert validate(small_request) == ["группы 999 нет в списке групп"]


def test_group_studies_unknown_subject(small_request: ScheduleRequest) -> None:
    """Группа 1 изучает дисциплину 999, которой нет."""
    small_request.group_subjects.append(GroupSubject(group_id=1, subject_id=999))
    assert validate(small_request) == ["группа 1 изучает дисциплину 999, которой нет в списке"]


def test_duplicate_group_subject(small_request: ScheduleRequest) -> None:
    """Группа 1 изучает дисциплину 1 дважды."""
    small_request.group_subjects.append(GroupSubject(group_id=1, subject_id=1))
    assert validate(small_request) == ["группа 1 изучает дисциплину 1 дважды"]


def test_subject_without_teacher(small_request: ScheduleRequest) -> None:
    """Дисциплину 2 некому вести."""
    small_request.teacher_subjects = [ts for ts in small_request.teacher_subjects if ts.subject_id != 2]
    assert validate(small_request) == ["дисциплину 2 некому вести: у неё нет ни одного преподавателя"]


def test_group_too_big(small_request: ScheduleRequest) -> None:
    """Группа на 100 человек, а самая большая аудитория на 30 мест."""
    small_request.groups.append(Group(id=4, size=100))
    assert validate(small_request) == [
        "группа 4 (100 чел.) не помещается ни в одну аудиторию, самая большая аудитория на 30 мест"
    ]


def test_group_too_many_lessons() -> None:
    """У группы 8 дисциплин по 6 пар = 48 пар, а слотов в неделе всего 42."""
    request = ScheduleRequest(
        classrooms=[Classroom(id_number=101, capacity=30), Classroom(id_number=102, capacity=30)],
        subjects=[Subject(id=s, weekly_number_of_lessons=6) for s in range(1, 9)],
        groups=[Group(id=1, size=25)],
        teacher_subjects=[TeacherSubject(teacher_id=s, subject_id=s) for s in range(1, 9)],
        group_subjects=[GroupSubject(group_id=1, subject_id=s) for s in range(1, 9)],
    )
    assert validate(request) == ["у группы 1 48 пар в неделю, а в сетке всего 42 слота"]


def test_subject_more_than_once_a_day(small_request: ScheduleRequest) -> None:
    """У дисциплины 7 пар в неделю, а учебных дней 6."""
    small_request.subjects[0] = Subject(id=1, weekly_number_of_lessons=7)
    assert validate(small_request) == ["у дисциплины 1 7 пар в неделю, а максимум - 6"]


def test_not_enough_teachers() -> None:
    """8 групп по 6 пар = 48 пар, а 1 преподаватель проведёт максимум 42."""
    request = make_request(groups=8, teachers=1, rooms=2)
    assert validate(request) == [
        "дисциплине 1 нужно 48 пар в неделю, а её преподаватели (1 чел.) могут провести максимум 42"
    ]


def test_not_enough_rooms() -> None:
    """8 групп по 6 пар = 48 пар, а 1 аудитория вмещает максимум 42."""
    request = make_request(groups=8, teachers=2, rooms=1)
    assert validate(request) == [
        "не хватает аудиторий на 25 и больше мест: у групп от 25 человек 48 пар в неделю, "
        "а в подходящих аудиториях (1 шт.) возможно провести максимум 42"
    ]


def test_enough_teachers_and_rooms() -> None:
    """8 групп по 6 пар = 48 пар, 2 преподавателя и 2 аудитории дают 84."""
    request = make_request(groups=8, teachers=2, rooms=2)
    assert validate(request) == []


def test_exactly_42_lessons_is_ok() -> None:
    """7 групп по 6 пар = ровно 42 пары: 1 преподаватель и 1 аудитория дают 42."""
    request = make_request(groups=7, teachers=1, rooms=1)
    assert validate(request) == []
