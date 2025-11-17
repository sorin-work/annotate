from sqlalchemy.exc import OperationalError

from app.db import get_db


def test_health_reports_database_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_unknown_route_uses_error_format(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_health_reports_an_unreachable_database(client):
    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    client.app.dependency_overrides[get_db] = lambda: BrokenSession()
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}
