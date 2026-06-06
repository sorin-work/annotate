from app.config import get_settings
from tests.conftest import register


def login(client, email="reader@example.com", password="wrong-password"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_failed_logins_are_limited(client, auth):
    attempts = get_settings().login_attempts
    for _ in range(attempts):
        assert login(client).status_code == 401

    response = login(client, password="correct-horse-battery")
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
    assert response.json()["error"]["message"] == "Too many attempts. Try again in 15 minutes."
    assert int(response.headers["retry-after"]) > 0

    # Other accounts are not affected.
    register(client, "second@example.com")
    assert login(client, "second@example.com", "correct-horse-battery").status_code == 200


def test_successful_login_resets_the_count(client, auth):
    for _ in range(get_settings().login_attempts - 1):
        login(client)
    assert login(client, password="correct-horse-battery").status_code == 200
    assert login(client).status_code == 401


def test_registrations_are_limited_per_address(client):
    for n in range(get_settings().registrations_per_hour):
        register(client, f"reader{n}@example.com")
    response = client.post(
        "/api/auth/register",
        json={"email": "one-more@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 429
