"""Every row a user can see carries an owner_id; this is the one place that checks it."""

from typing import Protocol

from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import User


class Owned(Protocol):
    owner_id: int


def get_owned[T: Owned](db: Session, model: type[T], object_id: int, user: User, name: str) -> T:
    """Load ``model`` by id, or 404 if it doesn't exist or belongs to someone else.

    Both cases look the same from outside, so ids of other users' data leak nothing.
    """
    obj = db.get(model, object_id)
    if obj is None or obj.owner_id != user.id:
        raise NotFoundError(f"{name} not found")
    return obj
