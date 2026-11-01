"""index highlights by owner and creation time

The highlights page, the activity feed and the dashboard all ask for one
user's highlights newest first; with a few thousand highlights the plain
owner_id index left Postgres sorting them every time.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-01 15:30:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_highlights_owner_id_created_at", "highlights", ["owner_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_highlights_owner_id_created_at", table_name="highlights")
