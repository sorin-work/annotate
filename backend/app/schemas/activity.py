from datetime import datetime
from typing import Literal

from app.schemas.common import ApiModel
from app.schemas.highlights import Color

ActivityType = Literal["document_added", "highlight_added", "comment_added"]


class ActivityDocument(ApiModel):
    id: int
    title: str


class ActivityHighlight(ApiModel):
    id: int
    quote: str
    color: Color
    note: str | None


class ActivityComment(ApiModel):
    id: int
    body: str


class ActivityItem(ApiModel):
    type: ActivityType
    at: datetime
    document: ActivityDocument
    highlight: ActivityHighlight | None = None
    comment: ActivityComment | None = None


class ActivityPage(ApiModel):
    items: list[ActivityItem]
    # Pass as ``before`` to get the next, older page; null when there is none.
    next_before: datetime | None
