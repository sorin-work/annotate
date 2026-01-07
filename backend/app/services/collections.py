from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import Collection, Document, User, collection_documents
from app.schemas.collections import CollectionCreate, CollectionOut, CollectionUpdate


def _name_taken(db: Session, user: User, name: str, exclude_id: int | None = None) -> bool:
    query = select(Collection.id).where(
        Collection.owner_id == user.id, func.lower(Collection.name) == name.lower()
    )
    if exclude_id is not None:
        query = query.where(Collection.id != exclude_id)
    return db.scalar(query) is not None


def list_collections(db: Session, user: User) -> list[CollectionOut]:
    rows = db.execute(
        select(Collection, func.count(collection_documents.c.document_id))
        .outerjoin(collection_documents, collection_documents.c.collection_id == Collection.id)
        .where(Collection.owner_id == user.id)
        .group_by(Collection.id)
        .order_by(func.lower(Collection.name))
    )
    return [to_out(collection, count) for collection, count in rows]


def create_collection(db: Session, user: User, data: CollectionCreate) -> Collection:
    if _name_taken(db, user, data.name):
        raise ConflictError("You already have a collection with this name")
    collection = Collection(owner_id=user.id, name=data.name, description=data.description)
    db.add(collection)
    db.commit()
    return collection


def get_collection(db: Session, user: User, collection_id: int) -> Collection:
    collection = db.get(Collection, collection_id)
    if collection is None or collection.owner_id != user.id:
        raise NotFoundError("Collection not found")
    return collection


def update_collection(
    db: Session, user: User, collection: Collection, data: CollectionUpdate
) -> Collection:
    changes = data.model_dump(exclude_unset=True)
    if changes.get("name"):
        name = changes["name"].strip()
        if _name_taken(db, user, name, exclude_id=collection.id):
            raise ConflictError("You already have a collection with this name")
        collection.name = name
    if "description" in changes:
        collection.description = changes["description"] or None
    db.commit()
    return collection


def delete_collection(db: Session, collection: Collection) -> None:
    db.delete(collection)
    db.commit()


def add_document(db: Session, collection: Collection, document: Document) -> None:
    if document not in collection.documents:
        collection.documents.append(document)
        db.commit()


def remove_document(db: Session, collection: Collection, document: Document) -> None:
    if document in collection.documents:
        collection.documents.remove(document)
        db.commit()


def to_out(collection: Collection, document_count: int | None = None) -> CollectionOut:
    return CollectionOut(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        document_count=len(collection.documents) if document_count is None else document_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )
