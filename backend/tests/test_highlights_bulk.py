from tests.conftest import highlight


def bulk(client, auth, **body):
    return client.post("/api/highlights/bulk", json=body, headers=auth)


def tags_of(client, auth, document):
    highlights = client.get(f"/api/documents/{document['id']}/highlights", headers=auth).json()
    return {h["quote"]: h["tags"] for h in highlights}


def test_bulk_add_and_remove_tags(client, auth, document):
    first = highlight(client, auth, document, "quick brown", tags=["fox", "old"])
    second = highlight(client, auth, document, "lazy dog", tags=["old"])

    response = bulk(client, auth, ids=[first["id"], second["id"]], add_tags=["#Animals"])
    assert response.status_code == 200
    assert response.json() == {"updated": 2, "deleted": 0}
    assert tags_of(client, auth, document) == {
        "quick brown": ["animals", "fox", "old"],
        "lazy dog": ["animals", "old"],
    }

    bulk(client, auth, ids=[first["id"], second["id"]], remove_tags=["old"])
    assert tags_of(client, auth, document) == {
        "quick brown": ["animals", "fox"],
        "lazy dog": ["animals"],
    }
    tags = {t["name"]: t["highlight_count"] for t in client.get("/api/tags", headers=auth).json()}
    assert tags["animals"] == 2
    assert tags["old"] == 0


def test_bulk_recolour(client, auth, document):
    first = highlight(client, auth, document, "quick brown")
    second = highlight(client, auth, document, "lazy dog", color="pink")
    bulk(client, auth, ids=[first["id"], second["id"]], color="green")
    colors = {
        h["color"]
        for h in client.get(f"/api/documents/{document['id']}/highlights", headers=auth).json()
    }
    assert colors == {"green"}


def test_bulk_delete(client, auth, document):
    first = highlight(client, auth, document, "quick brown")
    second = highlight(client, auth, document, "lazy dog")
    keep = highlight(client, auth, document, "taking notes")

    response = bulk(client, auth, ids=[first["id"], second["id"], first["id"]], delete=True)
    assert response.json() == {"updated": 0, "deleted": 2}
    remaining = client.get(f"/api/documents/{document['id']}/highlights", headers=auth).json()
    assert [h["id"] for h in remaining] == [keep["id"]]


def test_bulk_needs_exactly_one_kind_of_change(client, auth, document):
    first = highlight(client, auth, document, "quick brown")
    assert bulk(client, auth, ids=[first["id"]]).status_code == 422
    assert bulk(client, auth, ids=[first["id"]], delete=True, color="blue").status_code == 422
    assert bulk(client, auth, ids=[], delete=True).status_code == 422


def test_bulk_is_all_or_nothing_across_users(client, auth, other_auth, document):
    mine = highlight(client, auth, document, "quick brown")
    theirs_doc = client.post(
        "/api/documents", json={"title": "Theirs", "content": "Private words."}, headers=other_auth
    ).json()
    theirs = highlight(client, other_auth, theirs_doc, "Private words")

    response = bulk(client, auth, ids=[mine["id"], theirs["id"]], delete=True)
    assert response.status_code == 404
    assert len(client.get("/api/highlights", headers=auth).json()["items"]) == 1
    assert client.get("/api/highlights", headers=other_auth).json()["total"] == 1
