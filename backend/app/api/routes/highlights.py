from fastapi import APIRouter, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.highlights import HighlightCreate, HighlightOut, HighlightUpdate
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
