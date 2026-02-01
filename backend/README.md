# annotate API

FastAPI service for annotate. See the [main README](../README.md) for how to run
the whole stack.

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"

alembic upgrade head
uvicorn app.main:app --reload --port 4100
```

- `pytest` runs the test suite against an in-memory SQLite database.
- `ruff check . && ruff format --check .` lints and checks formatting.
- `python -m app.seed` creates the demo user (`demo@example.com` / `demo-password`).
