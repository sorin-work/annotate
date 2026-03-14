from tests.conftest import SAMPLE_TEXT, register
from tests.pdf_fixture import make_pdf


def test_create_and_get_document(client, auth):
    response = client.post(
        "/api/documents",
        json={"title": "  Notes  ", "content": "Line one\nLine two", "source_type": "markdown"},
        headers=auth,
    )
    assert response.status_code == 201
    created = response.json()
    assert created["title"] == "Notes"
    assert created["content"] == "Line one\nLine two"
    assert created["word_count"] == 4
    assert created["source_type"] == "markdown"
    assert created["last_opened_at"] is None

    fetched = client.get(f"/api/documents/{created['id']}", headers=auth).json()
    assert fetched["content"] == "Line one\nLine two"
    assert fetched["last_opened_at"] is not None
    assert fetched["highlight_count"] == 0


def test_opening_a_document_does_not_change_updated_at(client, auth, document):
    fetched = client.get(f"/api/documents/{document['id']}", headers=auth).json()
    assert fetched["updated_at"] == document["updated_at"]


def test_create_document_validation(client, auth):
    response = client.post("/api/documents", json={"title": "  ", "content": "x"}, headers=auth)
    assert response.status_code == 422
    response = client.post(
        "/api/documents", json={"title": "x", "content": "x", "source_type": "pdf"}, headers=auth
    )
    assert response.status_code == 422


def test_documents_require_auth(client):
    assert client.get("/api/documents").status_code == 401


def test_list_documents_with_counts_and_excerpt(client, auth, document):
    start = SAMPLE_TEXT.index("quick")
    client.post(
        f"/api/documents/{document['id']}/highlights",
        json={"start_offset": start, "end_offset": start + 5},
        headers=auth,
    )
    body = client.get("/api/documents", headers=auth).json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["highlight_count"] == 1
    assert item["excerpt"].startswith("The quick brown fox")
    assert "content" not in item


def test_list_documents_search_sort_and_paginate(client, auth):
    for title in ["Charlie", "alpha", "Bravo"]:
        client.post("/api/documents", json={"title": title, "content": "text"}, headers=auth)

    by_title = client.get("/api/documents?sort=title", headers=auth).json()
    assert [d["title"] for d in by_title["items"]] == ["alpha", "Bravo", "Charlie"]

    page = client.get("/api/documents?sort=title&limit=2&offset=2", headers=auth).json()
    assert page["total"] == 3
    assert [d["title"] for d in page["items"]] == ["Charlie"]

    found = client.get("/api/documents?q=ALP", headers=auth).json()
    assert [d["title"] for d in found["items"]] == ["alpha"]


def test_recent_sort_prefers_recently_opened(client, auth):
    first = client.post("/api/documents", json={"title": "First", "content": "a"}, headers=auth)
    client.post("/api/documents", json={"title": "Second", "content": "b"}, headers=auth)
    client.get(f"/api/documents/{first.json()['id']}", headers=auth)

    titles = [d["title"] for d in client.get("/api/documents", headers=auth).json()["items"]]
    assert titles == ["First", "Second"]


def test_update_document_metadata(client, auth, document):
    response = client.patch(
        f"/api/documents/{document['id']}",
        json={"title": "Renamed", "author": "", "source_url": "https://example.com/a"},
        headers=auth,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Renamed"
    assert body["author"] is None
    assert body["source_url"] == "https://example.com/a"
    assert body["content"] == document["content"]


def test_delete_document(client, auth, document):
    assert client.delete(f"/api/documents/{document['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/documents/{document['id']}", headers=auth).status_code == 404


def test_documents_are_private(client, auth, document):
    other = register(client, "other@example.com")
    assert client.get(f"/api/documents/{document['id']}", headers=other).status_code == 404
    assert client.delete(f"/api/documents/{document['id']}", headers=other).status_code == 404
    assert client.get("/api/documents", headers=other).json()["total"] == 0


def test_upload_markdown_uses_heading_as_title(client, auth):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("notes.md", b"# Big Idea\n\nSome words here.", "text/markdown")},
        headers=auth,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == "Big Idea"
    assert body["source_type"] == "markdown"
    assert body["original_filename"] == "notes.md"


def test_upload_text_with_explicit_title(client, auth):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("chapter_one.txt", "Café au lait".encode(), "text/plain")},
        data={"title": "Chapter 1"},
        headers=auth,
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Chapter 1"
    assert response.json()["content"] == "Café au lait"


def test_upload_text_falls_back_to_filename(client, auth):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("chapter_one.txt", b"hello", "text/plain")},
        headers=auth,
    )
    assert response.json()["title"] == "chapter one"


def test_upload_pdf(client, auth):
    pdf = make_pdf(["A PDF about reading.", "Page two."], title="Reading PDFs")
    response = client.post(
        "/api/documents/upload",
        files={"file": ("paper.pdf", pdf, "application/pdf")},
        headers=auth,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["source_type"] == "pdf"
    assert body["title"] == "Reading PDFs"
    assert "A PDF about reading." in body["content"]


def test_upload_rejects_unknown_types_and_bad_encoding(client, auth):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("image.png", b"\x89PNG", "image/png")},
        headers=auth,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "unsupported_file"

    response = client.post(
        "/api/documents/upload",
        files={"file": ("latin1.txt", "café".encode("latin-1"), "text/plain")},
        headers=auth,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_file"


def test_upload_rejects_empty_and_large_files(client, auth, monkeypatch):
    response = client.post(
        "/api/documents/upload", files={"file": ("empty.txt", b"  \n", "text/plain")}, headers=auth
    )
    assert response.status_code == 400

    from app.config import Settings

    monkeypatch.setattr(Settings, "max_upload_bytes", property(lambda self: 10))
    response = client.post(
        "/api/documents/upload",
        files={"file": ("big.txt", b"x" * 11, "text/plain")},
        headers=auth,
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"
