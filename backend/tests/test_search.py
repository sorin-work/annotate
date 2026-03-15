from tests.conftest import highlight, register


def test_search_matches_documents_and_highlights(client, auth, document):
    highlight(client, auth, document, "lazy dog", note="about reading habits")
    results = client.get("/api/search?q=reading", headers=auth).json()

    assert results["query"] == "reading"
    assert [d["id"] for d in results["documents"]] == [document["id"]]
    assert "reading slowly" in results["documents"][0]["snippet"]
    assert [h["quote"] for h in results["highlights"]] == ["lazy dog"]
    assert results["highlights"][0]["document_title"] == "Sample"


def test_search_by_title_uses_excerpt(client, auth, document):
    results = client.get("/api/search?q=sample", headers=auth).json()
    assert results["documents"][0]["snippet"].startswith("The quick brown fox")


def test_search_with_filters_returns_only_highlights(client, auth, document):
    highlight(client, auth, document, "quick brown", color="green", tags=["fox"])
    highlight(client, auth, document, "lazy dog", color="green")
    highlight(client, auth, document, "taking notes", tags=["fox"])

    results = client.get("/api/search?tag=fox&color=green", headers=auth).json()
    assert results["documents"] == []
    assert [h["quote"] for h in results["highlights"]] == ["quick brown"]


def test_search_within_collection(client, auth, document):
    other_doc = client.post(
        "/api/documents", json={"title": "Elsewhere", "content": "reading too"}, headers=auth
    ).json()
    collection = client.post("/api/collections", json={"name": "C"}, headers=auth).json()
    client.post(
        f"/api/collections/{collection['id']}/documents",
        json={"document_id": other_doc["id"]},
        headers=auth,
    )

    everything = client.get("/api/search?q=reading", headers=auth).json()
    assert len(everything["documents"]) == 2
    scoped = client.get(f"/api/search?q=reading&collection_id={collection['id']}", headers=auth)
    assert [d["title"] for d in scoped.json()["documents"]] == ["Elsewhere"]


def test_empty_search(client, auth, document):
    results = client.get("/api/search?q=", headers=auth).json()
    assert results == {"query": "", "documents": [], "highlights": []}


def test_search_is_private(client, auth, document):
    highlight(client, auth, document, "lazy dog")
    other = register(client, "other@example.com")
    results = client.get("/api/search?q=dog", headers=other).json()
    assert results["documents"] == [] and results["highlights"] == []


def test_percent_and_underscore_are_matched_literally(client, auth):
    for title, content in [("50% done", "Half of it."), ("500 days", "Done in 50 weeks.")]:
        client.post("/api/documents", json={"title": title, "content": content}, headers=auth)
    doc = client.post(
        "/api/documents", json={"title": "Code", "content": "Use snake_case names."}, headers=auth
    ).json()
    highlight(client, auth, doc, "snake_case")

    results = client.get("/api/search?q=50%25", headers=auth).json()
    assert [d["title"] for d in results["documents"]] == ["50% done"]

    listed = client.get("/api/documents?q=50%25", headers=auth).json()
    assert [d["title"] for d in listed["items"]] == ["50% done"]

    found = client.get("/api/highlights?q=e_c", headers=auth).json()
    assert [h["quote"] for h in found["items"]] == ["snake_case"]
    assert client.get("/api/highlights?q=e_n", headers=auth).json()["total"] == 0
