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
    created_at: datetime
    updated_at: datetime
