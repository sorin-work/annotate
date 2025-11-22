from fastapi import APIRouter, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.errors import ConflictError, UnauthorizedError
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id), user=UserOut.model_validate(user)
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession) -> TokenResponse:
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
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not verify_password(data.password, user.password_hash):
        raise UnauthorizedError("Incorrect email or password", code="invalid_credentials")
    return _token_response(user)


@router.get("/me")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
