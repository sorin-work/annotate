from fastapi import APIRouter, Response, status

from app.deps import CurrentUser, DbSession
from app.schemas.tags import TagOut, TagRename
from app.services import tags as service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
def list_tags(user: CurrentUser, db: DbSession) -> list[TagOut]:
    return service.list_tags(db, user)


@router.patch("/{tag_id}")
def rename_tag(tag_id: int, data: TagRename, user: CurrentUser, db: DbSession) -> TagOut:
    tag = service.rename_tag(db, user, service.get_tag(db, user, tag_id), data.name)
    return TagOut(id=tag.id, name=tag.name, highlight_count=len(tag.highlights))


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, user: CurrentUser, db: DbSession) -> Response:
    service.delete_tag(db, service.get_tag(db, user, tag_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
