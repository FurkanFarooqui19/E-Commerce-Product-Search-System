"""
tests/integration/test_search_api.py — Integration tests for Search API endpoints.

Covers (DEVELOPMENT_PLAN.md §3.6):
  1. GET /api/v1/search?q=headphones returns 200 with valid schema.
  2. keyword, tfidf and bm25 modes work.
  3. Different ranking modes produce appropriate scores/results.
  4. Category filter reduces the candidate/result set.
  5. Price filtering ensures every returned product is within the requested range.
  6. Pagination metadata is correct.
  7. Empty query returns 400.
  8. Invalid mode returns 400.
  9. GET /api/v1/search/compare returns results for all requested modes.
"""

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.services.index_service import IndexService


@pytest.fixture(scope="module")
def client():
    # Ensure index is loaded
    with SessionLocal() as db:
        IndexService.load_index(db)
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.integration
def test_search_headphones_returns_200(client):
    """1. GET /api/v1/search?q=headphones returns 200 with valid search schema."""
    response = client.get("/api/v1/search?q=headphones")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "query" in data
    assert "pagination" in data
    assert "metadata" in data
    assert data["query"]["raw"] == "headphones"
    assert data["query"]["mode"] == "bm25"
    assert "headphon" in data["query"]["processed_tokens"]

    # Also verify search for catalog term returns products
    res_catalog = client.get("/api/v1/search?q=Electronics")
    assert res_catalog.status_code == 200
    catalog_data = res_catalog.json()
    assert len(catalog_data["results"]) > 0
    first = catalog_data["results"][0]
    assert "rank" in first
    assert "score" in first
    assert "product" in first
    assert first["product"]["name"] is not None


@pytest.mark.integration
def test_search_headphones_regression_all_modes(client):
    """Regression: headphones query should return relevant non-fallback results in all ranking modes."""
    relevance_terms = ("headphone", "earbud", "headset")

    for mode in ["keyword", "tfidf", "bm25"]:
        response = client.get(f"/api/v1/search?q=headphones&mode={mode}&page=1&page_size=10")
        assert response.status_code == 200

        data = response.json()
        assert data["query"]["mode"] == mode
        assert data["pagination"]["total_results"] > 0
        assert data["metadata"]["fallback_applied"] is False

        # Ensure returned products are relevant to headphones intent.
        combined_text = [
            (item["product"]["name"] + " " + item["product"]["description"]).lower()
            for item in data["results"]
        ]
        assert any(any(term in text for term in relevance_terms) for text in combined_text)


@pytest.mark.integration
def test_search_modes_work(client):
    """2. keyword, tfidf and bm25 modes work and return 200."""
    for mode in ["keyword", "tfidf", "bm25"]:
        response = client.get(f"/api/v1/search?q=Electronics&mode={mode}")
        assert response.status_code == 200
        data = response.json()
        assert data["query"]["mode"] == mode
        assert len(data["results"]) > 0


@pytest.mark.integration
def test_different_modes_produce_appropriate_scores(client):
    """3. Different ranking modes produce appropriate scores and structures."""
    res_kw = client.get("/api/v1/search?q=Sony+Electronics&mode=keyword").json()
    res_tfidf = client.get("/api/v1/search?q=Sony+Electronics&mode=tfidf").json()
    res_bm25 = client.get("/api/v1/search?q=Sony+Electronics&mode=bm25").json()

    # Scores should be normalized floats in [0, 1]
    for res in [res_kw, res_tfidf, res_bm25]:
        assert len(res["results"]) > 0
        for item in res["results"]:
            assert 0.0 <= item["score"] <= 1.0


@pytest.mark.integration
def test_category_filter_reduces_results(client):
    """4. Category filter reduces the candidate/result set."""
    unfiltered = client.get("/api/v1/search?q=Item").json()
    filtered = client.get("/api/v1/search?q=Item&category=Electronics").json()

    assert unfiltered["pagination"]["total_results"] >= filtered["pagination"]["total_results"]
    for item in filtered["results"]:
        assert "Electronics" in item["product"]["category"]


