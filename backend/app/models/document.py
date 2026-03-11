from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, utcnow

if TYPE_CHECKING:
    from app.models.collection import Collection
    from app.models.highlight import Highlight

SOURCE_TYPES = ("text", "markdown", "pdf")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    source_type: Mapped[str] = mapped_column(String(20), default="text")
    content: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(default=0)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    author: Mapped[str | None] = mapped_column(String(200))
    source_url: Mapped[str | None] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    last_opened_at: Mapped[datetime | None] = mapped_column()

    highlights: Mapped[list["Highlight"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Highlight.start_offset",
    )
    collections: Mapped[list["Collection"]] = relationship(
        secondary="collection_documents", back_populates="documents"
    )
