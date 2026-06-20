"""trigram indexes for search

Search uses ILIKE '%term%', which a plain btree index cannot help with.
pg_trgm GIN indexes keep it fast once there are a few thousand highlights.

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-20 11:15:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

INDEXES = [
    ("ix_highlights_quote_trgm", "highlights", "quote"),
    ("ix_highlights_note_trgm", "highlights", "note"),
    ("ix_documents_title_trgm", "documents", "title"),
]


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    for name, table, column in INDEXES:
        op.execute(
            f"CREATE INDEX IF NOT EXISTS {name} ON {table} USING gin ({column} gin_trgm_ops)"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for name, _, _ in INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
