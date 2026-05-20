from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.schemas.stats import Stats
from app.services.stats import get_stats

router = APIRouter(tags=["stats"])


@router.get("/stats")
def stats(user: CurrentUser, db: DbSession) -> Stats:
    return get_stats(db, user)
