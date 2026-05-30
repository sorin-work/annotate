from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentUser, DbSession
from app.schemas.activity import ActivityPage
from app.services.activity import recent_activity

router = APIRouter(tags=["activity"])


@router.get("/activity")
def activity(
    user: CurrentUser,
    db: DbSession,
    before: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> ActivityPage:
    return recent_activity(db, user, before=before, limit=limit)
