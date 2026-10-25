from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Comment, Highlight, User
from app.schemas.comments import CommentIn
from app.services.ownership import get_owned


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
    return get_owned(db, Comment, comment_id, user, "Comment")


def update_comment(db: Session, comment: Comment, data: CommentIn) -> Comment:
    comment.body = data.body
    db.commit()
    return comment


def delete_comment(db: Session, comment: Comment) -> None:
    db.delete(comment)
    db.commit()
