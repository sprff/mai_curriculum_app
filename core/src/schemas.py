from pydantic import BaseModel, Field


class Classroom(BaseModel):
    """Аудитория."""

    id_number: int
    capacity: int = Field(gt=0)


class Subject(BaseModel):
    """Дисциплина и сколько пар в неделю у каждой группы, которая её изучает."""

    id: int
    weekly_number_of_lessons: int = Field(ge=1)


class Group(BaseModel):
    """Группа и её численность."""

    id: int
    size: int = Field(gt=0)


class TeacherSubject(BaseModel):
    """Препод может вести дисциплину."""

    teacher_id: int
    subject_id: int


class GroupSubject(BaseModel):
    """Группа изучает дисциплину."""

    group_id: int
    subject_id: int


class ScheduleRequest(BaseModel):
    """Снимок данных для генерации."""

    classrooms: list[Classroom]
    subjects: list[Subject]
    groups: list[Group]
    teacher_subjects: list[TeacherSubject]
    group_subjects: list[GroupSubject]


class Lesson(BaseModel):
    """Одна поставленная пара. day: 0 = понедельник."""

    day: int
    lesson_number: int
    group_id: int
    subject_id: int
    teacher_id: int
    classroom_id: int