@pytest.mark.integration
def test_price_filtering_bounds(client):
    """5. Price filtering ensures every returned product is within the requested range."""
    min_p, max_p = 10000.0, 30000.0
    response = client.get(f"/api/v1/search?q=Electronics&min_price={min_p}&max_price={max_p}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) > 0
    for item in data["results"]:
        price = item["product"]["price"]
        assert min_p <= price <= max_p


@pytest.mark.integration
def test_pagination_metadata_is_correct(client):
    """6. Pagination metadata is correct (page, page_size, total_results, etc.)."""
    page_size = 5
    page_1 = client.get(f"/api/v1/search?q=Electronics&page=1&page_size={page_size}").json()
    pag = page_1["pagination"]

    assert pag["page"] == 1
    assert pag["page_size"] == page_size
    assert pag["total_results"] >= len(page_1["results"])
    assert pag["has_prev"] is False
    if pag["total_pages"] > 1:
        assert pag["has_next"] is True

        page_2 = client.get(f"/api/v1/search?q=Electronics&page=2&page_size={page_size}").json()
        assert page_2["pagination"]["page"] == 2
        assert page_2["pagination"]["has_prev"] is True


@pytest.mark.integration
def test_empty_query_returns_400(client):
    """7. Empty query returns 400."""
    response = client.get("/api/v1/search?q=")
    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "MISSING_QUERY"

    response_whitespace = client.get("/api/v1/search?q=   ")
    assert response_whitespace.status_code == 400
    assert response_whitespace.json()["detail"]["error"]["code"] == "MISSING_QUERY"


@pytest.mark.integration
def test_invalid_mode_returns_400(client):
    """8. Invalid mode returns 400."""
    response = client.get("/api/v1/search?q=Electronics&mode=supersearch")
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    err = data["detail"].get("error", {})
    assert err.get("code") == "INVALID_MODE"


@pytest.mark.integration
def test_invalid_page_and_page_size_returns_400(client):
    """page < 1 and page_size outside [1, 100] return 400."""
    res_page_0 = client.get("/api/v1/search?q=Electronics&page=0")
    assert res_page_0.status_code == 400
    assert res_page_0.json()["detail"]["error"]["code"] == "INVALID_PAGE"

    res_size_0 = client.get("/api/v1/search?q=Electronics&page_size=0")
    assert res_size_0.status_code == 400
    assert res_size_0.json()["detail"]["error"]["code"] == "INVALID_PAGE_SIZE"

    res_size_101 = client.get("/api/v1/search?q=Electronics&page_size=101")
    assert res_size_101.status_code == 400
    assert res_size_101.json()["detail"]["error"]["code"] == "INVALID_PAGE_SIZE"


@pytest.mark.integration
def test_search_compare_returns_results(client):
    """9. GET /api/v1/search/compare returns results for all requested modes."""
    response = client.get("/api/v1/search/compare?q=Sony&modes=keyword,tfidf,bm25&top_k=5")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "Sony"
    assert "results" in data
    assert "keyword" in data["results"]
    assert "tfidf" in data["results"]
    assert "bm25" in data["results"]
    assert len(data["results"]["keyword"]) > 0
    assert len(data["results"]["tfidf"]) > 0
    assert len(data["results"]["bm25"]) > 0
    assert "latency_ms" in data
    assert "keyword" in data["latency_ms"]
    assert "tfidf" in data["latency_ms"]
    assert "bm25" in data["latency_ms"]


@pytest.mark.integration
def test_search_compare_validation_errors(client):
    """Whitespace query and invalid price range return 400 in /search/compare."""
    res_empty = client.get("/api/v1/search/compare?q=   ")
    assert res_empty.status_code == 400
    assert res_empty.json()["detail"]["error"]["code"] == "MISSING_QUERY"

    res_price = client.get("/api/v1/search/compare?q=Sony&min_price=5000&max_price=1000")
    assert res_price.status_code == 400
    assert res_price.json()["detail"]["error"]["code"] == "INVALID_PRICE_RANGE"


# ─────────────────────────────────────────────────────────────────────────────
#  Query Suggestions / Autocomplete (DEVELOPMENT_PLAN.md §4.4)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.integration
def test_search_suggest_wire(client):
    """
    DEVELOPMENT_PLAN.md §4.4:
    GET /api/v1/search/suggest?q=wire returns top 5 matching product name prefixes.
    """
    response = client.get("/api/v1/search/suggest?q=wire")
    assert response.status_code == 200
    data = response.json()

    assert data["query"] == "wire"
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)
    assert len(data["suggestions"]) > 0
    assert "wireless" in data["suggestions"]
    assert data["total"] == len(data["suggestions"])


@pytest.mark.integration
def test_search_suggest_empty_query(client):
    """Empty query prefix returns 200 with empty suggestions."""
    response = client.get("/api/v1/search/suggest?q=")
    assert response.status_code == 200
    data = response.json()

    assert data["query"] == ""
    assert data["suggestions"] == []
    assert data["total"] == 0


@pytest.mark.integration
def test_search_suggest_limit_param(client):
    """limit parameter restricts the number of returned suggestions."""
    response = client.get("/api/v1/search/suggest?q=s&limit=2")
    assert response.status_code == 200
    data = response.json()

    assert len(data["suggestions"]) <= 2
    assert data["total"] == len(data["suggestions"])


@pytest.mark.integration
def test_search_suggest_no_matches(client):
    """Query with no vocabulary match returns empty list."""
    response = client.get("/api/v1/search/suggest?q=nonexistentprefix999")
    assert response.status_code == 200
    data = response.json()

    assert data["suggestions"] == []
    assert data["total"] == 0

