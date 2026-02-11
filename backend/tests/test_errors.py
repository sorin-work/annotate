from fastapi.testclient import TestClient

from app.main import create_app


def test_unexpected_errors_return_json():
    app = create_app()

    @app.get("/api/boom")
    def boom() -> None:
        raise RuntimeError("database exploded")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/boom")

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Something went wrong on our side"}
    }
    assert "exploded" not in response.text


def test_validation_errors_name_the_field(client):
    response = client.post("/api/auth/login", json={"email": "nope", "password": "x"})
    assert response.status_code == 422
    assert response.json()["error"]["message"].startswith("email:")


def test_wrong_method_uses_error_format(client):
    response = client.put("/api/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_missing_token_is_a_json_401(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {
        "error": {"code": "unauthorized", "message": "Authentication required"}
    }
