import pytest


@pytest.mark.parametrize(
    "url",
    ["javascript:alert(document.cookie)", "data:text/html,<b>hi</b>", "example.com", "ftp://x"],
)
def test_source_urls_must_be_web_addresses(client, auth, url):
    response = client.post(
        "/api/documents", json={"title": "T", "content": "x", "source_url": url}, headers=auth
    )
    assert response.status_code == 422
    assert response.json()["error"]["message"].startswith("source_url:")


def test_source_url_is_checked_on_edit_too(client, auth, document):
    url = f"/api/documents/{document['id']}"
    response = client.patch(url, json={"source_url": "javascript:void(0)"}, headers=auth)
    assert response.status_code == 422

    response = client.patch(url, json={"source_url": "  https://example.com/a  "}, headers=auth)
    assert response.json()["source_url"] == "https://example.com/a"
    response = client.patch(url, json={"source_url": ""}, headers=auth)
    assert response.json()["source_url"] is None
