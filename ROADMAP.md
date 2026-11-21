# Roadmap

Things I might add to annotate. The app covers the whole loop for one reader
today (bring a document in, read, highlight, take notes, organise, search,
export), so nothing here is promised or scheduled. These are ideas, written
down with enough detail that I (or anyone else) can pick one up later without
starting from zero. Items may change, move between groups or be dropped.

What the app does today is in the [README](README.md) and the
[backend README](backend/README.md).

- **Next**: small or well understood. I would start with these.
- **Later**: worth doing, but bigger or waiting on a decision.
- **Maybe**: not sure yet that they are worth the extra complexity.

Sizes are rough: **S** is an evening or two, **M** a few evenings up to a
couple of weekends, **L** several weeks of spare time.

Each item is meant to fit in one pull request and to be covered by the test
suite. The API keeps its logic in `backend/app/services` and its routes thin;
`backend/tests` calls the routes through a test client against an in-memory
SQLite database, and only `tests/test_migrations.py` runs against PostgreSQL.
In the web app, pure logic (blocks, offsets, segments, shortcuts) lives in
`frontend/src/lib` with Vitest tests next to it, and components are tested with
Testing Library in jsdom. There are no browser tests, so logic worth testing
belongs in a service or in `src/lib`, not inside a component. Items that change
the schema bring their own Alembic migration under `backend/alembic/versions`
(the next one is `0011`). File names below are relative to `backend/app/` or
`frontend/src/` when the context makes it clear, and from the repository root
otherwise.

When an item ships, its row in the Overview says `Shipped` in the Group
column, its section moves under a `## Shipped` heading at the end with one
paragraph on what was built and what was left out, and the same pull request
updates the README (and the backend README for new settings) and adds an entry
under `Unreleased` in `CHANGELOG.md`. There is no changelog yet; the first
shipped item creates it.

"Depends on" lists real prerequisites only. Items that merely touch the same
file are not listed there; the bigger overlaps are mentioned in the items.

## Overview

| #   | Item                                            | Group | Area        | Size | Depends on |
| --- | ----------------------------------------------- | ----- | ----------- | ---- | ---------- |
| 1   | Refuse unsafe production settings               | Next  | ops         | S    | -          |
| 2   | Close the DNS rebinding gap in url import       | Next  | security    | S    | -          |
| 3   | Run the API tests on PostgreSQL too             | Next  | tests       | S    | -          |
| 4   | Backups, restore and upgrades                   | Next  | ops         | S    | -          |
| 5   | Security headers and a content security policy  | Next  | security    | S    | -          |
| 6   | Full account export and import                  | Later | export      | M    | -          |
| 7   | Trash for deleted documents                     | Later | documents   | M    | -          |
| 8   | Daily review of old highlights                  | Later | review      | M    | -          |
| 9   | Import highlights from Kindle and other readers | Later | import      | M    | -          |
| 10  | EPUB uploads                                    | Later | import      | M    | -          |
| 11  | Ranked full text search                         | Later | search      | M    | 3          |
| 12  | Find in document and an outline                 | Later | reader      | M    | -          |
| 13  | Long documents in the reader                    | Later | reader      | M    | -          |
| 14  | Accessibility pass                              | Later | ui          | M    | -          |
| 15  | Browser tests for the reader                    | Later | tests       | M    | -          |
| 16  | Sessions and sign out everywhere                | Later | accounts    | M    | -          |
| 17  | Password reset by email                         | Later | accounts    | M    | -          |
| 18  | Closed sign-up and invites                      | Later | accounts    | S    | -          |
| 19  | Time zones for the dashboard and activity       | Later | dashboard   | S    | -          |
| 20  | Stable paging in the activity feed              | Later | dashboard   | S    | -          |
| 21  | A note on the whole document                    | Later | notes       | S    | -          |
| 22  | Names for highlight colours                     | Later | highlights  | S    | -          |
| 23  | Save from the browser                           | Later | import      | S    | -          |
| 24  | One Markdown file per document                  | Later | export      | M    | -          |
| 25  | Share a document's highlights by link           | Later | sharing     | M    | 5          |
| 26  | Personal API tokens                             | Later | api         | M    | 16         |
| 27  | Sign-in limits shared across workers            | Later | security    | M    | -          |
| 28  | Bounded PDF extraction                          | Later | import      | S    | -          |
| 29  | Logs and metrics for running it                 | Later | ops         | S    | -          |
| 30  | Exports and lists at scale                      | Later | performance | M    | -          |
| 31  | Editing document text                           | Maybe | documents   | L    | -          |
| 32  | Links between highlights                        | Maybe | notes       | M    | -          |
| 33  | Nested tags                                     | Maybe | tags        | M    | -          |
| 34  | Saved searches as smart collections             | Maybe | search      | M    | -          |
| 35  | Reading time and streaks                        | Maybe | dashboard   | M    | 19         |
| 36  | Reading offline                                 | Maybe | reader      | L    | 5          |
| 37  | Text recognition for scanned PDFs               | Maybe | import      | L    | 28         |
| 38  | Two-step sign-in                                | Maybe | accounts    | M    | 16         |

## Next

### 1. Refuse unsafe production settings

Two defaults are fine on a laptop and dangerous anywhere else, and nothing
warns about either.

- `JWT_SECRET` falls back to `local-development-secret-change-me-0123456789`
  in `config.py`, and `docker-compose.yml` passes the same value when the
  variable is unset. Anyone who reads the repository can sign tokens for any
  user id on an instance that kept it.
- The compose file sets `FORWARDED_ALLOW_IPS: '*'` so uvicorn takes the client
  address from nginx's `X-Forwarded-For`. That is right for requests through
  nginx, but the API port is also published on the host (`4100:8000`). A
  request sent straight to port 4100 with a made-up `X-Forwarded-For` gets a
  fresh address for every attempt, and the sign-in limit in
  `api/routes/auth.py` (keyed by `_client_ip`) never triggers.

Design:

