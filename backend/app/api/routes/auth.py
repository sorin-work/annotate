from fastapi import APIRouter, Request, status
from sqlalchemy import select

from app.db import utcnow
from app.deps import CurrentUser, DbSession
from app.errors import AppError, ConflictError, RateLimitedError, UnauthorizedError
from app.models import User
from app.ratelimit import SlidingWindowLimiter
from app.schemas.auth import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserOut,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id), user=UserOut.model_validate(user)
    )


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _check_limit(limiter: SlidingWindowLimiter, key: str) -> None:
    if limiter.max_hits <= 0:
        return
    retry_after = limiter.retry_after(key)
    if retry_after is not None:
        raise RateLimitedError(retry_after)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, request: Request, db: DbSession) -> TokenResponse:
    limiter: SlidingWindowLimiter = request.app.state.register_limiter
    key = _client_ip(request)
    _check_limit(limiter, key)
    limiter.hit(key)
    if db.scalar(select(User.id).where(User.email == data.email)) is not None:
        raise ConflictError("An account with this email already exists", code="email_taken")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=(data.display_name or "").strip() or None,
    )
    db.add(user)
    db.commit()
    return _token_response(user)


@router.post("/login")
def login(data: LoginRequest, request: Request, db: DbSession) -> TokenResponse:
    # Only failed attempts count, per email and address, so a typo is harmless
    # but guessing passwords is slow.
    limiter: SlidingWindowLimiter = request.app.state.login_limiter
    key = f"{_client_ip(request)}:{data.email}"
    _check_limit(limiter, key)
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not verify_password(data.password, user.password_hash):
        limiter.hit(key)
        raise UnauthorizedError("Incorrect email or password", code="invalid_credentials")
    limiter.reset(key)
    return _token_response(user)


@router.get("/me")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me")
def update_me(data: UpdateProfileRequest, user: CurrentUser, db: DbSession) -> UserOut:
    if "display_name" in data.model_fields_set:
        user.display_name = (data.display_name or "").strip() or None
    db.commit()
    return UserOut.model_validate(user)


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, user: CurrentUser, db: DbSession) -> TokenResponse:
    """Change the password and sign out every other session.

    The response carries a fresh token for the session that made the change.
    """
    if not verify_password(data.current_password, user.password_hash):
        raise AppError("Current password is incorrect", code="invalid_password")
    user.password_hash = hash_password(data.new_password)
    user.password_changed_at = utcnow().replace(microsecond=0)
    db.commit()
    return _token_response(user)


@router.post("/delete-account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: DeleteAccountRequest, user: CurrentUser, db: DbSession) -> None:
    """Delete the account and, through the foreign keys, everything in it."""
    if not verify_password(data.password, user.password_hash):
        raise AppError("Password is incorrect", code="invalid_password")
    db.delete(user)
    db.commit()
