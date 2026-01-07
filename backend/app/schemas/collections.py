from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ApiModel
from app.schemas.documents import DocumentSummary


class CollectionCreate(ApiModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class CollectionUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)


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
