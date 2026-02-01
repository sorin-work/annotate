"""Demo account with sample documents, highlights, tags and collections.

Run with ``python -m app.seed``. Safe to run more than once: if the demo user
already exists nothing is changed.
"""

from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import utcnow
from app.models import Collection, Document, Highlight, User
from app.security import hash_password
from app.services.tags import get_or_create_tags
from app.services.text import count_words

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo-password"
DOCUMENTS_DIR = Path(__file__).parent / "documents"


@dataclass
class SampleDocument:
    file: str
    title: str
    author: str | None = None
    source_url: str | None = None
    days_ago: int = 30


@dataclass
class SampleHighlight:
    file: str
    quote: str
    color: str = "yellow"
    note: str | None = None
    tags: list[str] = field(default_factory=list)


DOCUMENTS = [
    SampleDocument(
        "walden.md",
        "Where I Lived, and What I Lived For",
        author="Henry David Thoreau",
        source_url="https://www.gutenberg.org/ebooks/205",
        days_ago=160,
    ),
    SampleDocument(
        "self-reliance.txt",
        "Self-Reliance",
        author="Ralph Waldo Emerson",
        source_url="https://www.gutenberg.org/ebooks/16643",
        days_ago=120,
    ),
    SampleDocument(
        "meditations-book-two.txt",
        "Meditations, Book II",
        author="Marcus Aurelius (tr. George Long)",
        source_url="https://www.gutenberg.org/ebooks/2680",
        days_ago=95,
    ),
    SampleDocument("reading-papers.md", "Reading research papers in three passes", days_ago=60),
    SampleDocument("spaced-repetition.md", "Why spaced repetition works", days_ago=34),
    SampleDocument("design-docs.md", "Writing design docs people actually read", days_ago=9),
]

HIGHLIGHTS = [
    SampleHighlight(
        "walden.md",
        "I went to the woods because I wished to live deliberately",
        color="green",
        note="The whole book in one sentence.",
        tags=["quote-worthy", "intention"],
    ),
    SampleHighlight(
        "walden.md",
        "Our life is frittered away by detail.",
        note="Still true, and the details are now notifications.",
        tags=["attention", "simplicity"],
    ),
    SampleHighlight(
        "walden.md",
        "Simplicity, simplicity, simplicity!",
        color="pink",
        tags=["simplicity"],
    ),
    SampleHighlight(
        "walden.md",
        "not be thrown off the track by every nutshell and mosquito's wing that falls on the rails",
        color="blue",
        note="Good image for protecting a focused morning.",
        tags=["attention", "habits"],
    ),
    SampleHighlight(
        "walden.md",
        "Time is but the stream I go a-fishing in.",
        color="purple",
        tags=["quote-worthy"],
    ),
    SampleHighlight(
        "self-reliance.txt",
        "envy is ignorance; that imitation is suicide",
        color="green",
        tags=["quote-worthy"],
    ),
    SampleHighlight(
        "self-reliance.txt",
        "A foolish consistency is the hobgoblin of little minds",
        note='Note the word "foolish": he is not against consistency in general.',
        tags=["quote-worthy", "to-revisit"],
    ),
    SampleHighlight(
        "self-reliance.txt",
        "the great man is he who in the midst of the crowd keeps with perfect sweetness the "
        "independence of solitude",
        color="blue",
        note="Compare with Marcus Aurelius on retreating into yourself.",
        tags=["stoicism", "to-revisit"],
    ),
    SampleHighlight(
        "meditations-book-two.txt",
        "Begin the morning by saying to thyself, I shall meet with the busy-body, the ungrateful, "
        "arrogant, deceitful, envious, unsocial.",
        color="yellow",
        note="Negative visualisation as a morning habit. Expect friction and it loses its sting.",
        tags=["stoicism", "habits"],
    ),
    SampleHighlight(
        "meditations-book-two.txt",
        "if thou doest every act of thy life as if it were the last",
        color="pink",
        tags=["stoicism", "attention"],
    ),
    SampleHighlight(
        "meditations-book-two.txt",
        "Give thyself time to learn something new and good, and cease to be whirled around.",
        color="green",
        note="The antidote to distraction is not rest but something better to attend to.",
        tags=["attention"],
    ),
    SampleHighlight(
        "meditations-book-two.txt",
        "no man loses any other life than this which he now lives",
        color="purple",
        tags=["stoicism", "quote-worthy"],
    ),
    SampleHighlight(
        "reading-papers.md",
        "The first pass is a filter, not a failure.",
        color="green",
        tags=["research"],
    ),
    SampleHighlight(
        "reading-papers.md",
        "a good figure carries most of the argument, and a bad one is often where the weak "
        "spots hide",
        note="Start reviews from the figures next time.",
        tags=["research", "to-revisit"],
    ),
    SampleHighlight(
        "reading-papers.md",
        "Highlights alone are not notes.",
        color="pink",
        note="Which is exactly why this app lets you attach a note to every highlight.",
        tags=["notes", "writing"],
    ),
    SampleHighlight(
        "reading-papers.md",
        "Tag notes by question, not by paper.",
        color="blue",
        tags=["notes", "research"],
    ),
    SampleHighlight(
        "spaced-repetition.md",
        "Forgetting is not a bug in memory, it is how memory decides what matters.",
        color="green",
        tags=["memory", "quote-worthy"],
    ),
    SampleHighlight(
        "spaced-repetition.md",
        "familiarity is not recall",
        color="pink",
        note="Rereading my highlights is not the same as remembering them.",
        tags=["memory", "learning"],
    ),
    SampleHighlight(
        "spaced-repetition.md",
        "One idea per card.",
        tags=["memory"],
    ),
    SampleHighlight(
        "spaced-repetition.md",
        'A highlight says "this looked important". A note says what it means.',
        color="purple",
        tags=["notes", "memory"],
    ),
    SampleHighlight(
        "design-docs.md",
        "the gaps in a plan become obvious the moment you try to explain it in full sentences",
        color="green",
        note="Same reason rubber-duck debugging works.",
        tags=["writing"],
    ),
    SampleHighlight(
        "design-docs.md",
        "A short list of non-goals saves more review time than any diagram.",
        color="blue",
        tags=["writing", "to-revisit"],
    ),
    SampleHighlight(
        "design-docs.md",
        "A wrong design doc is worse than none at all.",
        color="pink",
        tags=["writing"],
    ),
]

