import jwt

from app.config import get_settings
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_round_trip():
    hashed = hash_password("s3cret-password")
    assert hashed.startswith("$argon2")
    assert verify_password("s3cret-password", hashed)
    assert not verify_password("wrong-password", hashed)


def test_verify_password_rejects_garbage_hash():
    assert not verify_password("anything", "not-a-hash")


def test_access_token_round_trip():
    token = create_access_token(42)
    assert decode_access_token(token) == 42


def test_tampered_and_foreign_tokens_are_rejected():
    token = create_access_token(42)
    assert decode_access_token(token[:-2] + "xx") is None
    foreign = jwt.encode({"sub": "42"}, "another-secret-that-is-long-enough", algorithm="HS256")
    assert decode_access_token(foreign) is None


def test_expired_token_is_rejected():
    settings = get_settings()
    expired = jwt.encode(
        {"sub": "1", "exp": 1_000_000_000}, settings.jwt_secret, algorithm=settings.jwt_algorithm
    )
    assert decode_access_token(expired) is None
