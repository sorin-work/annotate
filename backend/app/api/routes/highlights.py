from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession
from app.schemas.common import Page
from app.schemas.highlights import (
    Color,
    HighlightBulkAction,
    HighlightBulkResult,
    HighlightCreate,
    HighlightOut,
    HighlightUpdate,
    HighlightWithDocument,
)
from app.services import documents as document_service
from app.services import highlights as service

router = APIRouter(tags=["highlights"])


@router.get("/documents/{document_id}/highlights")
def list_document_highlights(
    document_id: int, user: CurrentUser, db: DbSession
) -> list[HighlightOut]:
    document = document_service.get_document(db, user, document_id)
    return [service.to_out(h) for h in service.list_for_document(db, document)]


@router.post("/documents/{document_id}/highlights", status_code=status.HTTP_201_CREATED)
def create_highlight(
    document_id: int, data: HighlightCreate, user: CurrentUser, db: DbSession
) -> HighlightOut:
    document = document_service.get_document(db, user, document_id)
    return service.to_out(service.create_highlight(db, user, document, data))


@router.get("/highlights")
def list_highlights(
    user: CurrentUser,
    db: DbSession,
    q: str | None = None,
    tag: str | None = None,
    color: Color | None = None,
    document_id: int | None = None,
    collection_id: int | None = None,
    sort: Literal["newest", "oldest", "document"] = "newest",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[HighlightWithDocument]:
    query = service.filtered_query(
        user, q=q, tag=tag, color=color, document_id=document_id, collection_id=collection_id
    )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(query.order_by(*service.SORTS[sort]).limit(limit).offset(offset))
    return Page(items=[service.to_out_with_document(h) for h in rows], total=total)


@router.post("/highlights/bulk")
def bulk_update_highlights(
    data: HighlightBulkAction, user: CurrentUser, db: DbSession
) -> HighlightBulkResult:
    return service.bulk_update(db, user, data)


@router.patch("/highlights/{highlight_id}")
def update_highlight(
    highlight_id: int, data: HighlightUpdate, user: CurrentUser, db: DbSession
) -> HighlightOut:
    highlight = service.get_highlight(db, user, highlight_id)
    return service.to_out(service.update_highlight(db, user, highlight, data))


@router.delete("/highlights/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_highlight(highlight_id: int, user: CurrentUser, db: DbSession) -> Response:
    service.delete_highlight(db, service.get_highlight(db, user, highlight_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
