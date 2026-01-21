import csv
import io

from app.services.export import slugify
from tests.conftest import highlight


def test_export_document_markdown(client, auth, document):
    highlight(client, auth, document, "quick brown fox", note="A classic.", tags=["typing"])
    highlight(client, auth, document, "taking notes")

    response = client.get(f"/api/documents/{document['id']}/export?format=md", headers=auth)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert 'filename="sample.md"' in response.headers["content-disposition"]
    body = response.text
    assert body.startswith("# Sample\n")
    assert "*A. Writer*" in body
    assert "> quick brown fox" in body
    assert "A classic." in body
    assert "`#typing`" in body
    assert body.index("quick brown fox") < body.index("taking notes")
    assert "2 highlights" in body


def test_export_document_csv(client, auth, document):
    highlight(client, auth, document, "lazy dog", note='Says "woof"', tags=["b", "a"])
    response = client.get(f"/api/documents/{document['id']}/export?format=csv", headers=auth)
    assert response.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert len(rows) == 1
    assert rows[0]["document"] == "Sample"
    assert rows[0]["quote"] == "lazy dog"
    assert rows[0]["note"] == 'Says "woof"'
    assert rows[0]["tags"] == "a; b"


def test_csv_export_neutralises_formulas(client, auth, document):
    highlight(client, auth, document, "lazy dog", note='=HYPERLINK("http://evil")')
    response = client.get(f"/api/documents/{document['id']}/export?format=csv", headers=auth)
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows[0]["note"].startswith("'=")


def test_export_all_highlights_grouped_by_document(client, auth, document):
    second = client.post(
        "/api/documents",
        json={"title": "Another", "content": "Something worth keeping."},
        headers=auth,
    ).json()
    highlight(client, auth, document, "lazy dog", tags=["keep"])
    highlight(client, auth, second, "worth keeping", tags=["keep"])
    highlight(client, auth, second, "Something")

    body = client.get("/api/export?format=md", headers=auth).text
    assert body.startswith("# Highlights\n")
    assert "## Another" in body and "## Sample" in body
    assert body.index("## Another") < body.index("## Sample")

    tagged = client.get("/api/export?format=md&tag=keep", headers=auth)
    assert tagged.text.startswith("# Highlights tagged #keep")
    assert "> Something\n" not in tagged.text

    rows = list(
        csv.DictReader(io.StringIO(client.get("/api/export?format=csv", headers=auth).text))
    )
    assert len(rows) == 3


def test_export_collection(client, auth, document):
    collection = client.post("/api/collections", json={"name": "My Shelf"}, headers=auth).json()
    client.post(
        f"/api/collections/{collection['id']}/documents",
        json={"document_id": document["id"]},
        headers=auth,
    )
    highlight(client, auth, document, "lazy dog")
    response = client.get(f"/api/export?collection_id={collection['id']}", headers=auth)
    assert response.text.startswith("# My Shelf\n")
    assert "my-shelf-" in response.headers["content-disposition"]


def test_export_requires_valid_format(client, auth, document):
    response = client.get(f"/api/documents/{document['id']}/export?format=pdf", headers=auth)
    assert response.status_code == 422


def test_slugify_folds_accents_and_falls_back():
    assert slugify("Însemnări și gânduri") == "insemnari-si-ganduri"
    assert slugify("Ça, c'est la vie!") == "ca-c-est-la-vie"
    assert slugify("読書ノート") == "annotations"