- A new `ENVIRONMENT` setting (`development` by default, `production` in the
  compose file). In production `create_app` refuses to start when
  `jwt_secret` is the development value or shorter than 32 characters, with a
  log line that says how to make one (`python -c "import secrets;
print(secrets.token_urlsafe(48))"`). In development it logs a warning.
- Compose: publish the API port on `127.0.0.1` only (`127.0.0.1:${API_PORT}`),
  so it stays reachable for `/api/docs` on the machine but not from the
  network, and narrow `FORWARDED_ALLOW_IPS` to the compose network instead of
  `*`. The README table of services says why.
- Tricky: making the compose default fail would break `docker compose up` for
  everyone trying the demo. The compose file can keep `development` unless
  `.env` says otherwise, and the README section on running it for real lists
  the two lines to change. I lean towards that over generating a secret on
  first start, which would sign everyone out on every rebuild.
- Tricky: `CORS_ORIGINS` with `allow_credentials=True` and a wildcard would be
  another foot-gun. Refuse `*` there in production too.
- Tests: `tests/test_config.py` (new): production with the default secret
  raises, a long secret starts, development warns. A middleware test that a
  forged header from an untrusted address is ignored is hard with the test
  client; the compose change is checked by reading the file in the same test
  module.

### 2. Close the DNS rebinding gap in url import

`check_url` in `services/url_import.py` resolves the host and refuses private
addresses, then `_download` hands the url to httpx, which resolves the name a
second time. A hostile DNS server can answer with a public address the first
time and `127.0.0.1` or `169.254.169.254` the second. Every redirect hop has the
same window. The check is careful in every other way, so this is the gap left.

- Resolve once, check the addresses, and connect to the address that passed.
  With httpx that means a custom transport: an `httpx.HTTPTransport` subclass
  or a small connection hook that receives the already-checked address and
  keeps the original host name for the `Host` header and for TLS server name
  checks (SNI and certificate validation must still use the name, not the
  address).
- `get_http_client` in `deps.py` builds the client with that transport;
  tests keep swapping in a mock transport, so the pinning code needs its own
  tests against a fake resolver.
- Redirects already go through `check_url` one hop at a time; each hop gets
  the same pinning.
- Tricky: names that resolve to several addresses. Check all of them (as
  today) and connect to the first one; if that fails, try the next checked one
  rather than resolving again.
- Tricky: proxies. If an `HTTPS_PROXY` is set, httpx connects to the proxy and
  the proxy resolves the name. Either refuse imports through a proxy or
  document that the proxy has to enforce the same rule. I lean towards
  ignoring proxy variables for imports (`trust_env=False`) and saying so.
- Tests: `tests/test_url_import_limits.py` gets a resolver that returns a
  public address first and a private one second, and asserts that the
  connection goes to the first; a redirect to a name that resolves privately
  is still refused.

### 3. Run the API tests on PostgreSQL too

Production is PostgreSQL; the tests are SQLite (`tests/conftest.py` builds a
`sqlite://` engine). The two disagree exactly where this app is delicate:
`ILIKE` and the `LIKE_ESCAPE` handling, case folding of non-ASCII text,
`func.substr` on long text, timestamp precision, foreign key cascades (SQLite
only enforces them with a pragma) and the unique constraint on tag names under
concurrent writes. The trigram indexes from migration `0006` are never used in
a test at all.

- `conftest.py` reads `TEST_DATABASE_URL`, as `test_migrations.py` does
  already. When it is set, the engine points there, the schema comes from
  `alembic upgrade head` instead of `Base.metadata.create_all`, and each test
  runs inside a transaction that is rolled back (a connection-level
  `begin()` with nested savepoints, so code that calls `db.commit()` still
  works).
- CI already starts PostgreSQL for the migration tests. Run `pytest` once on
  SQLite (fast feedback) and once with `TEST_DATABASE_URL` set, as two steps in
  the same job.
- A real bug to pin down while doing it: `get_or_create_tags` in
  `services/tags.py` checks for existing names and then inserts. Two requests
  that add the same new tag at the same moment both insert, and the second
  hits `uq_tags_owner_name` as a 500. Catch the `IntegrityError` with a
  savepoint and read the row the other request created.
- Tricky: tests that depend on SQLite behaviour (ordering of equal
  timestamps, string comparison) will show up as flaky on PostgreSQL. Fix the
  queries, not the tests: most need an `id` as a final sort key.
- Tests: the existing suite, now on both databases, plus a concurrent tag
  creation test that only runs on PostgreSQL.

### 4. Backups, restore and upgrades

All data lives in the `db-data` volume. The README mentions that
`docker compose down -v` removes it, and nothing else: no backup, no restore,
no note on upgrading PostgreSQL. Document text cannot be fetched again (a
deleted web page is gone), so a lost volume loses the reading, not just the
notes.

- A `backup` service in `docker-compose.yml` under a profile
  (`docker compose --profile backup run --rm backup`) that runs `pg_dump -Fc`
  into a `./backups` folder with a dated name and keeps the last N files
  (`BACKUP_KEEP`, default 14). A cron line for the host goes in the docs; the
  app has no scheduler and should not get one for this.
- A `restore` command in the same service: `pg_restore --clean --if-exists`
  into the running database, after stopping the API so nothing writes
  meanwhile. The docs give the three commands in order.
- A new `docs/operations.md` (the repository has no `docs/` folder yet) with
  backup, restore, moving to another machine, and upgrading: the API applies
  migrations on start, so an upgrade is "back up, pull, `up --build`". A major
  PostgreSQL upgrade (17 to 18) cannot reuse the volume and needs a dump and a
  restore into a new one; say so before someone changes the image tag.
- Tricky: a restore from an older version of the app. The dump carries its
  `alembic_version` row, and the next start migrates it forward, which is what
  we want. A dump from a newer version into an older app must be refused:
  check `alembic_version` against the heads the app knows and stop with a
  clear message.
- Undecided: whether the backup should also write a JSON account export
  (item 6) per user. A database dump is enough to restore; the export is for
  leaving. I would keep them separate.
