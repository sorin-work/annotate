from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Document, Highlight, User, collection_documents
from app.schemas.search import DocumentHit, SearchResults
from app.services import highlights as highlight_service
from app.services.text import snippet_around


def search(
    db: Session,
    user: User,
    q: str,
    *,
    tag: str | None = None,
    color: str | None = None,
    collection_id: int | None = None,
    limit: int = 50,
) -> SearchResults:
    q = q.strip()
    document_hits: list[DocumentHit] = []

    # Filters only make sense for highlights; a plain query also matches documents.
    if q and not tag and not color:
        pattern = f"%{q}%"
        query = select(Document).where(
            Document.owner_id == user.id,
            or_(
                Document.title.ilike(pattern),
                Document.author.ilike(pattern),
                Document.content.ilike(pattern),
            ),
        )
        if collection_id is not None:
            query = query.where(
                Document.id.in_(
                    select(collection_documents.c.document_id).where(
                        collection_documents.c.collection_id == collection_id
                    )
                )
            )
        for document in db.scalars(query.order_by(Document.title).limit(limit)):
            in_title = q.lower() in document.title.lower()
            document_hits.append(
                DocumentHit(
                    id=document.id,
                    title=document.title,
                    author=document.author,
                    snippet=snippet_around(document.content, "" if in_title else q),
                )
            )

    highlight_hits = []
    if q or tag or color:
        query = highlight_service.filtered_query(
            user, q=q or None, tag=tag, color=color, collection_id=collection_id
        )
        rows = db.scalars(
            query.order_by(Highlight.created_at.desc(), Highlight.id.desc()).limit(limit)
        )
        highlight_hits = [highlight_service.to_out_with_document(h) for h in rows]

    return SearchResults(query=q, documents=document_hits, highlights=highlight_hits)
