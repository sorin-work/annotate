# annotate API

FastAPI service for annotate. See the [main README](../README.md) for how to run
the whole stack.

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 4100
```

- `pytest` runs the test suite against an in-memory SQLite database.
- `TEST_DATABASE_URL=... pytest tests/test_migrations.py` also runs the Alembic
  migrations against an empty PostgreSQL database.
- `ruff check . && ruff format --check .` lints and checks formatting.
- `python -m app.seed` creates the demo user (`demo@example.com` / `demo-password`).

## Settings

Read from the environment, or from `backend/.env` (see `.env.example`).

| Variable                 | Default                                | Meaning                                           |
| ------------------------ | -------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`           | `postgresql+psycopg://…@localhost:5433` | Database; plain `postgres://` urls work too       |
| `JWT_SECRET`             | a development value                    | Signs access tokens; set a long random string     |
| `ACCESS_TOKEN_MINUTES`   | `10080` (a week)                       | How long a sign-in lasts                          |
| `CORS_ORIGINS`           | `http://localhost:5173,…5174`          | Browser origins allowed to call the API           |
| `LOGIN_ATTEMPTS`         | `10`                                   | Failed sign-ins per email and address per window  |
| `LOGIN_WINDOW_MINUTES`   | `15`                                   | The window for `LOGIN_ATTEMPTS`                   |
| `REGISTRATIONS_PER_HOUR` | `5`                                    | New accounts per address per hour (0 = no limit)  |
| `MAX_UPLOAD_MB`          | `10`                                   | Largest upload or imported page                   |
| `IMPORT_TIMEOUT_SECONDS` | `15`                                   | How long a url import may take to download        |
| `IMPORT_ALLOW_PRIVATE`   | `false`                                | Allow importing from localhost and private networks |
| `LOG_LEVEL`              | `info`                                 | One access log line per request at `info`         |
