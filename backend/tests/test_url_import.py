import ipaddress

import httpx
import pytest

from app.deps import get_http_client
from app.services import url_import
from tests.pdf_fixture import make_pdf

ARTICLE = (
    "<html><head><title>On Notes</title><meta name='author' content='Ada'></head>"
    "<body><nav>Menu</nav><article><h1>On Notes</h1><p>Write them by hand.</p></article>"
    "</body></html>"
)


HOSTS = {"example.com": ["93.184.215.14"], "internal.test": ["10.0.0.5", "93.184.215.14"]}


@pytest.fixture(autouse=True)
def fake_dns(monkeypatch):
    def resolve(host: str) -> list[str]:
        try:
            return [str(ipaddress.ip_address(host.strip("[]")))]
        except ValueError:
            return HOSTS.get(host, [])

    monkeypatch.setattr(url_import, "resolve_host", resolve)


@pytest.fixture
def pages(client):
    """Serve fake pages: maps url -> httpx.Response (or a callable)."""
    routes: dict[str, httpx.Response] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        response = routes.get(str(request.url))
        return response if response is not None else httpx.Response(404)

    def override():
        with httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True) as c:
            yield c

    client.app.dependency_overrides[get_http_client] = override
    return routes


def import_url(client, auth, url, **extra):
    return client.post("/api/documents/import", json={"url": url, **extra}, headers=auth)


def test_import_an_article(client, auth, pages):
    pages["https://example.com/notes"] = httpx.Response(
        200, text=ARTICLE, headers={"content-type": "text/html; charset=utf-8"}
    )
    response = import_url(client, auth, "https://example.com/notes")
    assert response.status_code == 201, response.text
    doc = response.json()
    assert doc["title"] == "On Notes"
    assert doc["author"] == "Ada"
    assert doc["source_type"] == "markdown"
    assert doc["source_url"] == "https://example.com/notes"
    assert doc["content"] == "# On Notes\n\nWrite them by hand."


def test_import_falls_back_to_the_site_name_for_the_author(client, auth, pages):
    pages["https://example.com/post"] = httpx.Response(
        200,
        text="<title>A Post | Field Notes</title>"
        "<meta property='og:site_name' content='Field Notes'>"
        "<article><p>Words.</p></article>",
        headers={"content-type": "text/html"},
    )
    doc = import_url(client, auth, "https://example.com/post").json()
    assert (doc["title"], doc["author"]) == ("A Post", "Field Notes")


def test_import_uses_the_charset_the_page_declares(client, auth, pages):
    html = "<meta charset='windows-1252'><article><p>Café, naïve – déjà vu</p></article>"
    pages["https://example.com/old"] = httpx.Response(
        200, content=html.encode("cp1252"), headers={"content-type": "text/html"}
    )
    pages["https://example.com/header"] = httpx.Response(
        200,
        content="<p>Žluťoučký kůň</p>".encode("iso-8859-2"),
        headers={"content-type": "text/html; charset=iso-8859-2"},
    )
    assert import_url(client, auth, "https://example.com/old").json()["content"] == (
        "Café, naïve – déjà vu"
    )
    assert import_url(client, auth, "https://example.com/header").json()["content"] == (
        "Žluťoučký kůň"
    )


def test_import_plain_text_markdown_and_pdf(client, auth, pages):
    pages["https://example.com/a.txt"] = httpx.Response(
        200, text="Line one\r\nLine two", headers={"content-type": "text/plain"}
    )
    pages["https://example.com/b.md"] = httpx.Response(
        200, text="# Title\n\nBody", headers={"content-type": "text/plain"}
    )
    pages["https://example.com/c"] = httpx.Response(
        200,
        content=make_pdf(["Hello from a PDF"], title="Paper"),
        headers={"content-type": "application/pdf"},
    )

    text = import_url(client, auth, "https://example.com/a.txt", title="Custom").json()
    assert (text["title"], text["source_type"], text["content"]) == (
        "Custom",
        "text",
        "Line one\nLine two",
    )
    # Raw Markdown is usually served as text/plain; the extension gives it away.
    markdown = import_url(client, auth, "https://example.com/b.md").json()
    assert (markdown["title"], markdown["source_type"]) == ("Title", "markdown")
    pdf = import_url(client, auth, "https://example.com/c").json()
    assert (pdf["title"], pdf["source_type"]) == ("Paper", "pdf")


def test_import_errors(client, auth, pages):
    pages["https://example.com/image"] = httpx.Response(
        200, content=b"\x89PNG", headers={"content-type": "image/png"}
    )
    pages["https://example.com/empty"] = httpx.Response(
        200,
        text="<html><body><script>x()</script></body></html>",
        headers={"content-type": "text/html"},
    )

    assert import_url(client, auth, "ftp://example.com/x").json()["error"]["code"] == "invalid_url"
    assert import_url(client, auth, "not a url").status_code == 400
    missing = import_url(client, auth, "https://example.com/missing")
    assert missing.status_code == 502
    assert missing.json()["error"]["message"] == "The page answered with HTTP 404"
    assert import_url(client, auth, "https://example.com/image").status_code == 415
    assert import_url(client, auth, "https://example.com/empty").json()["error"]["code"] == (
        "empty_page"
    )


def test_import_follows_redirects_to_public_pages_only(client, auth, pages):
    pages["https://example.com/old"] = httpx.Response(301, headers={"location": "/new"})
    pages["https://example.com/new"] = httpx.Response(
        200, text="Moved here.", headers={"content-type": "text/plain"}
    )
    pages["https://example.com/sneaky"] = httpx.Response(
        302, headers={"location": "http://169.254.169.254/latest/meta-data/"}
    )
    pages["https://example.com/loop"] = httpx.Response(302, headers={"location": "/loop"})

    moved = import_url(client, auth, "https://example.com/old").json()
    assert (moved["content"], moved["source_url"]) == ("Moved here.", "https://example.com/new")
    sneaky = import_url(client, auth, "https://example.com/sneaky")
    assert sneaky.json()["error"]["code"] == "blocked_url"
    loop = import_url(client, auth, "https://example.com/loop")
    assert loop.json()["error"]["message"] == "The page redirects too many times"


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1:8000/api/health",
        "http://localhost/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "http://internal.test/",
        "http://db:5432/",
    ],
)
def test_import_refuses_private_addresses(client, auth, pages, url):
    response = import_url(client, auth, url)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "blocked_url"
