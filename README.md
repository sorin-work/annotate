# annotate

A reading companion for people who take notes on what they read. Upload or paste
a document, highlight passages, write notes next to them, tag and organise
everything, and get it all back out as Markdown or CSV.

## Features

- **Documents**: paste plain text or Markdown, or upload `.txt`, `.md` and `.pdf`
  files (text is extracted from PDFs; scanned PDFs are not supported)
- **Highlights**: select any passage in the reader and pick one of five colours;
  overlapping highlights are fine
- **Notes and tags**: attach a note and any number of tags to each highlight;
  renaming a tag onto an existing one merges them
- **Accounts**: email and password sign-up, JWT bearer tokens, argon2 password
  hashing; every document, highlight, tag and collection is private to its owner

## Stack

| Part     | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| API      | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, pydantic v2 |
| Auth     | PyJWT (HS256 bearer tokens), argon2-cffi                             |
| PDFs     | pypdf (text extraction)                                              |
| Web      | React 19, TypeScript, Vite, React Router, TanStack Query             |
| Tests    | pytest (in-memory SQLite), Vitest + Testing Library (jsdom)          |

## Running locally without Docker

You need Python 3.12, Node 22 and a PostgreSQL 15+ database.

API:

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env    # points at localhost:5433 by default
alembic upgrade head
uvicorn app.main:app --reload --port 4100
```

Web app (in another terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:4100`; set
`API_URL` to point it somewhere else.

## Tests and linting

```bash
# API
cd backend
ruff check . && ruff format --check .
pytest

# Web app
cd frontend
npm run typecheck
npm test
```

API tests run against an in-memory SQLite database, so they need no running
services.

## Project layout

```
backend/
  alembic/versions/     database migrations
  app/
    api/routes/         one router per area (auth, documents, highlights, ...)
    models/             SQLAlchemy models
    schemas/            pydantic request and response models
    services/           business logic: documents, highlights, search, export, PDF
  tests/
frontend/
  src/
    api/                typed API client, one module per resource
    auth/               auth context and route guards
    components/         reader, highlight editor, shared UI
    lib/                text blocks, highlight segments, selection offsets
    pages/              one component per route
```

## License

MIT