COLLECTIONS = [
    (
        "Philosophy",
        "Old books that still hold up.",
        ["walden.md", "self-reliance.txt", "meditations-book-two.txt"],
    ),
    (
        "Learning how to learn",
        "Notes on reading, memory and note-taking.",
        ["reading-papers.md", "spaced-repetition.md"],
    ),
    ("Work", "Writing and engineering practice.", ["design-docs.md", "reading-papers.md"]),
]


def _source_type(file: str) -> str:
    return "markdown" if file.endswith(".md") else "text"


def seed_demo(db: Session) -> bool:
    """Create the demo account. Returns False if it already existed."""
    if db.scalar(select(User.id).where(User.email == DEMO_EMAIL)) is not None:
        return False

    now = utcnow()
    user = User(
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        display_name="Demo Reader",
        created_at=now - timedelta(days=180),
    )
    db.add(user)
    db.flush()

    documents: dict[str, Document] = {}
    for sample in DOCUMENTS:
        content = (DOCUMENTS_DIR / sample.file).read_text(encoding="utf-8")
        created = now - timedelta(days=sample.days_ago)
        document = Document(
            owner_id=user.id,
            title=sample.title,
            source_type=_source_type(sample.file),
            content=content,
            word_count=count_words(content),
            original_filename=sample.file,
            author=sample.author,
            source_url=sample.source_url,
            created_at=created,
            updated_at=created,
        )
        db.add(document)
        documents[sample.file] = document
    db.flush()

    for index, sample in enumerate(HIGHLIGHTS):
        document = documents[sample.file]
        start = document.content.find(sample.quote)
        if start < 0:
            raise ValueError(f"Sample quote not found in {sample.file}: {sample.quote!r}")
        created = document.created_at + timedelta(hours=1 + index)
        db.add(
            Highlight(
                document_id=document.id,
                owner_id=user.id,
                start_offset=start,
                end_offset=start + len(sample.quote),
                quote=sample.quote,
                color=sample.color,
                note=sample.note,
                tags=get_or_create_tags(db, user, sample.tags),
                created_at=created,
                updated_at=created,
            )
        )
        db.flush()  # so the next highlight sees tags created by this one

    for name, description, files in COLLECTIONS:
        db.add(
            Collection(
                owner_id=user.id,
                name=name,
                description=description,
                documents=[documents[file] for file in files],
            )
        )

    db.commit()
    return True
