from pydantic import Field

from app.schemas.common import ApiModel


class TagOut(ApiModel):
    id: int
    name: str
    highlight_count: int = 0


class TagRename(ApiModel):
    name: str = Field(min_length=1, max_length=50)
