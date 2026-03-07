from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentUser, DbSession
from app.schemas.highlights import Color
from app.schemas.search import SearchResults
from app.services import collections as collection_service
from app.services.search import search as run_search

router = APIRouter(tags=["search"])


@router.get("/search")
def search(
    user: CurrentUser,
    db: DbSession,
    q: Annotated[str, Query(max_length=200)] = "",
    tag: str | None = None,
    color: Color | None = None,
    collection_id: int | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> SearchResults:
    if collection_id is not None:
        collection_service.get_collection(db, user, collection_id)
    return run_search(db, user, q, tag=tag, color=color, collection_id=collection_id, limit=limit)
