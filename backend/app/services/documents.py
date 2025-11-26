from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.errors import AppError, NotFoundError
from app.models import Document, User
from app.schemas.documents import DocumentCreate, DocumentDetail, DocumentSummary, DocumentUpdate
from app.services import text as textutil

SORTS = {
    "recent": (Document.created_at.desc(),),
    "created": (Document.created_at.desc(),),
    "title": (func.lower(Document.title).asc(),),
}


def create_document(db: Session, user: User, data: DocumentCreate) -> Document:
    content = data.content
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


def get_document(db: Session, user: User, document_id: int) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.owner_id != user.id:
        raise NotFoundError("Document not found")
    return document


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


def list_documents(
    db: Session,
    user: User,
    *,
    q: str | None = None,
    sort: str = "recent",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Document], int]:
    query = select(Document).where(Document.owner_id == user.id)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(or_(Document.title.ilike(pattern), Document.author.ilike(pattern)))

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    order = SORTS.get(sort, SORTS["recent"])
    documents = list(
        db.scalars(query.order_by(*order, Document.id.desc()).limit(limit).offset(offset))
    )
    return documents, total


def to_summary(document: Document, highlight_count: int = 0) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        title=document.title,
        source_type=document.source_type,
        author=document.author,
        word_count=document.word_count,
        highlight_count=highlight_count,
        excerpt=textutil.excerpt(document.content),
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


def to_detail(document: Document) -> DocumentDetail:
    summary = to_summary(document)
    return DocumentDetail(
        **summary.model_dump(),
        content=document.content,
        original_filename=document.original_filename,
        source_url=document.source_url,
    )
