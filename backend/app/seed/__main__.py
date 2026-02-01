import logging

from app.db import SessionLocal
from app.seed import DEMO_EMAIL, seed_demo

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("seed")


def main() -> None:
    with SessionLocal() as db:
        if seed_demo(db):
            log.info("Created demo user %s", DEMO_EMAIL)
        else:
            log.info("Demo user %s already exists, nothing to do", DEMO_EMAIL)


if __name__ == "__main__":
    main()
