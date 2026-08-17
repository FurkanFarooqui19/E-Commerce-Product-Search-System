"""
database.py — SQLAlchemy engine, session factory, and base model class.

Follows TECH_STACK.md §2.5 (SQLAlchemy 2.0) and DATABASE.md §1 (SQLite dev,
PostgreSQL prod). The DATABASE_URL is read from config.py, which reads from
the environment / .env file.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL

# ─────────────────────────────────────────────────────────────────────────────
#  Engine
# ─────────────────────────────────────────────────────────────────────────────
# check_same_thread=False is required for SQLite when used with FastAPI
# (multiple threads share the same connection in dev). This is safe because
# SQLAlchemy manages thread-local sessions.
_connect_args: dict = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    # Echo SQL in DEBUG mode (set in config / env)
    # echo=DEBUG,  # uncomment to log all SQL
)

# Enable WAL mode for SQLite to reduce concurrency issues under load
# (DEVELOPMENT_PLAN.md §10, Risk Register)
if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# ─────────────────────────────────────────────────────────────────────────────
#  Session factory
# ─────────────────────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ─────────────────────────────────────────────────────────────────────────────
#  Declarative base — all SQLAlchemy models inherit from this
# ─────────────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI dependency — yields a DB session, closes it on exit
# ─────────────────────────────────────────────────────────────────────────────
def get_db():
    """
    FastAPI dependency that provides a SQLAlchemy session per request.

    Usage::

        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
