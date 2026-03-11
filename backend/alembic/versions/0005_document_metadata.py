"""add author, source url and last opened time to documents

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-07 16:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("author", sa.String(200), nullable=True))
    op.add_column("documents", sa.Column("source_url", sa.String(2000), nullable=True))
    op.add_column(
        "documents", sa.Column("last_opened_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("documents", "last_opened_at")
    op.drop_column("documents", "source_url")
    op.drop_column("documents", "author")
