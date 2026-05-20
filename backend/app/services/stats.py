"""Numbers for the dashboard."""

from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import utcnow
from app.models import Collection, Document, Highlight, Tag, User, highlight_tags
from app.models.highlight import HIGHLIGHT_COLORS
from app.schemas.stats import DocumentCount, Stats, TagCount, WeekCount

WEEKS = 12
TOP_TAGS = 8
TOP_DOCUMENTS = 5


def _count(db: Session, query) -> int:
    return db.scalar(query) or 0


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def weekly_counts(created: list[datetime], now: datetime, weeks: int = WEEKS) -> list[WeekCount]:
    """Highlights per ISO week (Monday to Sunday, UTC), oldest week first."""
    current = week_start(now.date())
    starts = [current - timedelta(weeks=n) for n in range(weeks - 1, -1, -1)]
    counts = dict.fromkeys(starts, 0)
    for moment in created:
        start = week_start(moment.date())
        if start in counts:
            counts[start] += 1
    return [WeekCount(week_start=start, highlights=count) for start, count in counts.items()]


def get_stats(db: Session, user: User, now: datetime | None = None) -> Stats:
    now = now or utcnow()
    mine = Highlight.owner_id == user.id

    colors = dict.fromkeys(HIGHLIGHT_COLORS, 0)
    for color, count in db.execute(
        select(Highlight.color, func.count()).where(mine).group_by(Highlight.color)
    ):
        colors[color] = count

    top_tags = [
        TagCount(name=name, count=count)
        for name, count in db.execute(
            select(Tag.name, func.count(highlight_tags.c.highlight_id).label("uses"))
            .join(highlight_tags, highlight_tags.c.tag_id == Tag.id)
            .where(Tag.owner_id == user.id)
            .group_by(Tag.id)
            .order_by(func.count(highlight_tags.c.highlight_id).desc(), Tag.name)
            .limit(TOP_TAGS)
        )
    ]

    since = datetime.combine(
        week_start(now.date()) - timedelta(weeks=WEEKS - 1), datetime.min.time(), now.tzinfo
    )
    created = list(
        db.scalars(select(Highlight.created_at).where(mine, Highlight.created_at >= since))
    )

    most_highlighted = [
        DocumentCount(id=doc_id, title=title, highlight_count=count)
        for doc_id, title, count in db.execute(
            select(Document.id, Document.title, func.count(Highlight.id))
            .join(Highlight, Highlight.document_id == Document.id)
            .where(Document.owner_id == user.id)
            .group_by(Document.id)
            .order_by(func.count(Highlight.id).desc(), Document.title)
            .limit(TOP_DOCUMENTS)
        )
    ]

    return Stats(
        documents=_count(db, select(func.count(Document.id)).where(Document.owner_id == user.id)),
        highlights=sum(colors.values()),
        notes=_count(db, select(func.count(Highlight.id)).where(mine, Highlight.note.is_not(None))),
        tags=_count(db, select(func.count(Tag.id)).where(Tag.owner_id == user.id)),
        collections=_count(
            db, select(func.count(Collection.id)).where(Collection.owner_id == user.id)
        ),
        words=_count(db, select(func.sum(Document.word_count)).where(Document.owner_id == user.id)),
        colors=colors,
        top_tags=top_tags,
        weekly=weekly_counts(created, now),
        most_highlighted=most_highlighted,
    )
