class CoreError(Exception):
    """Базовая ошибка генератора."""


class NoSolutionError(CoreError):
    """Перебраны все варианты, расписания нет."""


class ScheduleTimeoutError(CoreError):
    """Не уложились в лимит времени."""


class BacktrackBudgetError(CoreError):
    """Попытка исчерпала лимит откатов, пора начинать заново."""
