from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.errors import AppError, NotFoundError
from app.models import Document, Highlight, Tag, User, collection_documents
from app.schemas.highlights import (
    HighlightBulkAction,
    HighlightBulkResult,
    HighlightCreate,
    HighlightOut,
    HighlightUpdate,
    HighlightWithDocument,
)
from app.services.tags import get_or_create_tags, normalise_tag
from app.services.text import LIKE_ESCAPE, like_pattern

SORTS = {
    "newest": (Highlight.created_at.desc(), Highlight.id.desc()),
    "oldest": (Highlight.created_at.asc(), Highlight.id.asc()),
    # Reading order: by document, then position in the text.
    "document": (
        func.lower(Document.title).asc(),
        Highlight.document_id.asc(),
        Highlight.start_offset.asc(),
        Highlight.id.asc(),
    ),
}


def create_highlight(
    db: Session, user: User, document: Document, data: HighlightCreate
) -> Highlight:
    if data.end_offset > len(document.content):
        raise AppError("Highlight is outside the document", code="out_of_range")
    quote = document.content[data.start_offset : data.end_offset]
    if not quote.strip():
        raise AppError("Highlight must contain some text", code="empty_highlight")

    highlight = Highlight(
        document_id=document.id,
        owner_id=user.id,
        start_offset=data.start_offset,
        end_offset=data.end_offset,
        quote=quote,
        color=data.color,
        note=(data.note or "").strip() or None,
        tags=get_or_create_tags(db, user, data.tags),
    )
    db.add(highlight)
    db.commit()
    return highlight


def get_highlight(db: Session, user: User, highlight_id: int) -> Highlight:
    highlight = db.get(Highlight, highlight_id)
    if highlight is None or highlight.owner_id != user.id:
        raise NotFoundError("Highlight not found")
    return highlight


def update_highlight(
    db: Session, user: User, highlight: Highlight, data: HighlightUpdate
) -> Highlight:
    changes = data.model_dump(exclude_unset=True)
    if changes.get("color"):
        highlight.color = changes["color"]
    if "note" in changes:
        highlight.note = (changes["note"] or "").strip() or None
    if changes.get("tags") is not None:
        highlight.tags = get_or_create_tags(db, user, changes["tags"])
    db.commit()
    return highlight


def delete_highlight(db: Session, highlight: Highlight) -> None:
    db.delete(highlight)
    db.commit()


def bulk_update(db: Session, user: User, data: HighlightBulkAction) -> HighlightBulkResult:
    """Apply one change to several highlights; all of them must belong to ``user``."""
    ids = list(dict.fromkeys(data.ids))
    highlights = list(
        db.scalars(
            select(Highlight)
            .where(Highlight.id.in_(ids), Highlight.owner_id == user.id)
            .options(selectinload(Highlight.tags))
        )
    )
    if len(highlights) != len(ids):
        raise NotFoundError("Some of these highlights do not exist")

    if data.delete:
        for highlight in highlights:
            db.delete(highlight)
        db.commit()
        return HighlightBulkResult(deleted=len(highlights))

    added = get_or_create_tags(db, user, data.add_tags)
    removed = {normalise_tag(name) for name in data.remove_tags}
    for highlight in highlights:
        if data.color is not None:
            highlight.color = data.color
        tags = [tag for tag in highlight.tags if tag.name not in removed]
        tags += [tag for tag in added if tag not in tags]
        if tags != highlight.tags:
            highlight.tags = tags
    db.commit()
    return HighlightBulkResult(updated=len(highlights))


def list_for_document(db: Session, document: Document) -> list[Highlight]:
    return list(
        db.scalars(
            select(Highlight)
            .where(Highlight.document_id == document.id)
            .options(selectinload(Highlight.tags), selectinload(Highlight.comments))
            .order_by(Highlight.start_offset, Highlight.id)
        )
    )


def filtered_query(
    user: User,
    *,
    q: str | None = None,
    tag: str | None = None,
    color: str | None = None,
    document_id: int | None = None,
    collection_id: int | None = None,
) -> Select[tuple[Highlight]]:
    """Highlights belonging to ``user`` matching all of the given filters."""
    query = (
        select(Highlight)
        .join(Document, Document.id == Highlight.document_id)
        .where(Highlight.owner_id == user.id)
        .options(
            selectinload(Highlight.tags),
            selectinload(Highlight.document),
            selectinload(Highlight.comments),
        )
    )
    if q:
        pattern = like_pattern(q)
        query = query.where(
            or_(
                Highlight.quote.ilike(pattern, escape=LIKE_ESCAPE),
                Highlight.note.ilike(pattern, escape=LIKE_ESCAPE),
                Highlight.tags.any(Tag.name.ilike(pattern, escape=LIKE_ESCAPE)),
            )
        )
    if tag:
        query = query.where(Highlight.tags.any(Tag.name == normalise_tag(tag)))
    if color:
        query = query.where(Highlight.color == color)
    if document_id is not None:
        query = query.where(Highlight.document_id == document_id)
    if collection_id is not None:
        query = query.where(
            Highlight.document_id.in_(
                select(collection_documents.c.document_id).where(
                    collection_documents.c.collection_id == collection_id
                )
            )
        )
    return query


def to_out(highlight: Highlight) -> HighlightOut:
    return HighlightOut(
        id=highlight.id,
        document_id=highlight.document_id,
        start_offset=highlight.start_offset,
        end_offset=highlight.end_offset,
        quote=highlight.quote,
        color=highlight.color,
        note=highlight.note,
        tags=sorted(tag.name for tag in highlight.tags),
        comment_count=len(highlight.comments),
        created_at=highlight.created_at,
        updated_at=highlight.updated_at,
    )


def to_out_with_document(highlight: Highlight) -> HighlightWithDocument:
    return HighlightWithDocument(
        **to_out(highlight).model_dump(), document_title=highlight.document.title
    )
