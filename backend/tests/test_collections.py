from tests.conftest import register


def make_collection(client, auth, name="Reading list", **extra):
    response = client.post("/api/collections", json={"name": name, **extra}, headers=auth)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_list_collections(client, auth):
    make_collection(client, auth, "zeta")
    make_collection(client, auth, "Alpha", description="First")
    collections = client.get("/api/collections", headers=auth).json()
    assert [c["name"] for c in collections] == ["Alpha", "zeta"]
    assert collections[0]["description"] == "First"
    assert collections[0]["document_count"] == 0


def test_collection_names_are_unique_per_user(client, auth):
    make_collection(client, auth, "Books")
    response = client.post("/api/collections", json={"name": "books"}, headers=auth)
    assert response.status_code == 409

    other = register(client, "other@example.com")
    assert client.post("/api/collections", json={"name": "Books"}, headers=other).status_code == 201


def test_add_and_remove_documents(client, auth, document):
    collection = make_collection(client, auth)
    url = f"/api/collections/{collection['id']}/documents"

    response = client.post(url, json={"document_id": document["id"]}, headers=auth)
    assert response.status_code == 201
    assert response.json()["document_count"] == 1
    # Adding twice is a no-op.
    client.post(url, json={"document_id": document["id"]}, headers=auth)

    detail = client.get(f"/api/collections/{collection['id']}", headers=auth).json()
    assert [d["id"] for d in detail["documents"]] == [document["id"]]

    doc = client.get(f"/api/documents/{document['id']}", headers=auth).json()
    assert doc["collections"] == [{"id": collection["id"], "name": "Reading list"}]

    filtered = client.get(f"/api/documents?collection_id={collection['id']}", headers=auth).json()
    assert filtered["total"] == 1

    assert client.delete(f"{url}/{document['id']}", headers=auth).status_code == 204
    detail = client.get(f"/api/collections/{collection['id']}", headers=auth).json()
    assert detail["documents"] == []


def test_update_and_delete_collection(client, auth, document):
    collection = make_collection(client, auth)
    make_collection(client, auth, "Taken")
    client.post(
        f"/api/collections/{collection['id']}/documents",
        json={"document_id": document["id"]},
        headers=auth,
    )
    url = f"/api/collections/{collection['id']}"

    assert client.patch(url, json={"name": "taken"}, headers=auth).status_code == 409
    response = client.patch(url, json={"name": "Renamed", "description": "x"}, headers=auth)
    assert response.json()["name"] == "Renamed"
    assert response.json()["document_count"] == 1

    assert client.delete(url, headers=auth).status_code == 204
    assert client.get(url, headers=auth).status_code == 404
    # The document itself survives.
    assert client.get(f"/api/documents/{document['id']}", headers=auth).status_code == 200


def test_collections_are_private(client, auth, document):
    collection = make_collection(client, auth)
    other = register(client, "other@example.com")
    url = f"/api/collections/{collection['id']}"
    assert client.get(url, headers=other).status_code == 404
    assert (
        client.get(f"/api/documents?collection_id={collection['id']}", headers=other).status_code
        == 404
    )

    # Cannot add someone else's document to your collection either.
    mine = make_collection(client, other, "Mine")
    response = client.post(
        f"/api/collections/{mine['id']}/documents",
        json={"document_id": document["id"]},
        headers=other,
    )
    assert response.status_code == 404
