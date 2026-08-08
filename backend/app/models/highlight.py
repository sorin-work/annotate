from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Column, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, utcnow

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.document import Document
    from app.models.tag import Tag

HIGHLIGHT_COLORS = ("yellow", "green", "blue", "pink", "purple")

highlight_tags = Table(
    "highlight_tags",
    Base.metadata,
    Column("highlight_id", ForeignKey("highlights.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Highlight(Base):
    __tablename__ = "highlights"
    __table_args__ = (CheckConstraint("end_offset > start_offset", name="valid_range"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    start_offset: Mapped[int]
    end_offset: Mapped[int]
    quote: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(16), default="yellow")
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    document: Mapped["Document"] = relationship(back_populates="highlights")
    tags: Mapped[list["Tag"]] = relationship(
        secondary=highlight_tags, back_populates="highlights", order_by="Tag.name"
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="highlight",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Comment.created_at, Comment.id",
    )
