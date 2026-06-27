from pathlib import PurePath

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session, defer

from app.db import utcnow
from app.errors import AppError, NotFoundError
from app.models import Collection, Document, Highlight, User, collection_documents
from app.schemas.documents import (
    DocumentCreate,
    DocumentDetail,
    DocumentSummary,
    DocumentUpdate,
    ReadingProgress,
)
from app.services import text as textutil
from app.services.pdf import extract_pdf

TEXT_EXTENSIONS = {".txt": "text", ".text": "text", ".md": "markdown", ".markdown": "markdown"}
# The library shows a short excerpt; this much text is plenty to cut it from.
EXCERPT_SOURCE_CHARS = 2000
SORTS = {
    "recent": (func.coalesce(Document.last_opened_at, Document.created_at).desc(),),
    "created": (Document.created_at.desc(),),
    "title": (func.lower(Document.title).asc(),),
}


def create_document(db: Session, user: User, data: DocumentCreate) -> Document:
    content = textutil.normalise_newlines(data.content)
    document = Document(
        owner_id=user.id,
        title=data.title,
        source_type=data.source_type,
        content=content,
        word_count=textutil.count_words(content),
        author=data.author or None,
        source_url=data.source_url or None,
    )
    db.add(document)
    db.commit()
    return document


def create_from_upload(
    db: Session, user: User, filename: str, data: bytes, title: str | None = None
) -> Document:
    path = PurePath(filename or "upload.txt")
    extension = path.suffix.lower()
    detected_title: str | None = None

    if extension == ".pdf":
        source_type = "pdf"
        content, detected_title = extract_pdf(data)
    elif extension in TEXT_EXTENSIONS:
        source_type = TEXT_EXTENSIONS[extension]
        try:
            content = data.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise AppError("Text files must be UTF-8 encoded", code="invalid_file") from exc
        if source_type == "markdown":
            detected_title = textutil.markdown_title(content)
    else:
        raise AppError(
            "Unsupported file type. Upload a .txt, .md or .pdf file", code="unsupported_file"
        )

    content = textutil.normalise_newlines(content)
    if not content.strip():
        raise AppError("The file is empty", code="invalid_file")

    document = Document(
        owner_id=user.id,
        title=(title or "").strip() or detected_title or path.stem.replace("_", " ")[:300],
        source_type=source_type,
        content=content,
        word_count=textutil.count_words(content),
        original_filename=path.name[:255],
    )
    db.add(document)
    db.commit()
    return document


def get_document(db: Session, user: User, document_id: int) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.owner_id != user.id:
        raise NotFoundError("Document not found")
    return document


def mark_opened(db: Session, document: Document) -> None:
    """Remember when a document was last read without bumping ``updated_at``."""
    opened_at = utcnow()
    db.execute(
        update(Document)
        .where(Document.id == document.id)
        .values(last_opened_at=opened_at, updated_at=Document.updated_at)
    )
    db.commit()
    document.last_opened_at = opened_at


def save_progress(db: Session, document: Document, data: ReadingProgress) -> ReadingProgress:
    """Store how far the user got; like opening, this is not an edit of the document."""
    position = data.position
    if position is not None:
        position = min(position, len(document.content))
    db.execute(
        update(Document)
        .where(Document.id == document.id)
        .values(
            reading_progress=data.progress,
            last_position=position,
            updated_at=Document.updated_at,
        )
    )
    db.commit()
    document.reading_progress = data.progress
    document.last_position = position
    return ReadingProgress(progress=data.progress, position=position)


def update_document(db: Session, document: Document, data: DocumentUpdate) -> Document:
    changes = data.model_dump(exclude_unset=True)
    if "title" in changes:
        title = (changes["title"] or "").strip()
        if not title:
            raise AppError("title: must not be blank", code="validation_error", status_code=422)
        document.title = title
    if "author" in changes:
        document.author = changes["author"] or None
    if "source_url" in changes:
        document.source_url = changes["source_url"] or None
    db.commit()
    return document


def delete_document(db: Session, document: Document) -> None:
    db.delete(document)
    db.commit()


def highlight_counts(db: Session, document_ids: list[int]) -> dict[int, int]:
    if not document_ids:
        return {}
    rows = db.execute(
        select(Highlight.document_id, func.count(Highlight.id))
        .where(Highlight.document_id.in_(document_ids))
        .group_by(Highlight.document_id)
    )
    return {row[0]: row[1] for row in rows}


def list_documents(
    db: Session,
    user: User,
    *,
    q: str | None = None,
    collection_id: int | None = None,
    sort: str = "recent",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[tuple[Document, str]], int]:
    """A page of documents, each with the start of its text for the excerpt.

    The full text is never loaded: documents can be megabytes long.
    """
    query = select(Document).where(Document.owner_id == user.id)
    if q:
        pattern = textutil.like_pattern(q)
        query = query.where(
            or_(
                Document.title.ilike(pattern, escape=textutil.LIKE_ESCAPE),
                Document.author.ilike(pattern, escape=textutil.LIKE_ESCAPE),
            )
        )
    if collection_id is not None:
        collection = db.get(Collection, collection_id)
        if collection is None or collection.owner_id != user.id:
            raise NotFoundError("Collection not found")
        query = query.join(
            collection_documents, collection_documents.c.document_id == Document.id
        ).where(collection_documents.c.collection_id == collection_id)

    ids = query.with_only_columns(Document.id).subquery()
    total = db.scalar(select(func.count()).select_from(ids)) or 0
    order = SORTS.get(sort, SORTS["recent"])
    head = func.substr(Document.content, 1, EXCERPT_SOURCE_CHARS).label("head")
    rows = db.execute(
        query.add_columns(head)
        .options(defer(Document.content))
        .order_by(*order, Document.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return [(document, text) for document, text in rows], total


def to_summary(
    document: Document, highlight_count: int = 0, head: str | None = None
) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        title=document.title,
        source_type=document.source_type,
        author=document.author,
        word_count=document.word_count,
        highlight_count=highlight_count,
        excerpt=textutil.excerpt(document.content if head is None else head),
        created_at=document.created_at,
        updated_at=document.updated_at,
        last_opened_at=document.last_opened_at,
        reading_progress=document.reading_progress,
    )


def to_detail(document: Document) -> DocumentDetail:
    summary = to_summary(document, len(document.highlights))
    return DocumentDetail(
        **summary.model_dump(),
        content=document.content,
        original_filename=document.original_filename,
        source_url=document.source_url,
        last_position=document.last_position,
        collections=[{"id": c.id, "name": c.name} for c in document.collections],
    )
