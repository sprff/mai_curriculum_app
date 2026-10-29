from functools import lru_cache

from src.config import Settings
from src.service.jobs import JobManager


@lru_cache
def get_settings() -> Settings:
    """Настройки, читаются один раз."""
    return Settings()


@lru_cache
def get_job_manager() -> JobManager:
    """Один менеджер задач на процесс."""
    return JobManager(get_settings().time_limit_s)
