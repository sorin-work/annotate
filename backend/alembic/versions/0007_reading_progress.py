"""reading progress and last position on documents

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-27 10:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("reading_progress", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column("documents", sa.Column("last_position", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "last_position")
    op.drop_column("documents", "reading_progress")
