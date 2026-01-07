from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.errors import AppError
from app.schemas.common import Page
from app.schemas.documents import DocumentCreate, DocumentDetail, DocumentSummary, DocumentUpdate
from app.services import documents as service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("")
def list_documents(
    user: CurrentUser,
    db: DbSession,
    q: str | None = None,
    collection_id: int | None = None,
    sort: Literal["recent", "created", "title"] = "recent",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[DocumentSummary]:
    documents, total = service.list_documents(
        db, user, q=q, collection_id=collection_id, sort=sort, limit=limit, offset=offset
    )
    counts = service.highlight_counts(db, [d.id for d in documents])
    return Page(items=[service.to_summary(d, counts.get(d.id, 0)) for d in documents], total=total)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_document(data: DocumentCreate, user: CurrentUser, db: DbSession) -> DocumentDetail:
    return service.to_detail(service.create_document(db, user, data))


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form(max_length=300)] = None,
) -> DocumentDetail:
    limit = get_settings().max_upload_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise AppError(
            f"File is too large (max {get_settings().max_upload_mb} MB)",
            code="payload_too_large",
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        )
    document = service.create_from_upload(db, user, file.filename or "", data, title)
    return service.to_detail(document)


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
