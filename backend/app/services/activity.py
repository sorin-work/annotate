"""A reverse-chronological feed built from the timestamps we already store."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Document, Highlight, User
from app.schemas.activity import ActivityDocument, ActivityHighlight, ActivityItem, ActivityPage


def _documents(db: Session, user: User, before: datetime | None, limit: int) -> list[ActivityItem]:
    query = select(Document).where(Document.owner_id == user.id)
    if before is not None:
        query = query.where(Document.created_at < before)
    rows = db.scalars(query.order_by(Document.created_at.desc(), Document.id.desc()).limit(limit))
    return [
        ActivityItem(
            type="document_added",
            at=doc.created_at,
            document=ActivityDocument(id=doc.id, title=doc.title),
        )
        for doc in rows
    ]


def _highlights(db: Session, user: User, before: datetime | None, limit: int) -> list[ActivityItem]:
    query = (
        select(Highlight)
        .where(Highlight.owner_id == user.id)
        .options(selectinload(Highlight.document))
    )
    if before is not None:
        query = query.where(Highlight.created_at < before)
    rows = db.scalars(query.order_by(Highlight.created_at.desc(), Highlight.id.desc()).limit(limit))
    return [
        ActivityItem(
            type="highlight_added",
            at=h.created_at,
            document=ActivityDocument(id=h.document.id, title=h.document.title),
            highlight=ActivityHighlight(id=h.id, quote=h.quote, color=h.color, note=h.note),
        )
        for h in rows
    ]


def recent_activity(
    db: Session, user: User, *, before: datetime | None = None, limit: int = 30
) -> ActivityPage:
    # Each source can contribute at most ``limit`` items, so fetch one extra
    # from each to know whether an older page exists.
    items = _documents(db, user, before, limit + 1) + _highlights(db, user, before, limit + 1)
    items.sort(key=lambda item: item.at, reverse=True)
    page = items[:limit]
    has_more = len(items) > limit
    return ActivityPage(items=page, next_before=page[-1].at if has_more and page else None)
