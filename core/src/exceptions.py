class CoreError(Exception):
    """Базовая ошибка сервиса."""


class InvalidRequestError(CoreError):
    """Входные данные противоречивы, генерацию запускать бессмысленно."""


class NoSolutionError(CoreError):
    """Перебраны все варианты, расписания нет."""


class ScheduleTimeoutError(CoreError):
    """Не уложились в лимит времени."""


class JobNotFoundError(CoreError):
    """Задачи с таким id нет."""
