"""Create documents from web pages, plain text, Markdown and PDFs on the web."""

import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx

from app.config import get_settings
from app.errors import AppError
from app.services import text as textutil
from app.services.html_extract import extract
from app.services.pdf import extract_pdf

USER_AGENT = "annotate/0.1 (document import)"


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


def _download(client: httpx.Client, url: str) -> tuple[httpx.Response, bytes]:
    limit = get_settings().max_upload_bytes
    try:
        with client.stream("GET", url, headers={"User-Agent": USER_AGENT}) as response:
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


def fetch_document(client: httpx.Client, url: str) -> FetchedDocument:
    url = check_url(url)
    response, body = _download(client, url)
    media_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    final_url = str(response.url)
    path = urlsplit(final_url).path.lower()

    if media_type == "application/pdf" or path.endswith(".pdf"):
        content, title = extract_pdf(body)
        return FetchedDocument(title, None, "pdf", content, final_url)

    text = body.decode(response.encoding or "utf-8", errors="replace")
    if media_type in ("text/html", "application/xhtml+xml"):
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
