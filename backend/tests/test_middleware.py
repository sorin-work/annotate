import logging


def test_responses_carry_a_request_id(client):
    first = client.get("/api/health").headers["x-request-id"]
    second = client.get("/api/health").headers["x-request-id"]
    assert len(first) == 16
    assert first != second


def test_keeps_a_sane_request_id_from_the_proxy(client):
    response = client.get("/api/health", headers={"X-Request-ID": "abc-123"})
    assert response.headers["x-request-id"] == "abc-123"

    response = client.get("/api/health", headers={"X-Request-ID": "no spaces <allowed>"})
    assert response.headers["x-request-id"] != "no spaces <allowed>"


def test_logs_one_line_per_request(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.requests"):
        client.get("/api/nope", headers={"X-Request-ID": "req-1"})
    lines = [r.getMessage() for r in caplog.records if r.name == "app.requests"]
    assert len(lines) == 1
    assert lines[0].startswith("GET /api/nope 404 ")
    assert lines[0].endswith("id=req-1")


def test_error_responses_carry_the_request_id_too(client):
    response = client.get("/api/documents", headers={"X-Request-ID": "trace-me"})
    assert response.status_code == 401
    assert response.headers["x-request-id"] == "trace-me"