- Tests: a shell script under `scripts/` that the CI job can run against the
  service container: create a user and a highlight, dump, drop, restore, read
  the highlight back. It runs in CI only, like the migration tests.

### 5. Security headers and a content security policy

The access token lives in `localStorage` (`tokenStore` in `api/client.ts`), so
any script that runs on the page can read it and keep using the account for a
week (`ACCESS_TOKEN_MINUTES`). The app is careful about the obvious ways in:
the reader renders text through React, links are limited to safe schemes
(`SAFE_URL` in `lib/inline.ts`), `source_url` is checked in
`schemas/documents.py`. But `nginx.conf` sends no security headers at all, so
there is no second line if one of those checks ever slips.

- In `frontend/nginx.conf`, for the app shell and assets:
  `Content-Security-Policy: default-src 'self'; img-src 'self' data:;
style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors
'none'; base-uri 'none'; form-action 'self'`, plus
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (imported
  pages are private reading; following a link should not tell the site where
  it came from) and `Permissions-Policy` turning off what the app never uses.
- The API answers JSON and downloads; it gets `nosniff` and
  `Cache-Control: no-store` on authenticated responses, set in
  `middleware.py`.
- Tricky: `index.html` has an inline script (it sets the theme before the
  app loads, so there is no flash of the wrong one). `script-src 'self'`
  blocks it; move it to a file under `public/` or allow it by its hash. Check
  that the built app has no inline styles either.
- Tricky: `/api/docs` loads Swagger UI from a CDN. Either give that path its
  own looser policy in nginx or note that the docs page is for development
  and is served by the API port, which item 1 keeps local.
- Tricky: HSTS only makes sense behind TLS, which this compose file does not
  terminate. Document it for whoever puts a TLS proxy in front rather than
  sending it from nginx here.
- Undecided: moving the token to an `HttpOnly` cookie. It removes the token
  from scripts entirely but brings CSRF protection with it. I would do the
  headers first and decide this with item 16.
- Tests: a test in `tests/test_middleware.py` for the API headers; for nginx,
  a check in CI that `curl -I` on the built web image shows the policy (the
  frontend job builds no image today, so this may wait for item 15).

## Later

### 6. Full account export and import

"Export everything" (`GET /export`) is a highlight export: documents without
highlights are left out, the document text is not included, and collections
are not there at all (`services/export.py` groups highlights by document).
Nothing reads it back. Someone moving to another instance, or restoring one
account from a mistake, has no way to do it.

- `GET /account/export` returns a zip: `annotate.json` with format version,
  user display name, documents (all metadata plus `content`, reading progress
  and position), highlights with offsets, colour, note, tags and comments,
  collections with their member documents, and tag names; `documents/` with
  one `.md` or `.txt` per document for people who just want their files.
- `POST /account/import` takes that zip and adds everything to the signed-in
  account in one transaction. Ids are new; the file's ids only link records
  inside the file.
- Validate before writing: every highlight's offsets inside its document's
  text and its `quote` equal to the slice (the same rule as
  `create_highlight`), colours in `HIGHLIGHT_COLORS`, tag names through
  `normalise_tag`. One bad record rejects the import with its path in the
  file (`documents[3].highlights[12]`).
- Tricky: importing into an account that already has things. Tags merge by
  name, collections with the same name merge, documents are always added
  (two copies are better than a silent merge of different texts). The summary
  says what happened.
- Tricky: size. An account with a few hundred long documents is tens of
  megabytes. The export streams the zip (Python's `zipfile` can write to a
  stream), and the import has its own limit above `MAX_UPLOAD_MB`.
- Tricky: `created_at` should be kept from the file, so the dashboard and
  activity show the real history. That makes the activity paging tie problem
  in item 20 likely, because imported rows can share timestamps.
- Settings page: "Download all my data" and "Import from a file", next to
  delete account, which should link to the export.
- Tests: round trip in `tests/test_account_export.py` (export, delete the
  account, register, import, compare), rejection of a tampered offset, and
  merge rules.

### 7. Trash for deleted documents

Deleting a document (`delete_document`) removes it and, through the foreign
keys, every highlight, note and comment on it. There is a confirm dialog and
then nothing. Highlights have an undo (the toast in `DocumentPage.tsx`
re-creates them from memory); documents, which hold far more work, do not.

- Data: `deleted_at` on `documents`. `DELETE /documents/{id}` sets it; a new
  `POST /documents/{id}/restore` clears it; `DELETE /documents/{id}?purge=1`
  removes it for good.
- Every query that reads documents or highlights filters out deleted
  documents: `list_documents`, `get_owned` for documents, `filtered_query`
  (through the join on `Document`), search, stats, activity, export. That is
  the risk of the item: one missed query leaks deleted work into a count.
  A single helper (`live_documents()` returning the condition) and a test that
  walks every endpoint after a delete keep it honest.
- A "Trash" view in the library with restore and delete forever, and a note
  that items older than 30 days are removed. Removal happens lazily, at the
  next request that lists the trash, since there is no background job.
- Tricky: collections and tags. A deleted document keeps its collection
  membership, so restoring puts it back where it was; tag counts on the tags
  page must not include its highlights.
- Tricky: account deletion still removes everything at once, trash included.
- Tests: delete, check every listing, restore, check again; purge; the 30 day
  cleanup with a fixed clock.

### 8. Daily review of old highlights

