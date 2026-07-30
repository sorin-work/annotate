import httpx

from app.config import get_settings
from app.deps import get_http_client
from tests.test_url_import import fake_dns, import_url, pages  # noqa: F401 - fixtures


def test_downloads_stop_at_the_upload_limit(client, auth, pages, monkeypatch):  # noqa: F811
    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    pages["https://example.com/huge.txt"] = httpx.Response(
        200, content=b"word " * 300_000, headers={"content-type": "text/plain"}
    )
    response = import_url(client, auth, "https://example.com/huge.txt")
    assert response.status_code == 413
    assert response.json()["error"]["message"] == "The page is too large (max 1 MB)"


def test_unreachable_sites_are_a_bad_gateway(client, auth, pages):  # noqa: F811
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    def override():
        with httpx.Client(transport=httpx.MockTransport(refuse)) as http:
            yield http

    client.app.dependency_overrides[get_http_client] = override
    response = import_url(client, auth, "https://example.com/down")
    assert response.status_code == 502
    assert response.json()["error"]["message"] == "Could not download the page"
