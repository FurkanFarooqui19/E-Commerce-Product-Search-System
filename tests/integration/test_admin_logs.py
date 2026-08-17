"""
tests/integration/test_admin_logs.py — Integration tests for Phase 4.3 search logging.

Covers (DEVELOPMENT_PLAN.md §4.3):
1. GET /api/v1/admin/logs returns 200 with correct response shape.
2. After a search request, the log entry is persisted and visible in /admin/logs.
3. mode filter works — only matching logs are returned.
4. Pagination metadata is correct.
5. Search response is NOT affected when logging would fail (best-effort guarantee
   is tested at unit level; here we just confirm search still returns 200).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.services.index_service import IndexService


@pytest.fixture(scope="module")
def client():
    with SessionLocal() as db:
        IndexService.load_index(db)
    with TestClient(app) as test_client:
        yield test_client


# ─────────────────────────────────────────────────────────────────────────────
#  1. GET /api/v1/admin/logs — basic shape
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_admin_logs_returns_200(client):
    """GET /api/v1/admin/logs returns 200 with expected schema."""
    response = client.get("/api/v1/admin/logs")
    assert response.status_code == 200
    data = response.json()

    assert "logs" in data
    assert "pagination" in data
    assert isinstance(data["logs"], list)

    pagination = data["pagination"]
    assert "page" in pagination
    assert "page_size" in pagination
    assert "total_results" in pagination
    assert "total_pages" in pagination
    assert "has_next" in pagination
    assert "has_prev" in pagination


# ─────────────────────────────────────────────────────────────────────────────
#  2. Search then verify log row appears in /admin/logs
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_search_persists_log_entry(client):
    """
    After a successful search, a corresponding log entry must appear
    in GET /admin/logs.  We check the most-recent entry.
    """
    unique_query = "bluetooth speakers integration test"

    # Perform a search
    search_resp = client.get(
        f"/api/v1/search?q={unique_query.replace(' ', '+')}&mode=bm25"
    )
    assert search_resp.status_code == 200

    # Fetch the log — entries are most-recent first
    logs_resp = client.get("/api/v1/admin/logs?page=1&page_size=5")
    assert logs_resp.status_code == 200
    data = logs_resp.json()

    assert data["pagination"]["total_results"] > 0, "At least one log row must exist after a search"

    # The most-recent entry must match the query we just ran
    latest = data["logs"][0]
    assert latest["query_text"] == unique_query
    assert latest["mode"] == "bm25"
    assert latest["result_count"] is not None
    assert latest["latency_ms"] > 0
    assert latest["created_at"] is not None


# ─────────────────────────────────────────────────────────────────────────────
#  3. Log entry fields match the search request parameters
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_log_entry_fields_match_search_request(client):
    """
    Logged values for mode, category, max_price must match the request params.
    """
    client.get("/api/v1/search?q=gaming+mouse&mode=keyword&category=Electronics&max_price=5000")

    logs_resp = client.get("/api/v1/admin/logs?page=1&page_size=5")
    latest = logs_resp.json()["logs"][0]

    assert latest["mode"] == "keyword"
    # NL-extracted max_price from "gaming mouse" is None; explicit max_price=5000
    assert latest["max_price"] == pytest.approx(5000.0)


# ─────────────────────────────────────────────────────────────────────────────
#  4. mode filter returns only matching logs
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_admin_logs_mode_filter(client):
    """
    GET /admin/logs?mode=tfidf returns only tfidf-mode log entries.
    """
    # Run a tfidf search to ensure at least one row
    client.get("/api/v1/search?q=smart+watch&mode=tfidf")

    resp = client.get("/api/v1/admin/logs?mode=tfidf&page=1&page_size=50")
    assert resp.status_code == 200
    data = resp.json()

    assert data["pagination"]["total_results"] >= 1
    for entry in data["logs"]:
        assert entry["mode"] == "tfidf", (
            f"mode filter returned entry with mode={entry['mode']!r}"
        )


# ─────────────────────────────────────────────────────────────────────────────
#  5. Pagination metadata is consistent
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_admin_logs_pagination(client):
    """page and page_size parameters are respected."""
    resp_p1 = client.get("/api/v1/admin/logs?page=1&page_size=2")
    assert resp_p1.status_code == 200
    data = resp_p1.json()

    assert len(data["logs"]) <= 2
    pag = data["pagination"]
    assert pag["page"] == 1
    assert pag["page_size"] == 2

    if pag["total_results"] > 2:
        assert pag["has_next"] is True
        # Page 2 should return different items
        resp_p2 = client.get("/api/v1/admin/logs?page=2&page_size=2")
        assert resp_p2.status_code == 200
        ids_p1 = {e["id"] for e in data["logs"]}
        ids_p2 = {e["id"] for e in resp_p2.json()["logs"]}
        assert ids_p1.isdisjoint(ids_p2), "Pages must not overlap"


# ─────────────────────────────────────────────────────────────────────────────
#  6. Search is unaffected even when viewed alongside logging
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_search_succeeds_independent_of_logging(client):
    """
    Search endpoint returns 200 and valid results.
    (Best-effort guarantee: even if logging failed, search must succeed.
    Here we just confirm both can coexist without error.)
    """
    resp = client.get("/api/v1/search?q=laptop&mode=hybrid")
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"]["mode"] == "hybrid"
    assert data["metadata"]["total_candidates"] >= 0
