"""create highlights and tags

Revision ID: 0003
Revises: 0002
Create Date: 2025-12-13 14:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "highlights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("color", sa.String(16), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_highlights"),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
            name="fk_highlights_document_id_documents",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_highlights_owner_id_users", ondelete="CASCADE"
        ),
        sa.CheckConstraint("end_offset > start_offset", name="ck_highlights_valid_range"),
    )
    op.create_index("ix_highlights_document_id", "highlights", ["document_id"])
    op.create_index("ix_highlights_owner_id", "highlights", ["owner_id"])

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_tags"),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_tags_owner_id_users", ondelete="CASCADE"
        ),
        sa.UniqueConstraint("owner_id", "name", name="uq_tags_owner_name"),
    )
    op.create_index("ix_tags_owner_id", "tags", ["owner_id"])

    op.create_table(
        "highlight_tags",
        sa.Column("highlight_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("highlight_id", "tag_id", name="pk_highlight_tags"),
        sa.ForeignKeyConstraint(
            ["highlight_id"],
            ["highlights.id"],
            name="fk_highlight_tags_highlight_id_highlights",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"], ["tags.id"], name="fk_highlight_tags_tag_id_tags", ondelete="CASCADE"
        ),
    )


def downgrade() -> None:
    op.drop_table("highlight_tags")
    op.drop_index("ix_tags_owner_id", table_name="tags")
    op.drop_table("tags")
    op.drop_index("ix_highlights_owner_id", table_name="highlights")
    op.drop_index("ix_highlights_document_id", table_name="highlights")
    op.drop_table("highlights")
