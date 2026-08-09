from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.common import ApiModel

Color = Literal["yellow", "green", "blue", "pink", "purple"]


def _clean_tags(tags: list[str] | None) -> list[str] | None:
    if tags is None:
        return None
    seen: dict[str, str] = {}
    for raw in tags:
        name = " ".join(raw.strip().lower().lstrip("#").split())
        if not name:
            continue
        if len(name) > 50:
            raise ValueError("tags must be at most 50 characters")
        seen.setdefault(name, name)
    return list(seen)


class HighlightCreate(ApiModel):
    start_offset: int = Field(ge=0)
    end_offset: int = Field(gt=0)
    color: Color = "yellow"
    note: str | None = Field(default=None, max_length=20_000)
    tags: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def check_range(self) -> "HighlightCreate":
        if self.end_offset <= self.start_offset:
            raise ValueError("end_offset must be greater than start_offset")
        return self

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, value: list[str]) -> list[str]:
        return _clean_tags(value) or []


class HighlightUpdate(ApiModel):
    color: Color | None = None
    note: str | None = Field(default=None, max_length=20_000)
    tags: list[str] | None = Field(default=None, max_length=20)

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, value: list[str] | None) -> list[str] | None:
        return _clean_tags(value)


class HighlightOut(ApiModel):
    id: int
    document_id: int
    start_offset: int
    end_offset: int
    quote: str
    color: Color
    note: str | None
    tags: list[str]
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime


class HighlightWithDocument(HighlightOut):
    document_title: str


class HighlightBulkAction(ApiModel):
    """The same change applied to many highlights at once."""

    ids: list[int] = Field(min_length=1, max_length=500)
    delete: bool = False
    color: Color | None = None
    add_tags: list[str] = Field(default_factory=list, max_length=20)
    remove_tags: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("add_tags", "remove_tags")
    @classmethod
    def clean_tags(cls, value: list[str]) -> list[str]:
        return _clean_tags(value) or []

    @model_validator(mode="after")
    def check_action(self) -> "HighlightBulkAction":
        changes = self.color is not None or self.add_tags or self.remove_tags
        if self.delete and changes:
            raise ValueError("delete cannot be combined with other changes")
        if not self.delete and not changes:
            raise ValueError("nothing to do: set delete, color, add_tags or remove_tags")
        return self


class HighlightBulkResult(ApiModel):
    updated: int = 0
    deleted: int = 0
