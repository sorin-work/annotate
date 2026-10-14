from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Response
from sqlalchemy import Select

from app.deps import CurrentUser, DbSession
from app.models import Document, Highlight
from app.schemas.highlights import Color
from app.services import collections as collection_service
from app.services import documents as document_service
from app.services import export
from app.services import highlights as highlight_service

router = APIRouter(tags=["export"])

ExportFormat = Literal["md", "csv", "json"]
MEDIA_TYPES = {
    "md": "text/markdown; charset=utf-8",
    "csv": "text/csv; charset=utf-8",
    "json": "application/json",
}


def _download(body: str, filename: str, fmt: ExportFormat) -> Response:
    return Response(
        content=body,
        media_type=MEDIA_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename}.{fmt}"'},
    )


def _ordered(query: Select[tuple[Highlight]]) -> Select[tuple[Highlight]]:
    return query.order_by(Document.title, Highlight.document_id, Highlight.start_offset)


@router.get("/documents/{document_id}/export")
def export_document(
    document_id: int, user: CurrentUser, db: DbSession, format: ExportFormat = "md"
) -> Response:
    document = document_service.get_document(db, user, document_id)
    highlights = highlight_service.list_for_document(db, document)
    if format == "csv":
        body = export.highlights_csv(highlights)
    elif format == "json":
        body = export.highlights_json(highlights, document=document)
    else:
        body = export.document_markdown(document, highlights)
    return _download(body, export.slugify(document.title), format)


@router.get("/export")
def export_highlights(
    user: CurrentUser,
    db: DbSession,
    format: ExportFormat = "md",
    tag: str | None = None,
    color: Color | None = None,
    collection_id: int | None = None,
) -> Response:
    title = "Highlights"
    if collection_id is not None:
        title = collection_service.get_collection(db, user, collection_id).name
    elif tag:
        title = f"Highlights tagged #{tag}"

    query = highlight_service.filtered_query(
        user, tag=tag, color=color, collection_id=collection_id
    )
    highlights = list(db.scalars(_ordered(query)))
    if format == "csv":
        body = export.highlights_csv(highlights)
    elif format == "json":
        body = export.highlights_json(highlights)
    else:
        body = export.highlights_markdown(highlights, title=title)
    stamp = datetime.now(UTC).strftime("%Y%m%d")
    return _download(body, f"{export.slugify(title)}-{stamp}", format)
