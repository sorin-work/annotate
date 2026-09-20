from datetime import UTC, datetime, timedelta

import jwt

from app.config import get_settings
from app.models import Document, Highlight, Tag
from tests.conftest import highlight, register


def test_register_returns_token_and_user(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "New@Example.com", "password": "long-enough", "display_name": " Ana "},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "new@example.com"
    assert body["user"]["display_name"] == "Ana"


def test_register_rejects_duplicate_email(client):
    register(client, "dup@example.com")
    response = client.post(
        "/api/auth/register", json={"email": "DUP@example.com", "password": "long-enough"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"


def test_register_validates_input(client):
    response = client.post("/api/auth/register", json={"email": "nope", "password": "short"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert {tuple(d["loc"]) for d in error["details"]} == {("body", "email"), ("body", "password")}


def test_login_and_me(client):
    register(client, "me@example.com")
    response = client.post(
        "/api/auth/login", json={"email": "me@example.com", "password": "correct-horse-battery"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "me@example.com"


def test_login_with_wrong_password(client):
    register(client, "me@example.com")
    response = client.post(
        "/api/auth/login", json={"email": "me@example.com", "password": "not-the-password"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_with_unknown_email(client):
    response = client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": "whatever"}
    )
    assert response.status_code == 401


def test_me_requires_a_valid_token(client):
    assert client.get("/api/auth/me").status_code == 401
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_update_display_name(client, auth):
    response = client.patch("/api/auth/me", json={"display_name": "Reader"}, headers=auth)
    assert response.status_code == 200
    assert response.json()["display_name"] == "Reader"

    response = client.patch("/api/auth/me", json={"display_name": ""}, headers=auth)
    assert response.json()["display_name"] is None


def test_change_password(client, auth):
    wrong = client.post(
        "/api/auth/change-password",
        json={"current_password": "nope", "new_password": "brand-new-password"},
        headers=auth,
    )
    assert wrong.status_code == 400
    assert wrong.json()["error"]["code"] == "invalid_password"

    ok = client.post(
        "/api/auth/change-password",
        json={"current_password": "correct-horse-battery", "new_password": "brand-new-password"},
        headers=auth,
    )
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    login = client.post(
        "/api/auth/login",
        json={"email": "reader@example.com", "password": "brand-new-password"},
    )
    assert login.status_code == 200


def test_delete_account_removes_everything(client, auth, other_auth, document, db):

    highlight(client, auth, document, "lazy dog", tags=["animals"])
    client.post("/api/documents", json={"title": "Keep", "content": "x"}, headers=other_auth)

    wrong = client.post("/api/auth/delete-account", json={"password": "nope"}, headers=auth)
    assert wrong.status_code == 400
    assert wrong.json()["error"]["code"] == "invalid_password"

    response = client.post(
        "/api/auth/delete-account", json={"password": "correct-horse-battery"}, headers=auth
    )
    assert response.status_code == 204
    assert client.get("/api/auth/me", headers=auth).status_code == 401
    assert [d.title for d in db.query(Document)] == ["Keep"]
    assert db.query(Highlight).count() == 0
    assert db.query(Tag).count() == 0


def test_changing_the_password_signs_out_other_sessions(client, auth):
    user_id = client.get("/api/auth/me", headers=auth).json()["id"]
    settings = get_settings()
    issued = datetime.now(UTC) - timedelta(minutes=1)
    old_token = jwt.encode(
        {"sub": str(user_id), "iat": issued, "exp": issued + timedelta(days=1)},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    old_session = {"Authorization": f"Bearer {old_token}"}
    assert client.get("/api/auth/me", headers=old_session).status_code == 200

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "correct-horse-battery", "new_password": "brand-new-password"},
        headers=auth,
    )
    fresh = {"Authorization": f"Bearer {response.json()['access_token']}"}

    rejected = client.get("/api/auth/me", headers=old_session)
    assert rejected.status_code == 401
    assert "password was changed" in rejected.json()["error"]["message"]
    assert client.get("/api/auth/me", headers=fresh).status_code == 200
