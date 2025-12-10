from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import AppError, NotFoundError
from app.models import Tag, User, highlight_tags
from app.schemas.tags import TagOut


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


def list_tags(db: Session, user: User) -> list[TagOut]:
    rows = db.execute(
        select(Tag, func.count(highlight_tags.c.highlight_id))
        .outerjoin(highlight_tags, highlight_tags.c.tag_id == Tag.id)
        .where(Tag.owner_id == user.id)
        .group_by(Tag.id)
        .order_by(Tag.name)
    )
    return [TagOut(id=tag.id, name=tag.name, highlight_count=count) for tag, count in rows]


def get_tag(db: Session, user: User, tag_id: int) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None or tag.owner_id != user.id:
        raise NotFoundError("Tag not found")
    return tag


def rename_tag(db: Session, user: User, tag: Tag, new_name: str) -> Tag:
    """Rename a tag. Renaming onto an existing tag merges the two."""
    name = normalise_tag(new_name)
    if not name:
        raise AppError("name: must not be blank", code="validation_error", status_code=422)
    if name == tag.name:
        return tag

    target = db.scalar(select(Tag).where(Tag.owner_id == user.id, Tag.name == name))
    if target is None:
        tag.name = name
        db.commit()
        return tag

    for highlight in list(tag.highlights):
        if target not in highlight.tags:
            highlight.tags.append(target)
    db.delete(tag)
    db.commit()
    db.refresh(target)
    return target


def delete_tag(db: Session, tag: Tag) -> None:
    db.delete(tag)
    db.commit()
