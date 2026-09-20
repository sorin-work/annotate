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
from app.security import read_access_token

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise UnauthorizedError("Authentication required")
    claims = read_access_token(credentials.credentials)
    user = db.get(User, claims.user_id) if claims is not None else None
    if user is None or claims is None:
        raise UnauthorizedError("Invalid or expired token")
    changed = user.password_changed_at
    # iat has whole seconds, so compare against the second the change happened in.
    if changed is not None and claims.issued_at < int(changed.timestamp()):
        raise UnauthorizedError("Your password was changed; please sign in again")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_http_client() -> Iterator[httpx.Client]:
    """Outgoing HTTP for document imports; tests swap in a mock transport."""
    settings = get_settings()
    with httpx.Client(timeout=settings.import_timeout_seconds, follow_redirects=True) as client:
        yield client


HttpClient = Annotated[httpx.Client, Depends(get_http_client)]
