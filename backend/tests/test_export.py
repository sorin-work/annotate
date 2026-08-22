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


def test_csv_export_neutralises_formulas_in_tags(client, auth, document):
    highlight(client, auth, document, "lazy dog", tags=["=sum(a1)", "reading"])
    response = client.get(f"/api/documents/{document['id']}/export?format=csv", headers=auth)
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows[0]["tags"] == "'=sum(a1); reading"


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


def test_exports_include_comments(client, auth, document):
    h = highlight(client, auth, document, "lazy dog", note="First note")
    for body in ["Second look:\nstill good", "=1+1"]:
        client.post(f"/api/highlights/{h['id']}/comments", json={"body": body}, headers=auth)

    markdown = client.get(f"/api/documents/{document['id']}/export", headers=auth).text
    assert ": Second look: still good\n" in markdown
    assert markdown.index("First note") < markdown.index("Second look")

    response = client.get(f"/api/documents/{document['id']}/export?format=csv", headers=auth)
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows[0]["comments"] == "Second look: still good | =1+1"


def test_export_json(client, auth, document):
    h = highlight(client, auth, document, "lazy dog", note="Note", tags=["b", "a"], color="blue")
    client.post(f"/api/highlights/{h['id']}/comments", json={"body": "Later"}, headers=auth)
    other = client.post(
        "/api/documents", json={"title": "Another", "content": "Worth keeping."}, headers=auth
    ).json()
    highlight(client, auth, other, "Worth keeping")

    response = client.get("/api/export?format=json", headers=auth)
    assert response.headers["content-type"] == "application/json"
    assert response.headers["content-disposition"].endswith('.json"')
    body = response.json()
    assert [d["title"] for d in body["documents"]] == ["Another", "Sample"]
    sample = body["documents"][1]
    assert sample["author"] == "A. Writer"
    exported = sample["highlights"][0]
    assert exported["quote"] == "lazy dog"
    assert exported["tags"] == ["a", "b"]
    assert exported["color"] == "blue"
    assert [c["body"] for c in exported["comments"]] == ["Later"]

    single = client.get(f"/api/documents/{document['id']}/export?format=json", headers=auth)
    assert [d["id"] for d in single.json()["documents"]] == [document["id"]]
