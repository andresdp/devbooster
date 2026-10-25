import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_DATABASE_URL = f"sqlite:///{Path(__file__).resolve().parent.parent / 'kanban.db'}"
DEFAULT_CORS_ORIGINS = "http://localhost:5173"
TRUE_VALUES = {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: list[str]
    seed_on_startup: bool = True


def get_settings() -> Settings:
    origins = [
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]
    if "*" in origins:
        raise ValueError("CORS_ORIGINS must list explicit origins; '*' is not allowed")
    return Settings(
        database_url=os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL),
        cors_origins=origins,
        seed_on_startup=os.environ.get("SEED_ON_STARTUP", "true").strip().lower() in TRUE_VALUES,
    )
