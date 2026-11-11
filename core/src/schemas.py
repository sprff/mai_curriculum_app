from pydantic import BaseModel, ConfigDict, Field


class _Frozen(BaseModel):
    """Модель без изменения полей: значения задаются только при создании."""

    model_config = ConfigDict(frozen=True)


class Classroom(_Frozen):
    """Аудитория."""

    id_number: int
    capacity: int = Field(gt=0)


class Subject(_Frozen):
    """Дисциплина и сколько пар в неделю у каждой группы, которая её изучает."""

    id: int
    weekly_number_of_lessons: int = Field(ge=1)


class Group(_Frozen):
    """Группа и её численность."""

    id: int
    size: int = Field(gt=0)


class TeacherSubject(_Frozen):
    """Препод может вести дисциплину."""

    teacher_id: int
    subject_id: int


class GroupSubject(_Frozen):
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


class Lesson(_Frozen):
    """Одна поставленная пара. day: 0 = понедельник."""

    day: int
    lesson_number: int
    group_id: int
    subject_id: int
    teacher_id: int
    classroom_id: int
