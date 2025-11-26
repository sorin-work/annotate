from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import ApiModel

SourceType = Literal["text", "markdown", "pdf"]


class DocumentCreate(ApiModel):
    title: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1, max_length=2_000_000)
    source_type: Literal["text", "markdown"] = "text"
    author: str | None = Field(default=None, max_length=200)
    source_url: str | None = Field(default=None, max_length=2000)

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
    source_url: str | None = Field(default=None, max_length=2000)


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


class DocumentDetail(DocumentSummary):
    content: str
    original_filename: str | None
    source_url: str | None
