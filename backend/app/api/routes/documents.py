from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.common import Page
from app.schemas.documents import DocumentCreate, DocumentDetail, DocumentSummary, DocumentUpdate
from app.services import documents as service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("")
def list_documents(
    user: CurrentUser,
    db: DbSession,
    q: str | None = None,
    sort: Literal["recent", "created", "title"] = "recent",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[DocumentSummary]:
    documents, total = service.list_documents(db, user, q=q, sort=sort, limit=limit, offset=offset)
    return Page(items=[service.to_summary(d) for d in documents], total=total)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_document(data: DocumentCreate, user: CurrentUser, db: DbSession) -> DocumentDetail:
    return service.to_detail(service.create_document(db, user, data))


@router.get("/{document_id}")
def get_document(document_id: int, user: CurrentUser, db: DbSession) -> DocumentDetail:
    document = service.get_document(db, user, document_id)
    return service.to_detail(document)


@router.patch("/{document_id}")
def update_document(
    document_id: int, data: DocumentUpdate, user: CurrentUser, db: DbSession
) -> DocumentDetail:
    document = service.get_document(db, user, document_id)
    return service.to_detail(service.update_document(db, document, data))


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, user: CurrentUser, db: DbSession) -> Response:
    service.delete_document(db, service.get_document(db, user, document_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
