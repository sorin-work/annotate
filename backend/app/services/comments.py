from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.models import Comment, Highlight, User
from app.schemas.comments import CommentIn


def list_comments(db: Session, highlight: Highlight) -> list[Comment]:
    return list(
        db.scalars(
            select(Comment)
            .where(Comment.highlight_id == highlight.id)
            .order_by(Comment.created_at, Comment.id)
        )
    )


def add_comment(db: Session, user: User, highlight: Highlight, data: CommentIn) -> Comment:
    comment = Comment(highlight_id=highlight.id, owner_id=user.id, body=data.body)
    db.add(comment)
    db.commit()
    return comment


def get_comment(db: Session, user: User, comment_id: int) -> Comment:
    comment = db.get(Comment, comment_id)
    if comment is None or comment.owner_id != user.id:
        raise NotFoundError("Comment not found")
    return comment


def update_comment(db: Session, comment: Comment, data: CommentIn) -> Comment:
    comment.body = data.body
    db.commit()
    return comment


def delete_comment(db: Session, comment: Comment) -> None:
    db.delete(comment)
    db.commit()
