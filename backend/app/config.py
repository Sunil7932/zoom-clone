"""Application configuration.

All values can be overridden with environment variables, which keeps secrets and
environment-specific settings out of the codebase (12-factor style). Sensible
local-development defaults are provided so the app runs with zero setup.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # SQLite by default; point DATABASE_URL at Postgres/etc. in production.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./zoomclone.db")

    # Public base URL of the frontend, used to build shareable invite links.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Comma-separated list of origins allowed to call the API / open websockets.
    CORS_ORIGINS: List[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if o.strip()
    ]

    # Re-seed sample data on startup when the DB is empty.
    SEED_ON_STARTUP: bool = os.getenv("SEED_ON_STARTUP", "true").lower() == "true"


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
