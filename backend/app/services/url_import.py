"""Create documents from web pages, plain text, Markdown and PDFs on the web."""

import codecs
import ipaddress
import re
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import httpx

from app.config import get_settings
from app.errors import AppError
from app.services import text as textutil
from app.services.html_extract import extract
from app.services.pdf import extract_pdf

USER_AGENT = "annotate/0.1 (document import)"
_META_CHARSET = re.compile(rb"""<meta[^>]+charset\s*=\s*["']?\s*([a-zA-Z0-9_.:-]+)""", re.I)


@dataclass
class FetchedDocument:
    title: str | None
    author: str | None
    source_type: str
    content: str
    url: str


def resolve_host(host: str) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError) as exc:
        raise AppError("Could not find that website", code="fetch_failed", status_code=502) from exc
    return [str(info[4][0]) for info in infos]


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%")[0])
    return ip.is_global and not ip.is_multicast


def check_url(url: str) -> str:
    """Reject anything but public http(s) urls.

    The api must not become a way to reach the machines around it (the
    database, cloud metadata endpoints, a home router), so the host has to
    resolve to public addresses only, unless IMPORT_ALLOW_PRIVATE is set.
    """
    url = url.strip()
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise AppError("Enter a full http:// or https:// address", code="invalid_url")
    if not get_settings().import_allow_private:
        addresses = resolve_host(parts.hostname)
        if not addresses or not all(_is_public(a) for a in addresses):
            raise AppError(
                "Importing from private network addresses is not allowed", code="blocked_url"
            )
    return url


MAX_REDIRECTS = 5


def _download(client: httpx.Client, url: str) -> tuple[httpx.Response, bytes]:
    limit = get_settings().max_upload_bytes
    try:
        # Follow redirects by hand so every hop goes through check_url: a public
        # page must not be able to bounce us to a private address.
        for _ in range(MAX_REDIRECTS + 1):
            with client.stream(
                "GET", url, headers={"User-Agent": USER_AGENT}, follow_redirects=False
            ) as response:
                if response.is_redirect:
                    url = check_url(urljoin(url, response.headers["location"]))
                    continue
                if response.status_code >= 400:
                    raise AppError(
                        f"The page answered with HTTP {response.status_code}",
                        code="fetch_failed",
                        status_code=502,
                    )
                chunks: list[bytes] = []
                size = 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > limit:
                        raise AppError(
                            f"The page is too large (max {get_settings().max_upload_mb} MB)",
                            code="payload_too_large",
                            status_code=413,
                        )
                    chunks.append(chunk)
                return response, b"".join(chunks)
    except httpx.HTTPError as exc:
        raise AppError("Could not download the page", code="fetch_failed", status_code=502) from exc
    raise AppError("The page redirects too many times", code="fetch_failed", status_code=502)


def _encoding(response: httpx.Response, body: bytes, html: bool) -> str:
    """The charset from the Content-Type header, else a <meta charset>, else UTF-8."""
    if "charset=" in response.headers.get("content-type", "").lower() and response.encoding:
        return response.encoding
    if html:
        match = _META_CHARSET.search(body[:4096])
        if match:
            try:
                return codecs.lookup(match.group(1).decode("ascii")).name
            except LookupError:
                pass
    return "utf-8"


def fetch_document(client: httpx.Client, url: str) -> FetchedDocument:
    url = check_url(url)
    response, body = _download(client, url)
    media_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    final_url = str(response.url)
    path = urlsplit(final_url).path.lower()

    if media_type == "application/pdf" or path.endswith(".pdf"):
        content, title = extract_pdf(body)
        return FetchedDocument(title, None, "pdf", content, final_url)

    is_html = media_type in ("text/html", "application/xhtml+xml")
    text = body.decode(_encoding(response, body, is_html), errors="replace")
    if is_html:
        page = extract(text)
        # Many pages name no author; the site is the next best thing to show.
        author = page.author or page.site_name
        return FetchedDocument(page.title, author, "markdown", page.text, final_url)
    if media_type == "text/markdown" or path.endswith((".md", ".markdown")):
        return FetchedDocument(textutil.markdown_title(text), None, "markdown", text, final_url)
    if media_type == "text/plain":
        return FetchedDocument(None, None, "text", text, final_url)
    raise AppError(
        "Only web pages, text, Markdown and PDF files can be imported",
        code="unsupported_file",
        status_code=415,
    )
