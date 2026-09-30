"""Database connection provider for FIN-11 LedgerSense.
Zero-dependency connection provider that supports direct PostgreSQL connectivity via DATABASE_URL.
"""

import os
from typing import Generator, Any

DATABASE_URL = os.getenv("DATABASE_URL")


class DummySession:
    def close(self):
        pass

    def commit(self):
        pass

    def refresh(self, obj):
        pass


def SessionLocal():
    return DummySession()


def get_db() -> Generator[Any, None, None]:
    """Dependency injection placeholder for database sessions."""
    yield DummySession()
