import pytest

from src.api.schemas import Classroom, Group, GroupSubject, ScheduleRequest, Subject, TeacherSubject


@pytest.fixture
def small_request() -> ScheduleRequest:
    """Три группы, четыре дисциплины, у матана два препода."""
    groups = [Group(id=1, size=25), Group(id=2, size=20), Group(id=3, size=28)]
    subjects = [
        Subject(id=1, weekly_number_of_lessons=3),
        Subject(id=2, weekly_number_of_lessons=2),
        Subject(id=3, weekly_number_of_lessons=2),
        Subject(id=4, weekly_number_of_lessons=2),
    ]
    return ScheduleRequest(
        classrooms=[
            Classroom(id_number=501, capacity=30),
            Classroom(id_number=502, capacity=25),
            Classroom(id_number=503, capacity=20),
        ],
        subjects=subjects,
        groups=groups,
        teacher_subjects=[
            TeacherSubject(teacher_id=1, subject_id=1),
            TeacherSubject(teacher_id=2, subject_id=1),
            TeacherSubject(teacher_id=3, subject_id=2),
            TeacherSubject(teacher_id=4, subject_id=3),
            TeacherSubject(teacher_id=5, subject_id=4),
        ],
        group_subjects=[GroupSubject(group_id=g.id, subject_id=s.id) for g in groups for s in subjects],
    )
