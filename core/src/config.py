from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки сервиса из переменных окружения с префиксом CORE_."""

    model_config = SettingsConfigDict(env_prefix="CORE_")

    time_limit_s: float = 120
