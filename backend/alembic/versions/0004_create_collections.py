"""create collections

Revision ID: 0004
Revises: 0003
Create Date: 2026-01-24 13:05:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "collections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_collections"),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name="fk_collections_owner_id_users", ondelete="CASCADE"
        ),
    )
    op.create_index("ix_collections_owner_id", "collections", ["owner_id"])

    op.create_table(
        "collection_documents",
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("collection_id", "document_id", name="pk_collection_documents"),
        sa.ForeignKeyConstraint(
            ["collection_id"],
            ["collections.id"],
            name="fk_collection_documents_collection_id_collections",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
            name="fk_collection_documents_document_id_documents",
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    op.drop_table("collection_documents")
    op.drop_index("ix_collections_owner_id", table_name="collections")
    op.drop_table("collections")
