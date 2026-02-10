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
