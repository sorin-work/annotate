from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.db import Base, get_db
from app.main import create_app


@pytest.fixture
def engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine) -> Iterator[Session]:
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    yield session
    session.close()


@pytest.fixture
def client(engine) -> Iterator[TestClient]:
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db() -> Iterator[Session]:
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client


def register(client: TestClient, email: str = "reader@example.com") -> dict[str, str]:
    response = client.post(
        "/api/auth/register", json={"email": email, "password": "correct-horse-battery"}
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def auth(client: TestClient) -> dict[str, str]:
    return register(client)


@pytest.fixture
def other_auth(client: TestClient) -> dict[str, str]:
    return register(client, "someone-else@example.com")


SAMPLE_TEXT = (
    "The quick brown fox jumps over the lazy dog.\n\n"
    "A second paragraph talks about reading slowly and taking notes.\n"
)


@pytest.fixture
def document(client: TestClient, auth: dict[str, str]) -> dict:
    response = client.post(
        "/api/documents",
        json={"title": "Sample", "content": SAMPLE_TEXT, "author": "A. Writer"},
        headers=auth,
    )
    assert response.status_code == 201, response.text
    return response.json()


def highlight(
    client: TestClient, auth: dict[str, str], document: dict, quote: str, **extra
) -> dict:
    start = document["content"].index(quote)
    response = client.post(
        f"/api/documents/{document['id']}/highlights",
        json={"start_offset": start, "end_offset": start + len(quote), **extra},
        headers=auth,
    )
    assert response.status_code == 201, response.text
    return response.json()
