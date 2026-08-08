from fastapi import APIRouter, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.comments import CommentIn, CommentOut
from app.services import comments as service
from app.services import highlights as highlight_service

router = APIRouter(tags=["comments"])


@router.get("/highlights/{highlight_id}/comments")
def list_comments(highlight_id: int, user: CurrentUser, db: DbSession) -> list[CommentOut]:
    highlight = highlight_service.get_highlight(db, user, highlight_id)
    return [CommentOut.model_validate(c) for c in service.list_comments(db, highlight)]


@router.post("/highlights/{highlight_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(highlight_id: int, data: CommentIn, user: CurrentUser, db: DbSession) -> CommentOut:
    highlight = highlight_service.get_highlight(db, user, highlight_id)
    return CommentOut.model_validate(service.add_comment(db, user, highlight, data))


@router.patch("/comments/{comment_id}")
def update_comment(
    comment_id: int, data: CommentIn, user: CurrentUser, db: DbSession
) -> CommentOut:
    comment = service.get_comment(db, user, comment_id)
    return CommentOut.model_validate(service.update_comment(db, comment, data))


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, user: CurrentUser, db: DbSession) -> Response:
    service.delete_comment(db, service.get_comment(db, user, comment_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
