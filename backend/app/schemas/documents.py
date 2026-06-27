from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import AfterValidator, Field, field_validator

from app.schemas.common import ApiModel

SourceType = Literal["text", "markdown", "pdf"]


def _check_source_url(value: str | None) -> str | None:
    # The url is shown as a link, so anything but http(s) (javascript:, data:)
    # would be a way to run code in the reader's browser.
    value = (value or "").strip() or None
    if value is not None and (
        urlsplit(value).scheme.lower() not in ("http", "https") or not urlsplit(value).netloc
    ):
        raise ValueError("must be an http:// or https:// address")
    return value


SourceUrl = Annotated[str | None, Field(max_length=2000), AfterValidator(_check_source_url)]


class DocumentCreate(ApiModel):
    title: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1, max_length=2_000_000)
    source_type: Literal["text", "markdown"] = "text"
    author: str | None = Field(default=None, max_length=200)
    source_url: SourceUrl = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class DocumentUpdate(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    author: str | None = Field(default=None, max_length=200)
    source_url: SourceUrl = None


class ReadingProgress(ApiModel):
    progress: float = Field(ge=0, le=1)
    position: int | None = Field(default=None, ge=0)


class CollectionRef(ApiModel):
    id: int
    name: str


class DocumentSummary(ApiModel):
    id: int
    title: str
    source_type: SourceType
    author: str | None
    word_count: int
    highlight_count: int = 0
    excerpt: str = ""
    created_at: datetime
    updated_at: datetime
    last_opened_at: datetime | None
    reading_progress: float = 0.0


class DocumentDetail(DocumentSummary):
    content: str
    original_filename: str | None
    source_url: str | None
    last_position: int | None = None
    collections: list[CollectionRef] = []