People highlight and never look again. The most asked-for feature in tools of
this kind (Readwise's daily review is the known one) is a short daily session
that brings back a handful of old highlights. The seed even ships an essay on
spaced repetition.

- A `/review` page: up to N highlights a day (setting, default 10), one at a
  time, with the quote, note, document and a link to the place in the reader.
  Actions: keep (show again later), soon (show again sooner), and stop showing
  this one.
- Data: a `highlight_reviews` table (`highlight_id`, `due_on`, `interval_days`,
  `last_reviewed_at`, `retired`), created lazily the first time a highlight
  is picked. The schedule is a pure function in `services/review.py`: keep
  doubles the interval (capped at a year), soon halves it, starting at 7 days.
  That is far simpler than SM-2 and enough for reading notes, where nobody
  grades recall.
- Picking: due highlights first, then never-reviewed ones, weighted towards
  ones with notes and favoured tags (a setting lists tags to include or
  exclude). Deterministic for a given day, so a reload shows the same set.
- Tricky: "today" needs the user's time zone (item 19). Until then, UTC.
- Tricky: deleted highlights and documents in the trash (item 7) must drop out
  of the queue.
- Undecided: a daily email. It needs mail (item 17) and a scheduler the app
  does not have. I would leave it out and keep the review in the app.
- Tests: the schedule as pure unit tests; the picking with a fixed date and a
  seeded set of highlights; the route test that an action moves `due_on`.

### 9. Import highlights from Kindle and other readers

Many people read on an e-reader and want those highlights here too. The
Kindle writes every highlight to `My Clippings.txt`; Kobo, Apple Books and
Readwise all have CSV or similar exports. annotate cannot take any of them,
and its model needs offsets into a document's text, which a clippings file
does not have.

- Two cases:
  - the book's text is already a document here (an EPUB from item 10, a
    pasted text): find each quote in the content and create a highlight at
    that range;
  - it is not: create a "highlights only" document whose content is the
    quotes one after another, each a paragraph, and the highlights cover
    them. That keeps every highlight a range in some text, as the rest of the
    app assumes.
- Parsers as pure functions in `services/clippings.py`: Kindle clippings
  (blocks separated by `==========`, title and author on the first line, kind
  and location on the second; notes and bookmarks are entries of their own and
  the note attaches to the highlight at the same location), and a generic CSV
  with a column mapping (quote, note, title, author, tags), which covers the
  Readwise export.
- Matching a quote to the text: exact first, then whitespace and quote-mark
  normalised, then give up and list it as unmatched. No fuzzy matching in the
  first version; a wrong range is worse than a missing one.
- A preview step on a new import page: books found, how many highlights
  matched which document, what will be created. Then one transaction.
- Tricky: duplicates. Kindle keeps old versions of an edited highlight in the
  file. Skip a clipping whose range is inside one already imported at the same
  location, and skip anything already present (same document, same range).
- Tricky: encodings and the BOM; Kindle writes UTF-8 with a BOM, which
  `utf-8-sig` already handles in `create_from_upload`.
- Tests: fixture clippings files with notes, bookmarks and edited duplicates;
  matching against a seeded document; the CSV mapping.

### 10. EPUB uploads

The upload takes `.txt`, `.md` and `.pdf`. Books that are not on paper are
mostly EPUB, and the PDF path loses headings and paragraphs while the EPUB
has them as HTML.

- An EPUB is a zip with a package file that lists the chapters in reading
  order. `services/epub.py` reads `META-INF/container.xml`, the OPF spine and
  the chapter files with the standard library (`zipfile`,
  `xml.etree.ElementTree`), and runs each chapter through the existing
  `html_extract` to get Markdown. Chapters join with their title as a `##`
  heading. Title and author come from the OPF metadata.
- `source_type` stays `markdown`, so the reader, highlights and exports work
  unchanged. `original_filename` keeps the `.epub` name.
- Tricky: zip bombs and huge books. Check the uncompressed size of each entry
  before reading it and stop at a cap (some multiple of `MAX_UPLOAD_MB`), and
  refuse entries with absolute paths or `..`.
- Tricky: XML parsing of untrusted files. `ElementTree` does not fetch
  external entities, but billion-laughs style entity expansion is still a
  risk on old Pythons; refuse any DOCTYPE with entities.
- Tricky: DRM. Encrypted books have `META-INF/encryption.xml`; say they are
  not supported, as encrypted PDFs are today.
- Not in this item: images, footnote links inside the book, the EPUB's own
  table of contents (item 12 builds an outline from headings, which covers
  it).
- Tests: a small EPUB built in the test (as `tests/pdf_fixture.py` builds a
  PDF), chapter order from the spine, metadata, a bomb and an encrypted book
  rejected.

### 11. Ranked full text search

Search is `ILIKE '%term%'` on title, author, content, quotes, notes, tags and
comments (`services/search.py` and `filtered_query`). It finds substrings, so
"read" matches "already" and "thread", it does not find "reading" for "read",
results are sorted by title or date, not by how well they match, and there are
no pages (one `limit` of 50, and `snippet_around` shows the first occurrence
only).

- PostgreSQL full text search: a generated `tsvector` column on `documents`
  (title weighted A, author B, content C) and on `highlights` (quote A, note
  B), each with a GIN index, in a migration. `websearch_to_tsquery` gives
  quoted phrases, `-word` and `or` for free. Order by `ts_rank`. Snippets from
  `ts_headline`, which marks every match, not only the first.
- Comments and tags still need a join; keep them as an `OR` with the current
  conditions for highlights.
- Pages: `limit` and `offset` with a `total`, as `GET /highlights` already
  returns a `Page`.
- Tricky: the language. `to_tsvector('english', ...)` stems English and
  mangles everything else. A per-document language would be correct; a
  `simple` configuration (no stemming) for documents marked as other
  languages is the cheap version. The seed has only English.
- Tricky: SQLite. The tests cannot run full text search there, which is why
  this depends on item 3. Keep the `ILIKE` path as the SQLite fallback so the
  fast suite still runs, and test ranking only on PostgreSQL.
- Tricky: documents are up to 2 MB of text, and `tsvector` has a 1 MB limit on
  its own size. Very long documents need the content split into chunks in a
  side table, or the vector built from the first part only. Measure with the
  seed's Walden before deciding.
- The frontend marks matches with `lib/matches.ts`, which does plain
  substring matching. With stemming the server's `ts_headline` marks are the
  truth, so the page should render those instead.
- Tests: on PostgreSQL, stemming ("reading" finds "read"), phrase search,
  ranking puts a title match first, pages add up.

### 12. Find in document and an outline

