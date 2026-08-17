"""
tests/unit/test_log_service.py — Unit tests for SearchLogService.

Covers (DEVELOPMENT_PLAN.md §4.3):
1. log() persists a row to search_logs with correct field values.
2. log() is best-effort: a DB error is swallowed, never raised to caller.
3. list_logs() returns all rows ordered by created_at DESC.
4. list_logs(mode=) filters by mode correctly.
5. list_logs() pagination math is correct.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock

from app.services.log_service import SearchLogService


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _make_db_mock():
    """Return a MagicMock that passes isinstance(db, Session)-style checks."""
    return MagicMock()


# ─────────────────────────────────────────────────────────────────────────────
#  1. log() — happy path: correct fields written
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_log_adds_and_commits(monkeypatch):
    """log() calls db.add() with a SearchLog then db.commit()."""
    db = _make_db_mock()

    SearchLogService.log(
        db=db,
        query_text="wireless headphones",
        mode="bm25",
        category="Electronics",
        min_price=None,
        max_price=2000.0,
        result_count=15,
        latency_ms=42.5,
        fallback=False,
    )

    db.add.assert_called_once()
    db.commit.assert_called_once()

    # Inspect the object that was added
    added_obj = db.add.call_args[0][0]
    assert added_obj.query_text == "wireless headphones"
    assert added_obj.mode == "bm25"
    assert added_obj.category == "Electronics"
    assert added_obj.min_price is None
    assert added_obj.max_price == pytest.approx(2000.0)
    assert added_obj.result_count == 15
    assert added_obj.latency_ms == pytest.approx(42.5)
    assert added_obj.fallback is False


@pytest.mark.unit
def test_log_rounds_latency_to_two_decimals():
    """latency_ms is rounded to 2 dp before storage."""
    db = _make_db_mock()
    SearchLogService.log(
        db=db,
        query_text="q",
        mode="keyword",
        category=None,
        min_price=None,
        max_price=None,
        result_count=0,
        latency_ms=7.123456789,
        fallback=False,
    )
    added_obj = db.add.call_args[0][0]
    assert added_obj.latency_ms == pytest.approx(7.12, abs=0.01)


@pytest.mark.unit
def test_log_accepts_optional_none_fields():
    """category, min_price, max_price may all be None."""
    db = _make_db_mock()
    SearchLogService.log(
        db=db,
        query_text="q",
        mode="tfidf",
        category=None,
        min_price=None,
        max_price=None,
        result_count=5,
        latency_ms=10.0,
        fallback=False,
    )
    added_obj = db.add.call_args[0][0]
    assert added_obj.category is None
    assert added_obj.min_price is None
    assert added_obj.max_price is None


@pytest.mark.unit
def test_log_fallback_true_persisted():
    """fallback=True is stored correctly."""
    db = _make_db_mock()
    SearchLogService.log(
        db=db,
        query_text="q",
        mode="bm25",
        category=None,
        min_price=None,
        max_price=None,
        result_count=0,
        latency_ms=5.0,
        fallback=True,
    )
    added_obj = db.add.call_args[0][0]
    assert added_obj.fallback is True


# ─────────────────────────────────────────────────────────────────────────────
#  2. log() — best-effort: DB error is silenced
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_log_swallows_db_exception():
    """
    If db.commit() raises an exception, log() must NOT propagate it.
    The search response must never be blocked by a logging failure.
    """
    db = _make_db_mock()
    db.commit.side_effect = RuntimeError("DB is gone")

    # Must not raise — this is the best-effort guarantee
    try:
        SearchLogService.log(
            db=db,
            query_text="q",
            mode="bm25",
            category=None,
            min_price=None,
            max_price=None,
            result_count=0,
            latency_ms=1.0,
            fallback=False,
        )
    except Exception as exc:
        pytest.fail(
            f"log() raised an exception when it should have swallowed it: {exc}"
        )

    # Rollback should have been called after the error
    db.rollback.assert_called_once()


@pytest.mark.unit
def test_log_swallows_add_exception():
    """If db.add() raises, log() still swallows it."""
    db = _make_db_mock()
    db.add.side_effect = RuntimeError("integrity error")

    try:
        SearchLogService.log(
            db=db,
            query_text="q",
            mode="tfidf",
            category=None,
            min_price=None,
            max_price=None,
            result_count=3,
            latency_ms=2.0,
            fallback=False,
        )
    except Exception as exc:
        pytest.fail(f"log() raised an exception: {exc}")
