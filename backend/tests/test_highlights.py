from tests.conftest import SAMPLE_TEXT, highlight, register


def test_create_highlight_stores_quote_from_document(client, auth, document):
    start = SAMPLE_TEXT.index("brown fox")
    response = client.post(
        f"/api/documents/{document['id']}/highlights",
        json={
            "start_offset": start,
            "end_offset": start + len("brown fox"),
            "color": "green",
            "note": "  a note  ",
            "tags": ["Animals", "#animals", " quick  read "],
        },
        headers=auth,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["quote"] == "brown fox"
    assert body["color"] == "green"
    assert body["note"] == "a note"
    assert body["tags"] == ["animals", "quick read"]


def test_highlight_range_validation(client, auth, document):
    url = f"/api/documents/{document['id']}/highlights"
    reversed_range = client.post(url, json={"start_offset": 10, "end_offset": 5}, headers=auth)
    assert reversed_range.status_code == 422

    too_far = client.post(
        url, json={"start_offset": 0, "end_offset": len(SAMPLE_TEXT) + 1}, headers=auth
    )
    assert too_far.status_code == 400
    assert too_far.json()["error"]["code"] == "out_of_range"

    whitespace = SAMPLE_TEXT.index("\n\n")
    blank = client.post(
        url, json={"start_offset": whitespace, "end_offset": whitespace + 2}, headers=auth
    )
    assert blank.status_code == 400
    assert blank.json()["error"]["code"] == "empty_highlight"

    bad_color = client.post(
        url, json={"start_offset": 0, "end_offset": 3, "color": "orange"}, headers=auth
    )
    assert bad_color.status_code == 422


def test_list_document_highlights_in_reading_order(client, auth, document):
    highlight(client, auth, document, "second paragraph")
    highlight(client, auth, document, "quick brown")
    response = client.get(f"/api/documents/{document['id']}/highlights", headers=auth)
    assert [h["quote"] for h in response.json()] == ["quick brown", "second paragraph"]

    detail = client.get(f"/api/documents/{document['id']}", headers=auth).json()
    assert detail["highlight_count"] == 2


def test_update_highlight(client, auth, document):
    created = highlight(client, auth, document, "lazy dog", tags=["one"])
    url = f"/api/highlights/{created['id']}"

    response = client.patch(url, json={"note": "Updated", "color": "pink"}, headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["note"] == "Updated"
    assert body["color"] == "pink"
    assert body["tags"] == ["one"]

    response = client.patch(url, json={"tags": ["two", "Three"], "note": ""}, headers=auth)
    body = response.json()
    assert body["tags"] == ["three", "two"]
    assert body["note"] is None


def test_delete_highlight(client, auth, document):
    created = highlight(client, auth, document, "lazy dog")
    assert client.delete(f"/api/highlights/{created['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/documents/{document['id']}/highlights", headers=auth).json() == []


def test_deleting_a_document_removes_its_highlights(client, auth, document):
    highlight(client, auth, document, "lazy dog")
    client.delete(f"/api/documents/{document['id']}", headers=auth)
    assert client.get("/api/highlights", headers=auth).json()["total"] == 0


def test_highlights_are_private(client, auth, document):
    created = highlight(client, auth, document, "lazy dog")
    other = register(client, "other@example.com")
    assert (
        client.patch(
            f"/api/highlights/{created['id']}", json={"note": "mine now"}, headers=other
        ).status_code
        == 404
    )
    assert client.delete(f"/api/highlights/{created['id']}", headers=other).status_code == 404
    response = client.post(
        f"/api/documents/{document['id']}/highlights",
        json={"start_offset": 0, "end_offset": 3},
        headers=other,
    )
    assert response.status_code == 404


def test_list_all_highlights_with_filters(client, auth, document):
    highlight(client, auth, document, "quick brown", color="green", tags=["animals"])
    highlight(client, auth, document, "lazy dog", note="sleepy", tags=["animals", "rest"])
    highlight(client, auth, document, "taking notes", color="blue")

    everything = client.get("/api/highlights", headers=auth).json()
    assert everything["total"] == 3
    assert everything["items"][0]["document_title"] == "Sample"

    tagged = client.get("/api/highlights?tag=Animals", headers=auth).json()
    assert {h["quote"] for h in tagged["items"]} == {"quick brown", "lazy dog"}

    blue = client.get("/api/highlights?color=blue", headers=auth).json()
    assert [h["quote"] for h in blue["items"]] == ["taking notes"]

    by_note = client.get("/api/highlights?q=SLEEPY", headers=auth).json()
    assert [h["quote"] for h in by_note["items"]] == ["lazy dog"]

    by_tag_text = client.get("/api/highlights?q=res", headers=auth).json()
    assert [h["quote"] for h in by_tag_text["items"]] == ["lazy dog"]

    paged = client.get("/api/highlights?limit=1&offset=1", headers=auth).json()
    assert paged["total"] == 3
    assert len(paged["items"]) == 1


def test_sort_highlights(client, auth, document):
    other = client.post(
        "/api/documents", json={"title": "Another", "content": "Later words here."}, headers=auth
    ).json()
    highlight(client, auth, document, "lazy dog")
    highlight(client, auth, other, "Later words")
    highlight(client, auth, document, "quick brown")

    def quotes(sort: str) -> list[str]:
        response = client.get(f"/api/highlights?sort={sort}", headers=auth)
        assert response.status_code == 200, response.text
        return [h["quote"] for h in response.json()["items"]]

    assert quotes("newest") == ["quick brown", "Later words", "lazy dog"]
    assert quotes("oldest") == ["lazy dog", "Later words", "quick brown"]
    assert quotes("document") == ["Later words", "quick brown", "lazy dog"]
    assert client.get("/api/highlights?sort=random", headers=auth).status_code == 422
