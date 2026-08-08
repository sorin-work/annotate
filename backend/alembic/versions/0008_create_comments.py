"""comments on highlights

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-08 10:05:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("highlight_id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["highlight_id"],
            ["highlights.id"],
            name="fk_comments_highlight_id_highlights",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_comments_owner_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_comments"),
    )
    op.create_index("ix_comments_highlight_id", "comments", ["highlight_id"])
    op.create_index("ix_comments_owner_id", "comments", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_comments_owner_id", table_name="comments")
    op.drop_index("ix_comments_highlight_id", table_name="comments")
    op.drop_table("comments")
