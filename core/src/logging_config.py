"""Настройка логов Python-ядра: терминал и файл с ограничением размера."""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def configure_logging() -> None:
    """Включает логирование один раз при запуске HTTP API."""
    core_logger = logging.getLogger("src")
    if core_logger.handlers:
        return

    level_name = os.getenv("CORE_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    if not isinstance(level, int):
        level = logging.INFO
    core_logger.setLevel(level)
    core_logger.propagate = False

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(threadName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    core_logger.addHandler(console)

    # Файл можно перенести через CORE_LOG_DIR, по умолчанию он в core/logs/
    log_dir = Path(os.getenv("CORE_LOG_DIR", str(Path(__file__).resolve().parents[1] / "logs")))
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "core.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        core_logger.addHandler(file_handler)
    except OSError as error:
        # Проблема с файлом не должна мешать запуску генератора.
        core_logger.warning("Не удалось открыть файл логов: %s", error)
