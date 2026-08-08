from tests.conftest import highlight


def test_comment_thread_on_a_highlight(client, auth, document):
    h = highlight(client, auth, document, "quick brown", note="First reading")
    url = f"/api/highlights/{h['id']}/comments"

    first = client.post(url, json={"body": "  Second reading: still true.  "}, headers=auth)
    assert first.status_code == 201
    assert first.json()["body"] == "Second reading: still true."
    client.post(url, json={"body": "Third time round."}, headers=auth)

    bodies = [c["body"] for c in client.get(url, headers=auth).json()]
    assert bodies == ["Second reading: still true.", "Third time round."]

    comment_id = first.json()["id"]
    edited = client.patch(f"/api/comments/{comment_id}", json={"body": "Edited"}, headers=auth)
    assert edited.json()["body"] == "Edited"
    assert client.delete(f"/api/comments/{comment_id}", headers=auth).status_code == 204
    assert [c["body"] for c in client.get(url, headers=auth).json()] == ["Third time round."]


def test_comments_validation_and_privacy(client, auth, other_auth, document):
    h = highlight(client, auth, document, "lazy dog")
    url = f"/api/highlights/{h['id']}/comments"
    assert client.post(url, json={"body": "   "}, headers=auth).status_code == 422

    comment = client.post(url, json={"body": "Mine"}, headers=auth).json()
    assert client.get(url, headers=other_auth).status_code == 404
    assert client.post(url, json={"body": "Hi"}, headers=other_auth).status_code == 404
    assert (
        client.patch(f"/api/comments/{comment['id']}", json={"body": "x"}, headers=other_auth)
    ).status_code == 404


def test_deleting_a_highlight_removes_its_comments(client, auth, document):
    h = highlight(client, auth, document, "lazy dog")
    comment = client.post(
        f"/api/highlights/{h['id']}/comments", json={"body": "Gone soon"}, headers=auth
    ).json()
    client.delete(f"/api/highlights/{h['id']}", headers=auth)
    assert client.delete(f"/api/comments/{comment['id']}", headers=auth).status_code == 404
