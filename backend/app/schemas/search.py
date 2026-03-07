from app.schemas.common import ApiModel
from app.schemas.highlights import HighlightWithDocument


class DocumentHit(ApiModel):
    id: int
    title: str
    author: str | None
    snippet: str


class SearchResults(ApiModel):
    query: str
    documents: list[DocumentHit]
    highlights: list[HighlightWithDocument]
