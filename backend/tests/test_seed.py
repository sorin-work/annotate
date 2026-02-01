from sqlalchemy import func, select

from app.models import Collection, Document, Highlight, Tag, User
from app.seed import DEMO_EMAIL, DEMO_PASSWORD, HIGHLIGHTS, seed_demo


def test_seed_creates_demo_data_once(db):
    assert seed_demo(db) is True
    assert seed_demo(db) is False

    assert db.scalar(select(func.count(User.id))) == 1
    assert db.scalar(select(func.count(Document.id))) == 6
    assert db.scalar(select(func.count(Highlight.id))) == len(HIGHLIGHTS)
    assert db.scalar(select(func.count(Collection.id))) == 3
    assert db.scalar(select(func.count(Tag.id))) > 5


def test_seeded_highlights_match_their_documents(db):
    seed_demo(db)
    for highlight in db.scalars(select(Highlight)):
        document = highlight.document
        assert document.content[highlight.start_offset : highlight.end_offset] == highlight.quote


def test_demo_user_can_log_in(client, engine):
    from sqlalchemy.orm import Session

    with Session(engine) as session:
        seed_demo(session)
    response = client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert response.status_code == 200
    documents = client.get(
        "/api/documents", headers={"Authorization": f"Bearer {response.json()['access_token']}"}
    ).json()
    assert documents["total"] == 6
