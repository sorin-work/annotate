from datetime import date

from app.schemas.common import ApiModel


class TagCount(ApiModel):
    name: str
    count: int


class WeekCount(ApiModel):
    week_start: date
    highlights: int


class DocumentCount(ApiModel):
    id: int
    title: str
    highlight_count: int


class Stats(ApiModel):
    documents: int
    highlights: int
    notes: int
    tags: int
    collections: int
    words: int
    colors: dict[str, int]
    top_tags: list[TagCount]
    weekly: list[WeekCount]
    most_highlighted: list[DocumentCount]
