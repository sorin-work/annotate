from pathlib import PurePath

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.errors import AppError, NotFoundError
from app.models import Document, Highlight, User
from app.schemas.documents import DocumentCreate, DocumentDetail, DocumentSummary, DocumentUpdate
from app.services import text as textutil
from app.services.pdf import extract_pdf

TEXT_EXTENSIONS = {".txt": "text", ".text": "text", ".md": "markdown", ".markdown": "markdown"}
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
    summary = to_summary(document, len(document.highlights))
    return DocumentDetail(
        **summary.model_dump(),
        content=document.content,
        original_filename=document.original_filename,
        source_url=document.source_url,
    )
