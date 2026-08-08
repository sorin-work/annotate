from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ApiModel


class CommentIn(ApiModel):
    body: str = Field(min_length=1, max_length=20_000)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class CommentOut(ApiModel):
    id: int
    highlight_id: int
    body: str
    created_at: datetime
    updated_at: datetime
