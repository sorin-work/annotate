from tests.conftest import register


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
