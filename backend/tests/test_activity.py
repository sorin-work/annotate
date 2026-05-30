from tests.conftest import highlight


def test_activity_lists_documents_and_highlights_newest_first(client, auth, other_auth, document):
    first = highlight(client, auth, document, "quick brown", note="Nice")
    second = highlight(client, auth, document, "lazy dog", color="blue")
    client.post("/api/documents", json={"title": "Theirs", "content": "x"}, headers=other_auth)

    body = client.get("/api/activity", headers=auth).json()
    assert [(item["type"], (item["highlight"] or {}).get("id")) for item in body["items"]] == [
        ("highlight_added", second["id"]),
        ("highlight_added", first["id"]),
        ("document_added", None),
    ]
    assert body["items"][1]["highlight"]["note"] == "Nice"
    assert body["items"][2]["document"] == {"id": document["id"], "title": "Sample"}
    assert body["next_before"] is None


def test_activity_pages_with_before(client, auth, document):
    for quote in ["quick", "brown", "lazy", "dog"]:
        highlight(client, auth, document, quote)

    first = client.get("/api/activity?limit=2", headers=auth).json()
    assert [i["highlight"]["quote"] for i in first["items"]] == ["dog", "lazy"]
    assert first["next_before"] is not None

    second = client.get(
        "/api/activity", params={"limit": 2, "before": first["next_before"]}, headers=auth
    ).json()
    assert [i["highlight"]["quote"] for i in second["items"]] == ["brown", "quick"]

    third = client.get(
        "/api/activity", params={"limit": 2, "before": second["next_before"]}, headers=auth
    ).json()
    assert [i["type"] for i in third["items"]] == ["document_added"]
    assert third["next_before"] is None
