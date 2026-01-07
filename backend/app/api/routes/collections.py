from fastapi import APIRouter, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.collections import (
    CollectionCreate,
    CollectionDetail,
    CollectionDocumentAdd,
    CollectionOut,
    CollectionUpdate,
)
from app.services import collections as service
from app.services import documents as document_service

router = APIRouter(prefix="/collections", tags=["collections"])


def _detail(db: DbSession, collection) -> CollectionDetail:
    counts = document_service.highlight_counts(db, [d.id for d in collection.documents])
    return CollectionDetail(
        **service.to_out(collection).model_dump(),
        documents=[
            document_service.to_summary(d, counts.get(d.id, 0)) for d in collection.documents
        ],
    )


@router.get("")
def list_collections(user: CurrentUser, db: DbSession) -> list[CollectionOut]:
    return service.list_collections(db, user)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_collection(data: CollectionCreate, user: CurrentUser, db: DbSession) -> CollectionOut:
    return service.to_out(service.create_collection(db, user, data), 0)


@router.get("/{collection_id}")
def get_collection(collection_id: int, user: CurrentUser, db: DbSession) -> CollectionDetail:
    return _detail(db, service.get_collection(db, user, collection_id))


@router.patch("/{collection_id}")
def update_collection(
    collection_id: int, data: CollectionUpdate, user: CurrentUser, db: DbSession
) -> CollectionOut:
    collection = service.get_collection(db, user, collection_id)
    return service.to_out(service.update_collection(db, user, collection, data))


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: int, user: CurrentUser, db: DbSession) -> Response:
    service.delete_collection(db, service.get_collection(db, user, collection_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{collection_id}/documents", status_code=status.HTTP_201_CREATED)
def add_document(
    collection_id: int, data: CollectionDocumentAdd, user: CurrentUser, db: DbSession
) -> CollectionOut:
    collection = service.get_collection(db, user, collection_id)
    document = document_service.get_document(db, user, data.document_id)
    service.add_document(db, collection, document)
    return service.to_out(collection)


@router.delete("/{collection_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document(
    collection_id: int, document_id: int, user: CurrentUser, db: DbSession
) -> Response:
    collection = service.get_collection(db, user, collection_id)
    document = document_service.get_document(db, user, document_id)
    service.remove_document(db, collection, document)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
