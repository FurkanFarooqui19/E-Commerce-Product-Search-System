"""
tests/integration/test_evaluation_api.py — Integration tests for Evaluation API endpoints.

Covers (DEVELOPMENT_PLAN.md §3.6):
  10. POST /api/v1/evaluate returns requested metrics for all modes.
  11. Precision@K is present and between 0 and 1.
  12. Recall@K is present and between 0 and 1.
  13. MRR is present and between 0 and 1.
  14. NDCG@K is present and between 0 and 1.
  15. GET /api/v1/evaluate/query-sets returns available query sets.
"""

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


@pytest.mark.integration
def test_evaluate_endpoint_with_inline_queries(client):
    """
    10-14. POST /api/v1/evaluate with inline queries returns P@K, R@K, MRR, NDCG@K
    for each requested mode, all bounded in [0, 1].
    """
    payload = {
        "queries": [
            {
                "query_text": "wireless headphones",
                "relevant_product_ids": [1, 2, 3],
                "graded_judgments": [
                    {"product_id": 1, "relevance": 3},
                    {"product_id": 2, "relevance": 2},
                    {"product_id": 3, "relevance": 1},
                ],
            },
            {
                "query_text": "laptop",
                "relevant_product_ids": [10, 11],
                "graded_judgments": [
                    {"product_id": 10, "relevance": 3},
                    {"product_id": 11, "relevance": 2},
                ],
            },
        ],
        "modes": ["keyword", "tfidf", "bm25"],
        "k": 10,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "evaluation_report" in data
    report = data["evaluation_report"]
    assert report["k"] == 10
    assert report["total_queries"] == 2
    assert "winner" in report
    assert "modes" in report

    for mode in ["keyword", "tfidf", "bm25"]:
        assert mode in report["modes"]
        m_data = report["modes"][mode]
        # Check metric bounds
        assert 0.0 <= m_data["precision_at_k"] <= 1.0
        assert 0.0 <= m_data["recall_at_k"] <= 1.0
        assert 0.0 <= m_data["mrr"] <= 1.0
        assert 0.0 <= m_data["ndcg_at_k"] <= 1.0
        assert m_data["avg_latency_ms"] >= 0.0
        assert len(m_data["per_query"]) == 2


@pytest.mark.integration
def test_evaluate_endpoint_with_stored_query_set(client):
    """POST /api/v1/evaluate using stored query_set_id."""
    payload = {
        "query_set_id": 1,
        "modes": ["keyword", "bm25"],
        "k": 5,
    }

    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    report = data["evaluation_report"]
    assert report["total_queries"] > 0
    assert "bm25" in report["modes"]
    assert "keyword" in report["modes"]
    assert report["k"] == 5


@pytest.mark.integration
def test_evaluate_query_sets_list(client):
    """GET /api/v1/evaluate/query-sets returns list of available query sets."""
    response = client.get("/api/v1/evaluate/query-sets")
    assert response.status_code == 200
    data = response.json()
    assert "query_sets" in data
    assert len(data["query_sets"]) > 0
    qs = data["query_sets"][0]
    assert "id" in qs
    assert "name" in qs
    assert "query_count" in qs
    assert qs["query_count"] > 0


@pytest.mark.integration
def test_evaluate_invalid_query_set_id_returns_404(client):
    """POST /api/v1/evaluate with invalid query_set_id returns 404 EVALUATION_SET_NOT_FOUND."""
    payload = {
        "query_set_id": 9999,
        "modes": ["bm25"],
        "k": 5,
    }
    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 404
    data = response.json()
    err = data.get("detail", {}).get("error", {})
    assert err.get("code") == "EVALUATION_SET_NOT_FOUND"
