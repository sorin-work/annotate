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
- **Collections**: group documents into shelves; a document can live in several
- **Search**: one box across document text, highlights, notes and tags, with
  filters for tag, colour and collection
- **Export**: a single document, a collection, a tag or everything, as Markdown
  (ready for Obsidian or a blog post) or CSV (for spreadsheets)
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
| Tooling  | ruff (lint + format), ESLint, Prettier, GitHub Actions               |

## Running with Docker

The quickest way to try it: Postgres, the API and the web app (served by nginx)
in one command.

```bash
cp .env.example .env   # optional, only needed to change the defaults
docker compose up --build
```

Then open http://localhost:5174 and sign in with the demo account:

- **Email:** `demo@example.com`
- **Password:** `demo-password`

The demo user comes with six documents (Thoreau, Emerson, Marcus Aurelius and a
few essays on reading and note-taking), around twenty highlights with notes and
tags, and three collections. Set `SEED_DEMO=false` to start with an empty
database instead.

| Service | URL / port                     | Notes                                       |
| ------- | ------------------------------ | ------------------------------------------- |
| web     | http://localhost:5174          | nginx; proxies `/api` to the API            |
| api     | http://localhost:4100/api      | FastAPI; docs at http://localhost:4100/api/docs |
| db      | `localhost:5433`               | Postgres 17, user/password/db `annotate`    |

Ports can be changed with `WEB_PORT`, `API_PORT` and `DB_PORT`, for example
`WEB_PORT=3000 docker compose up`. The API container applies migrations
(`alembic upgrade head`) every time it starts. Data lives in the `db-data`
volume; `docker compose down -v` removes it.

## Running locally without Docker

You need Python 3.12, Node 22 and a PostgreSQL 15+ database. The easiest way to
get the database is still Docker: `docker compose up -d db`.

API:

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env    # points at localhost:5433 by default
alembic upgrade head
python -m app.seed      # optional: demo user and sample data
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
npm run lint
npm run format:check
npm run typecheck
npm test
```

API tests run against an in-memory SQLite database, so they need no running
services. CI runs all of the above on every push and pull request.

## Project layout

```
backend/
  alembic/versions/     database migrations
  app/
    api/routes/         one router per area (auth, documents, highlights, ...)
    models/             SQLAlchemy models
    schemas/            pydantic request and response models
    services/           business logic: documents, highlights, search, export, PDF
    seed/               demo account and sample documents
  tests/
frontend/
  src/
    api/                typed API client, one module per resource
    auth/               auth context and route guards
    components/         reader, highlight editor, shared UI
    lib/                text blocks, highlight segments, selection offsets
    pages/              one component per route
docker-compose.yml
```

## API overview

All endpoints live under `/api` and, apart from health and auth, need an
`Authorization: Bearer <token>` header. Errors look like
`{"error": {"code": "not_found", "message": "Document not found"}}`.

| Method | Path                                    | Purpose                                  |
| ------ | --------------------------------------- | ---------------------------------------- |
| GET    | `/health`                               | Liveness and database check              |
| POST   | `/auth/register`, `/auth/login`         | Get a token                              |
| GET    | `/auth/me`                              | Current user (`PATCH` to rename)         |
| GET    | `/documents`                            | List with `q`, `collection_id`, `sort`   |
| POST   | `/documents`, `/documents/upload`       | Create from JSON or a file               |
| GET    | `/documents/{id}`                       | Full text, collections, highlight count  |
| GET    | `/documents/{id}/highlights`            | Highlights in reading order              |
| POST   | `/documents/{id}/highlights`            | Highlight a range                        |
| GET    | `/highlights`                           | All highlights, filterable               |
| PATCH  | `/highlights/{id}`                      | Change note, colour or tags              |
| GET    | `/tags`                                 | Tags with usage counts                   |
| GET    | `/collections`                          | Collections with document counts         |
| GET    | `/search?q=`                            | Documents and highlights matching `q`    |
| GET    | `/documents/{id}/export?format=md\|csv` | Export one document's highlights         |
| GET    | `/export?format=md\|csv`                | Export everything, or a tag/collection   |

The full, interactive reference is at `/api/docs` when the API is running.

## License

MIT
