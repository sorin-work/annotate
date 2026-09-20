from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import get_settings

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@dataclass(frozen=True)
class TokenClaims:
    user_id: int
    issued_at: int  # seconds since the epoch


def read_access_token(token: str) -> TokenClaims | None:
    """The claims of a valid, unexpired token, or None."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return TokenClaims(user_id=int(payload["sub"]), issued_at=int(payload.get("iat", 0)))
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        return None


def decode_access_token(token: str) -> int | None:
    """Return the user id for a valid token, or None."""
    claims = read_access_token(token)
    return claims.user_id if claims else None
