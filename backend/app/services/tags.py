from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tag, User


def normalise_tag(name: str) -> str:
    return " ".join(name.strip().lower().lstrip("#").split())


def get_or_create_tags(db: Session, user: User, names: list[str]) -> list[Tag]:
    names = [n for n in dict.fromkeys(normalise_tag(name) for name in names) if n]
    if not names:
        return []
    existing = {
        tag.name: tag
        for tag in db.scalars(select(Tag).where(Tag.owner_id == user.id, Tag.name.in_(names)))
    }
    tags = []
    for name in names:
        tag = existing.get(name)
        if tag is None:
            tag = Tag(owner_id=user.id, name=name)
            db.add(tag)
        tags.append(tag)
    return tags
