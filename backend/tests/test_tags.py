from tests.conftest import highlight, register


def test_list_tags_with_counts(client, auth, document):
    highlight(client, auth, document, "quick brown", tags=["animals", "colour"])
    highlight(client, auth, document, "lazy dog", tags=["animals"])
    tags = client.get("/api/tags", headers=auth).json()
    assert [(t["name"], t["highlight_count"]) for t in tags] == [("animals", 2), ("colour", 1)]


def test_tags_are_reused_not_duplicated(client, auth, document):
    highlight(client, auth, document, "quick brown", tags=["Animals"])
    highlight(client, auth, document, "lazy dog", tags=["animals"])
    assert len(client.get("/api/tags", headers=auth).json()) == 1


def test_rename_tag(client, auth, document):
    highlight(client, auth, document, "quick brown", tags=["animls"])
    tag = client.get("/api/tags", headers=auth).json()[0]
    response = client.patch(f"/api/tags/{tag['id']}", json={"name": "Animals"}, headers=auth)
    assert response.status_code == 200
    assert response.json() == {"id": tag["id"], "name": "animals", "highlight_count": 1}


def test_rename_onto_existing_tag_merges(client, auth, document):
    highlight(client, auth, document, "quick brown", tags=["fox"])
    highlight(client, auth, document, "lazy dog", tags=["dog", "fox"])
    tags = {t["name"]: t for t in client.get("/api/tags", headers=auth).json()}

    response = client.patch(f"/api/tags/{tags['dog']['id']}", json={"name": "fox"}, headers=auth)
    assert response.status_code == 200
    assert response.json()["id"] == tags["fox"]["id"]
    assert response.json()["highlight_count"] == 2
    assert [t["name"] for t in client.get("/api/tags", headers=auth).json()] == ["fox"]


def test_delete_tag_keeps_highlights(client, auth, document):
    created = highlight(client, auth, document, "quick brown", tags=["temp"])
    tag = client.get("/api/tags", headers=auth).json()[0]
    assert client.delete(f"/api/tags/{tag['id']}", headers=auth).status_code == 204
    highlights = client.get(f"/api/documents/{document['id']}/highlights", headers=auth).json()
    assert highlights[0]["id"] == created["id"]
    assert highlights[0]["tags"] == []


def test_tags_are_private(client, auth, document):
    highlight(client, auth, document, "quick brown", tags=["secret"])
    tag = client.get("/api/tags", headers=auth).json()[0]
    other = register(client, "other@example.com")
    assert client.get("/api/tags", headers=other).json() == []
    assert client.delete(f"/api/tags/{tag['id']}", headers=other).status_code == 404


def test_rename_tag_normalises_and_rejects_empty_names(client, auth, document):
    highlight(client, auth, document, "quick brown", tags=["focus"])
    tag = client.get("/api/tags", headers=auth).json()[0]
    url = f"/api/tags/{tag['id']}"

    response = client.patch(url, json={"name": "  #Deep   Work "}, headers=auth)
    assert response.json()["name"] == "deep work"

    for name in ["#", "   "]:
        response = client.patch(url, json={"name": name}, headers=auth)
        assert response.status_code == 422, name
    assert client.get("/api/tags", headers=auth).json()[0]["name"] == "deep work"
