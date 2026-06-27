"""Pytest fixtures.

Each test session runs against an isolated temporary SQLite database so tests
never touch the real ``zoomclone.db``. The TestClient context manager triggers
the app lifespan (table creation + seeding).
"""
import os
import tempfile

import pytest

# Point the app at a throwaway DB *before* importing it.
_tmp_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db}"
os.environ["SEED_ON_STARTUP"] = "true"
os.environ["FRONTEND_URL"] = "http://localhost:3000"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
