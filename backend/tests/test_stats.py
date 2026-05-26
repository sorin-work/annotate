from datetime import UTC, date, datetime, timedelta

from sqlalchemy import update

from app.db import utcnow
from app.models import Highlight
from app.services.stats import weekly_counts
from tests.conftest import highlight


def test_stats_for_an_empty_account(client, auth):
    stats = client.get("/api/stats", headers=auth).json()
    assert stats["documents"] == 0
    assert stats["highlights"] == 0
    assert stats["words"] == 0
    assert stats["colors"] == {"yellow": 0, "green": 0, "blue": 0, "pink": 0, "purple": 0}
    assert stats["top_tags"] == []
    assert len(stats["weekly"]) == 12
    assert all(week["highlights"] == 0 for week in stats["weekly"])


def test_stats_count_highlights_notes_tags_and_colours(client, auth, other_auth, document):
    highlight(client, auth, document, "quick brown", tags=["fox", "animals"], note="Nice")
    highlight(client, auth, document, "lazy dog", color="blue", tags=["animals"])
    highlight(client, auth, document, "taking notes", color="blue")
    client.post("/api/collections", json={"name": "Shelf"}, headers=auth)
    # Someone else's data never shows up.
    client.post("/api/documents", json={"title": "Theirs", "content": "x y"}, headers=other_auth)

    stats = client.get("/api/stats", headers=auth).json()
    assert stats["documents"] == 1
    assert stats["highlights"] == 3
    assert stats["notes"] == 1
    assert stats["tags"] == 2
    assert stats["collections"] == 1
    assert stats["words"] == document["word_count"]
    assert stats["colors"]["blue"] == 2
    assert stats["colors"]["yellow"] == 1
    assert stats["top_tags"] == [{"name": "animals", "count": 2}, {"name": "fox", "count": 1}]
    assert stats["weekly"][-1]["highlights"] == 3
    assert stats["most_highlighted"] == [
        {"id": document["id"], "title": "Sample", "highlight_count": 3}
    ]


def test_weekly_counts_start_on_monday():
    now = datetime(2026, 5, 20, 21, 0, tzinfo=UTC)  # a Wednesday
    created = [
        datetime(2026, 5, 18, 0, 30, tzinfo=UTC),  # Monday this week
        datetime(2026, 5, 17, 23, 59, tzinfo=UTC),  # Sunday last week
        datetime(2026, 1, 1, tzinfo=UTC),  # too old to show
    ]
    weeks = weekly_counts(created, now, weeks=3)
    assert [(w.week_start, w.highlights) for w in weeks] == [
        (date(2026, 5, 4), 0),
        (date(2026, 5, 11), 1),
        (date(2026, 5, 18), 1),
    ]


def test_old_highlights_count_in_totals_but_not_in_the_weekly_chart(client, auth, document, db):
    old = highlight(client, auth, document, "quick brown")
    highlight(client, auth, document, "lazy dog")
    db.execute(
        update(Highlight)
        .where(Highlight.id == old["id"])
        .values(created_at=utcnow() - timedelta(days=200))
    )
    db.commit()

    stats = client.get("/api/stats", headers=auth).json()
    assert stats["highlights"] == 2
    assert sum(week["highlights"] for week in stats["weekly"]) == 1
