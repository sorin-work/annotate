from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ApiModel
from app.schemas.documents import DocumentSummary


def _strip_name(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        raise ValueError("must not be blank")
    return value


class CollectionCreate(ApiModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return _strip_name(value) or value


class CollectionUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        return _strip_name(value)


class CollectionOut(ApiModel):
    id: int
    name: str
    description: str | None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime


class CollectionDetail(CollectionOut):
    documents: list[DocumentSummary] = []


class CollectionDocumentAdd(ApiModel):
    document_id: int
