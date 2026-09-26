"""Run the real migrations against PostgreSQL.

The rest of the suite uses SQLite and ``create_all``, which says nothing about
whether the Alembic history works. These tests need an empty database and only
run when TEST_DATABASE_URL points at one, as in CI:

    TEST_DATABASE_URL=postgresql+psycopg://annotate:annotate@localhost:5433/annotate_test pytest
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
BACKEND = Path(__file__).resolve().parent.parent

pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL is not set")


def alembic(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND,
        env={**os.environ, "DATABASE_URL": DATABASE_URL or ""},
        capture_output=True,
        text=True,
        check=False,
    )


def test_upgrade_downgrade_and_upgrade_again():
    for step in (["upgrade", "head"], ["downgrade", "base"], ["upgrade", "head"]):
        result = alembic(*step)
        assert result.returncode == 0, result.stderr


def test_models_match_the_migrations():
    assert alembic("upgrade", "head").returncode == 0
    result = alembic("check")
    assert result.returncode == 0, result.stdout + result.stderr