Inside the reader the only way to find a passage is the browser's own find,
which knows nothing about highlights or reading position, and long documents
have no way to jump to a chapter.

- Find: `Ctrl+F` (or `f`, kept free in `lib/shortcuts.ts`) opens a find bar
  over the reader; matches are computed on `content` as offsets in a pure
  function in `lib/`, marked with the same segment machinery as highlights
  (a separate layer, so a match inside a highlight shows both), and `Enter`
  moves between them. "Highlight this match" turns a match into a selection.
- Outline: for Markdown documents, the headings from `toBlocks` already have
  levels and offsets. A collapsible side list of them, with the current one
  marked as you scroll (the reading progress code already knows the first
  block on screen), and a click scrolls there.
- PDFs have no headings after extraction. The outline is simply absent for
  them; do not guess.
- Tricky: taking over `Ctrl+F` annoys people who want the browser's find.
  Pressing it twice could fall through to the browser. I lean towards `f` as
  the shortcut and leaving `Ctrl+F` alone.
- Tricky: matching across inline Markdown. The visible text of `**bold**`
  hides the stars, so search the visible text and map back to offsets with
  the layout that `lib/inline.ts` already computes.
- Tests: the matcher and the outline builder as unit tests in `lib/`; a
  component test that the find bar moves through matches.

### 13. Long documents in the reader

`Reader.tsx` renders every block of the document at once, and for each block
filters the whole highlight list (`blockHighlights`), so the work is blocks
times highlights. A long book (the content limit is 2,000,000 characters, some
tens of thousands of paragraphs) with a few hundred highlights makes the first
render and every new highlight slow, and the page holds every DOM node.

- First the cheap part: compute `blockHighlights` with one pass over blocks and
  highlights both sorted by offset, instead of a filter per block. That is a
  pure function in `lib/segments.ts` with a test, and it already removes most
  of the cost of adding a highlight.
- Then measure. If rendering is still slow, render blocks in windows: keep a
  range of blocks around the viewport and placeholders of estimated height
  for the rest, grown as the user scrolls.
- Tricky: windowing breaks three things that work today. A selection cannot
  span into blocks that are not in the DOM (cap a selection to rendered
  blocks; that is enough for highlighting). `j` and `k` jump to highlights
  that may not be rendered (render the target window first, then scroll).
  Resume from `last_position` needs the block at that offset rendered before
  scrolling. And the browser's find (`Ctrl+F`) stops finding text off screen,
  which makes item 12 more important.
- Tricky: placeholder heights. Estimate from character count and measure
  rendered blocks, so the scrollbar and the progress percentage stay close
  enough.
- Undecided: whether windowing is worth it at all. If the sorted pass and
  `content-visibility: auto` in CSS (which lets the browser skip layout off
  screen without changing the DOM) are fast enough for the 2 MB case, I would
  stop there.
- Tests: the sorted pass as a unit test; a component test that the reader
  renders a large generated document with the expected number of blocks.

### 14. Accessibility pass

The basics are there: the colour picker has `aria-pressed` and
`aria-keyshortcuts`, the selection toolbar is a `role="toolbar"`, the modal is
a labelled dialog, and the reader works from the keyboard with `j`, `k` and
`n`. The gaps are in the reader itself.

- Highlights are `<mark>` elements with the note in a `title`. Screen readers
  announce marks inconsistently and `title` not at all. Give each mark an
  accessible description (colour, "has a note"), and make the open highlight
  reachable as a real focus target so the editor panel opens with focus inside
  it and returns focus to the mark on close.
- Colour is the only difference between the five kinds of highlight. With item
  22 colours get names; show the name on hover and in the editor, and offer an
  underline style per colour for people who cannot tell pink from purple.
- Overlapping highlights: `ReaderBlock` draws the top one (`top.id`) and a
  click opens only that one. The others under it can only be reached through
  `j` and `k`. A click on an overlap should offer a short list.
- Making a highlight needs a selection, and keyboard selection works
  (`selectionchange` is followed), but nothing says so. The shortcuts help
  should explain it, and the toolbar should be reachable by `Tab` once it
  appears.
- Check contrast of the `--hl-*` colours with text in both themes, and focus
  styles everywhere.
- Tests: component tests for the accessible names and focus return; an
  automated check with `axe-core` over the main pages in jsdom catches the
  rest of the cheap mistakes.

### 15. Browser tests for the reader

The core of the app is turning a browser selection into offsets
(`lib/selection.ts`) and back into marks. jsdom has no layout, and its
selection support is thin, so the tests build ranges by hand. Real selections
across inline Markdown, across blocks, by double click, by touch and by
`Shift` and arrows are not tested anywhere, and they are where bugs would be.

- Playwright with Chromium and Firefox, against the compose stack or a Vite
  dev server with the API on SQLite. A handful of tests: select a sentence and
  highlight it, a selection across a bold word, across two paragraphs, a
  keyboard selection, resume reading where you left off, import a page from a
  local test server.
- A separate CI job, so the fast checks stay fast. It needs the API, which the
  backend job already knows how to start.
- Tricky: the API's url import refuses localhost; the test stack sets
  `IMPORT_ALLOW_PRIVATE=true`, as the README already describes for local
  work.
- Tricky: flakiness. Wait on the network responses the app makes (the
  highlight `POST`), never on timers.
- Tests: these are the tests. Keep the set small; jsdom stays the main level.

### 16. Sessions and sign out everywhere

A sign-in is a JWT valid for a week, and the server keeps no record of it.
"Sign out" in the web app deletes the token from `localStorage`, but the token
itself still works until it expires. The only way to end other sessions is to
change the password (`password_changed_at` in `deps.py`), which is a strange
thing to require of someone who left a laptop signed in somewhere.

- Data: a `sessions` table (`id`, `user_id`, `created_at`, `last_seen_at`,
  `user_agent`, `ip`, `revoked_at`). The token carries the session id as a
  `sid` claim; `get_current_user` checks that the session exists and is not
  revoked. `last_seen_at` is updated at most once a minute to keep writes
  down.
