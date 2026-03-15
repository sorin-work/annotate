from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session, selectinload

from app.errors import AppError, NotFoundError
from app.models import Document, Highlight, Tag, User, collection_documents
from app.schemas.highlights import (
    HighlightCreate,
    HighlightOut,
    HighlightUpdate,
    HighlightWithDocument,
)
from app.services.tags import get_or_create_tags
from app.services.text import LIKE_ESCAPE, like_pattern


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


def list_for_document(db: Session, document: Document) -> list[Highlight]:
    return list(
        db.scalars(
            select(Highlight)
            .where(Highlight.document_id == document.id)
            .options(selectinload(Highlight.tags))
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
        .options(selectinload(Highlight.tags), selectinload(Highlight.document))
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
        query = query.where(Highlight.tags.any(Tag.name == tag))
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
        tags=[tag.name for tag in highlight.tags],
        created_at=highlight.created_at,
        updated_at=highlight.updated_at,
    )


def to_out_with_document(highlight: Highlight) -> HighlightWithDocument:
    return HighlightWithDocument(
        **to_out(highlight).model_dump(), document_title=highlight.document.title
    )
