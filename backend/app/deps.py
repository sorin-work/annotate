from collections.abc import Iterator
from typing import Annotated

import httpx
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.errors import UnauthorizedError
from app.models import User
from app.security import decode_access_token

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise UnauthorizedError("Authentication required")
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise UnauthorizedError("Invalid or expired token")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_http_client() -> Iterator[httpx.Client]:
    """Outgoing HTTP for document imports; tests swap in a mock transport."""
    settings = get_settings()
    with httpx.Client(timeout=settings.import_timeout_seconds, follow_redirects=True) as client:
        yield client


HttpClient = Annotated[httpx.Client, Depends(get_http_client)]