- `POST /auth/logout` revokes the current session; the settings page lists
  sessions with "sign out" per row and "sign out everywhere else".
- Change password keeps its behaviour by revoking all other sessions, and the
  `password_changed_at` check can go.
- Tricky: every request now reads a row. It is a primary key lookup on a
  small table; fine, but worth one look with `EXPLAIN`.
- Tricky: tokens issued before the change have no `sid`. Accept them until
  they expire (at most `ACCESS_TOKEN_MINUTES`) or reject them and sign
  everyone out once. I lean towards rejecting: it is one sign-in for each
  user.
- Undecided: moving the token into an `HttpOnly` cookie (see item 5). Sessions
  are the natural moment for it.
- Tests: logout makes the token fail, revoking one session leaves the other,
  change password revokes the rest.

### 17. Password reset by email

A forgotten password means a lost account: there is no email at all in the
app. For a self-hosted single user that may be fine (they can reset it in the
database), for anyone with a second user it is not.

- Optional SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, `MAIL_FROM`). Without them, the "forgot password" link is
  hidden and a `python -m app.reset_password <email>` command prints a one-time
  link for the admin to pass on.
- `POST /auth/forgot-password` always answers the same ("if the address has an
  account, a link is on its way"), rate-limited per address and email like
  sign-in. The link carries a random token whose hash is stored with an
  expiry of an hour; `POST /auth/reset-password` checks it, sets the password
  and `password_changed_at`, and uses the token up.
- A mailpit service in `docker-compose.yml` (port within the free ranges) for
  development, as other apps of mine do.
- Tricky: the email check. Registration answers `email_taken`, so the reset
  endpoint hiding whether an address exists protects little. Keep it uniform
  anyway; it costs nothing.
- Tricky: sending inline makes the request slow and leaks timing. Send after
  the response with FastAPI's background tasks.
- Tests: with a fake mailer: the link works once, expires, does not work after
  a password change, and unknown addresses get the same answer.

### 18. Closed sign-up and invites

Anyone who can reach the instance can create an account (`POST
/auth/register`, limited only by `REGISTRATIONS_PER_HOUR`). For a personal
instance on the internet that is an open door to someone else's storage.

- `REGISTRATION` setting: `open` (today), `closed`, or `invite`. Closed hides
  the register page and refuses the endpoint. Invite accepts a code.
- Invites: `python -m app.invite` prints a single-use code with an expiry; the
  first user is always allowed so a fresh instance can be set up.
- The demo seed is unaffected.
- Tests: each mode, codes used once, the first user rule.

### 19. Time zones for the dashboard and activity

"Highlights per week" groups by ISO week in UTC (`weekly_counts` in
`services/stats.py`), and the activity page groups by day. For someone in
UTC+10 a Monday morning highlight falls into the previous week, and evening
reading in the Americas lands on tomorrow.

- A `time_zone` on `users` (IANA name, default from the browser on first
  sign-in, editable in settings). `weekly_counts` converts each timestamp with
  `zoneinfo` before taking the date; the same for "today" in item 8 and the
  day headings on the activity page.
- Tricky: the browser can send any string. Check it against
  `zoneinfo.available_timezones()`.
- Tricky: the week boundaries in SQL. Today the counting is in Python over
  timestamps loaded for twelve weeks, which is fine; do not move it into SQL
  just for this.
- Tests: the same highlight counted in different weeks for UTC and for
  `Australia/Sydney`; a daylight saving change inside the range.

### 20. Stable paging in the activity feed

`recent_activity` merges documents, highlights and comments, takes a page, and
returns the time of the last item as `next_before`. The next page asks for
items `created_at < before`. Items that share that exact timestamp with the
last item on the page but did not fit on it are skipped for good. With
timestamps from `utcnow()` that is rare in normal use; it becomes common with
imports that set many rows to the same time (items 6 and 9) and with the bulk
operations.

- A compound cursor: the timestamp plus the kind and id of the last item,
  encoded as one opaque string. Each source query uses `(created_at, id) <
(:at, :id)` with the kind deciding ties, so the merge order is total.
- The frontend treats `next_before` as an opaque value already; check that it
  does not parse it as a date.
- Tests: fifty highlights with one timestamp, paged through ten at a time,
  every one seen exactly once.

### 21. A note on the whole document

Notes hang off highlights. A summary of the whole book, "why I read this", or
a verdict has nowhere to go except a highlight on the title.

- Data: `note` (text) on `documents`, with the same 20,000 character limit as
  highlight notes. Edited in the document details form, shown at the top of
  the highlights panel and in the library card.
- Exports: under the title in Markdown, a `note` field in JSON, a column in
  CSV (as a row of its own with no quote, or a document column; I lean
  towards leaving CSV per highlight and putting the note only in Markdown and
  JSON).
- Search: included in item 11's document vector; before that, add it to the
  `ILIKE` conditions.
- Tests: save and clear, export, search.

### 22. Names for highlight colours

Five colours, fixed in `HIGHLIGHT_COLORS`, and the meaning is in the reader's
head. Most people settle on a code (yellow for key ideas, blue for
definitions, pink for disagree) and then forget it.

- Data: a `color_labels` JSON column on `users`, colour to a short label.
  Edited in settings, shown in the colour picker as the button's label, in
  filters and in exports (Markdown can say "Key idea" above the quote, JSON
  gets `color_label`).
- The colours themselves stay fixed: they are `HIGHLIGHT_COLORS`, the `Color`
  literal in `schemas/highlights.py` and CSS variables, and five is enough.
- Tests: labels appear in exports; unknown colours in the setting are refused.

### 23. Save from the browser

Importing a page means copying its address into the new document form. That
is the most common way in for web reading, and it takes four steps.

- A bookmarklet on the settings page that opens
  `/documents/new?url=<current page>` in a new tab, where the form is filled
  and submitted with one click. No extension to maintain.
- A web app manifest with a `share_target`, so on Android the app appears in
  the share sheet once installed, using the same route.
- `NewDocumentPage` reads the `url` parameter; `lib/params.ts` already parses
  query strings.
- Tricky: pages behind a login. The server fetches the page, not the browser,
  so paywalled and signed-in pages import as the login screen. Say so; a
  browser extension that sends the page's HTML would fix it, and is a lot more
  to maintain.
- Tests: the page fills from the parameter; the bookmarklet string encodes the
  url.

### 24. One Markdown file per document

The Markdown export is one file for everything, or one document at a time.
People who keep notes in Obsidian or Logseq want one file per book, with front
matter, that they can export again later without creating duplicates.

- `GET /export?format=md-zip` returns a zip with one file per document
  (`slugify(title).md`, with a suffix on clashes), YAML front matter (`title`,
  `author`, `source`, `annotate_id`, `tags` used, `exported`), and the same
  body as `document_markdown`.
- Each highlight gets a stable block id (`^h123`) so notes elsewhere can link
  to it and a later export keeps the link.
- Tricky: front matter values need YAML quoting; titles with colons and
  quotes are common. Write a tiny quoting function and test it, no YAML
  library.
- Tricky: file names on Windows (reserved names, trailing dots). `slugify`
  is already ASCII; add the reserved names.
- Overlaps with item 6, which builds a zip as well; share the writer.
- Tests: the file list, front matter for awkward titles, block ids.

### 25. Share a document's highlights by link

Everything is private, which is right by default. But "here are my notes on
this paper" is a common thing to want to send, and an export file is clumsy.

- `POST /documents/{id}/share` creates a share with a random token (32 bytes,
  stored hashed) and options: include notes or not, include the full text or
  only the quotes. `DELETE` revokes it.
- A public page `/s/<token>` served by the web app, reading a public endpoint
  `GET /shared/<token>` that needs no auth and returns only what the options
  allow. No owner email, no tags unless chosen, no comments.
- Tricky: sharing the full text of something copyrighted. Default to quotes
  and notes only; the full text needs an explicit choice and a sentence about
  it.
- Tricky: the public page must not run with the owner's token in scope; it is
  a separate route that reads nothing from `tokenStore`. The CSP from item 5
  applies here too.
- Tricky: search engines. Send `noindex` on shared pages.
- Tests: the public endpoint returns only what is allowed, revoking makes it
  404, the token is not stored in plain text.

### 26. Personal API tokens

The JSON export is "for scripts", but a script has to sign in with the
password and keep a week-long token to use the API. A token with a narrow
scope and a name, revocable on its own, is the normal way to do it.

- Data: `api_tokens` (`user_id`, `name`, `token_hash`, `scope` read or
  read-write, `created_at`, `last_used_at`, `revoked_at`). The token is shown
  once, with a prefix (`ann_`) so it is recognisable in logs and secret
  scanners.
- `get_current_user` accepts either a session token or an API token; read-only
  tokens are refused on anything but `GET`. Account settings, password change
  and delete account always need a session.
- Depends on item 16 for the session table and the settings page section it
  adds.
- Tests: read-only token refused on writes, revoked token refused, never
  allowed on account routes.

### 27. Sign-in limits shared across workers

`ratelimit.py` keeps counts in the memory of one process and says so: with
several workers the limit multiplies, and a restart resets it. The compose
file runs one uvicorn worker, so today it holds, but anyone who adds
`--workers 4` for speed quietly makes guessing four times faster.

- A limiter backed by PostgreSQL: a `rate_limit_hits` table (`key`, `at`)
  with an index, counting rows inside the window and deleting old ones on the
  way. It has the same interface as `SlidingWindowLimiter`, chosen by a
  setting (`RATE_LIMIT_BACKEND=memory|database`).
- While there: `login` answers faster for an unknown email than for a wrong
  password, because it skips `verify_password`. Verify against a fixed dummy
  hash for unknown users so both take the argon2 time.
- Tricky: the table grows with failed attempts. Delete rows older than the
  window in the same request that counts them, limited in number.
- Tests: two app instances on one database share the count; the dummy hash
  is used for unknown emails.

### 28. Bounded PDF extraction

PDFs are parsed in the request with pypdf, up to `MAX_UPLOAD_MB`, with no
limit on pages, on time, or on the size of the extracted text. A small file
can expand a lot (compressed streams), and a crafted one can keep pypdf busy
for a long time, holding a worker. The same path runs for PDFs fetched by url
import.

- A page cap (`MAX_PDF_PAGES`, default 2,000) and a cap on extracted
  characters matching `DocumentCreate.content`'s 2,000,000, checked as pages
  are read, so a huge PDF stops early.
- A time limit: run the extraction in a separate process with a timeout
  (`concurrent.futures.ProcessPoolExecutor` with one worker, or a plain
  `multiprocessing` call), so a stuck parse can be killed. A thread cannot be
  stopped.
- Errors say which limit was hit.
- Tests: a generated PDF over the page cap; a slow parse simulated with a
  patched reader to check the timeout path.

### 29. Logs and metrics for running it

There is one access log line per request with a request id, and `/api/health`
checks the database. That is enough to debug on a laptop, thin for a server.

- An option for JSON log lines (`LOG_FORMAT=json`), with request id, user id,
  route template (not the raw path), status and time, so a log tool can group
  them.
- `/api/metrics` in Prometheus text format, off by default and only on the
  local port: request counts and durations by route and status, imports by
  outcome, and the database pool's in-use connections. Written by hand; it is a
  few counters and does not need a client library.
- Separate liveness (process is up) from readiness (database reachable) in
  `routes/health.py`, so an orchestrator does not restart the API when the
  database blips.
- Tests: the JSON formatter; the metrics output after a few requests.

### 30. Exports and lists at scale

Every export builds the whole file in memory: `export_highlights` loads all
matching highlights with tags, documents and comments, then joins one string.
A few thousand highlights is fine; an account that imported years of Kindle
clippings (item 9) is not. The tags page lists every tag with counts in one
query, and the collections page every collection, without pages.

- Exports stream: fetch highlights in pages ordered by document and offset,
  write each through a generator, and return a `StreamingResponse`. Markdown
  and CSV are naturally streaming; JSON needs the document grouping written
  by hand rather than through `json.dumps` of one dict.
- Measure first with a generated account (10,000 highlights, 500 documents)
  in a test that counts queries, not time.
- Tricky: `selectinload` per page keeps the queries bounded; check that no
  lazy load sneaks in (a test that fails on lazy loads is simple with
  SQLAlchemy's `raiseload`).
- Tests: the streamed output equals the old one for a seeded account; query
  counts stay flat as the account grows.

## Maybe

### 31. Editing document text

Document text cannot be edited after upload, and the README says why: offsets
never go stale. But PDF extraction leaves page headers and broken words, url
imports keep cookie banners, and a typo in a pasted text stays forever. Today
the only fix is to upload again and lose the highlights.

- An edit mode that sends the new text. The server computes a diff between
  old and new (`difflib.SequenceMatcher` on characters is too slow for 2 MB;
  diff by lines, then by characters inside changed lines), and moves every
  highlight's offsets through it.
- A highlight whose range was edited inside is re-anchored by searching for
  its `quote` near the old place; if it cannot be found, it is kept as
  "detached" with its quote and shown in a list for the user to place again
  or delete.
- Reading progress `last_position` moves through the same mapping.
- Tricky: this is the change the whole design avoided. Every place that
  assumes `quote == content[start:end]` needs to cope with detached
  highlights, including exports and the reader.
- Undecided: whether a smaller version is enough: "clean up" actions that
  only delete text (remove lines matching a pattern, remove a range), where
  moving offsets is simple subtraction and nothing gets detached. I lean
  towards building that first.
- Tests: offset mapping as pure functions with many cases; detached
  highlights through export.

### 32. Links between highlights

Ideas in one book answer ideas in another. A note can mention another
highlight only by pasting its text.

- `[[h:123]]` in notes and comments links to a highlight; the editor offers a
  search (the existing `/highlights?q=`) when you type `[[`. Rendered as a
  link with the quote's first words.
- Backlinks: the highlight editor shows "mentioned in" for highlights whose
  notes link to it. A `highlight_links` table kept in sync when a note is
  saved makes that a simple query.
- Exports: in the per-document Markdown files (item 24) the links become
  Obsidian block links (`[[file#^h123]]`), which is where this pays off.
- Tricky: deleted targets. Show the link as broken, do not rewrite notes.
- Tests: parsing links, keeping the table in sync, backlinks.

### 33. Nested tags

Tags are flat names. People with many tags want `philosophy/stoicism` and to
filter by `philosophy` to get everything under it.

- No schema change: a `/` in a name means a level. The tags page shows a
  tree; filtering by a parent includes children (`name = :t or name like
:t || '/%'`). Renaming a parent renames the children in one transaction,
  reusing the merge logic in `rename_tag`.
- Tricky: `normalise_tag` collapses spaces; decide what it does around `/`.
- Tests: tree building, parent filters, renaming with merges.

### 34. Saved searches as smart collections

Collections are hand-made lists of documents. A search with filters (tag,
colour, collection, words) is often what someone wants to come back to.

- A saved search stores the query string and filters with a name, and shows
  in the sidebar next to collections; opening it runs the search.
- Exporting a saved search is the existing `/export` with its filters.
- Undecided: whether this is worth a table or whether a bookmarkable url (the
  search page already keeps filters in the query string through
  `lib/params.ts`) is enough. It may well be enough.
- Tests: create, run, delete.

### 35. Reading time and streaks

The dashboard counts highlights. Reading itself is invisible: how long, how
much, how often.

- The reader already saves progress as you scroll. Record reading sessions
  (start, end, words advanced) from the same events, with idle detection
  (no scroll and no selection for a few minutes ends the session).
- Dashboard: minutes per week, words read, days in a row with some reading.
- Depends on item 19 for days in the reader's own time zone.
- Tricky: this is tracking, even if private. It should be possible to turn it
  off, and the account export must include it.
- Undecided: whether streaks help or nag. I am not sure.

### 36. Reading offline

Reading on a train with no signal is a common case, and every page here needs
the API.

- A service worker caches the app shell and the documents opened recently
  (their detail and highlights). Highlights made offline go into a queue in
  IndexedDB and are sent when the connection returns.
- Tricky: conflicts are rare (one user), but a highlight created offline on a
  document deleted elsewhere has to fail visibly.
- Tricky: the CSP from item 5 needs `worker-src 'self'`; the cache must be
  cleared on sign out, or the next person on the computer reads the last one's
  documents.
- Large and easy to get subtly wrong; Maybe until someone asks.

### 37. Text recognition for scanned PDFs

Scanned PDFs are refused ("scanned PDFs are not supported yet"). Plenty of
papers and old books only exist as scans.

- An optional OCR step with Tesseract (through `ocrmypdf` or the `tesseract`
  binary) in the API image, behind a setting. A scanned upload is recognised,
  then goes through the normal text extraction.
- Tricky: it is slow (seconds per page) and the request cannot wait. This
  needs a job that runs after the upload and a document state ("processing"),
  which the app does not have anywhere yet.
- Tricky: image size grows by a few hundred megabytes with the language data.
- Depends on item 28 for the page and time limits.

### 38. Two-step sign-in

Accounts are email and password only. For an instance on the internet, a
second factor is the usual next step.

- TOTP (authenticator apps), with a secret shown as a QR code and confirmed
  with one code, and ten single-use recovery codes stored hashed. Implemented
  with the standard library (`hmac`, `hashlib`, `base64`); the algorithm is
  short and well specified.
- Sign-in becomes two steps: password, then a code, with a short-lived token
  between them that can do nothing else. The code step has its own rate
  limit.
- Depends on item 16 so that turning it on can sign out other sessions.
- Tests: the TOTP function against the RFC 6238 test vectors; sign-in with and
  without a code; recovery codes used once.
