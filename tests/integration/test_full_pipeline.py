"""
tests/integration/test_full_pipeline.py — End-to-end full pipeline integration tests.

Covers:
  - Database seed data + live inverted index.
  - End-to-end search query pipeline.
  - Verification of expected product retrieval.
  - Product catalogue endpoints (GET /products, GET /products/{id}).
  - Category endpoints (GET /categories, GET /categories/{id}).
  - Health check endpoint (GET /health) verifying real index and DB status.
"""

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.services.index_service import IndexService


@pytest.fixture(scope="module")
def client():
    # Ensure index is built / loaded
    with SessionLocal() as db:
        IndexService.load_index(db)
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.integration
def test_full_pipeline_seed_and_search(client):
    """
    15-18. Seeded products are indexed and searchable.
    Query for 'Sony WH-1000XM5' or 'noise cancelling' returns relevant audio products.
    """
    response = client.get("/api/v1/search?q=Sony+Electronics&mode=bm25")
    assert response.status_code == 200
    data = response.json()

    assert data["metadata"]["total_candidates"] > 0
    assert len(data["results"]) > 0

    top_product = data["results"][0]["product"]
    # Check that top result is from Sony or an Electronics product
    assert "Sony" in top_product["brand"] or "Electronics" in top_product["category"]


@pytest.mark.integration
def test_product_endpoints(client):
    """Verify GET /products and GET /products/{id} work end-to-end."""
    # List products
    res_list = client.get("/api/v1/products?page=1&page_size=5")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert len(list_data["products"]) == 5
    assert list_data["pagination"]["total_results"] >= 500

    first_id = list_data["products"][0]["id"]

    # Single product
    res_single = client.get(f"/api/v1/products/{first_id}")
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["product"]["id"] == first_id

    # 404 for nonexistent product
    res_404 = client.get("/api/v1/products/9999999")
    assert res_404.status_code == 404


@pytest.mark.integration
def test_category_endpoints(client):
    """Verify GET /categories and GET /categories/{id} work end-to-end."""
    res_list = client.get("/api/v1/categories")
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["total"] >= 8
    assert len(data["categories"]) >= 8

    cat_id = data["categories"][0]["id"]
    res_single = client.get(f"/api/v1/categories/{cat_id}")
    assert res_single.status_code == 200
    assert res_single.json()["category"]["id"] == cat_id

    # 404 for nonexistent category
    res_404 = client.get("/api/v1/categories/9999999")
    assert res_404.status_code == 404


@pytest.mark.integration
def test_health_endpoint_real_status(client):
    """Verify GET /api/v1/health reports real index and DB counts."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["index"]["ready"] is True
    assert data["index"]["document_count"] >= 500
    assert data["index"]["vocabulary_size"] > 0
    assert data["database"]["connected"] is True
    assert data["database"]["product_count"] >= 500


@pytest.mark.integration
def test_health_endpoint_degraded_when_index_not_ready(client):
    """Verify GET /api/v1/health returns 503 when index is not ready."""
    from app.models.index import IndexStore
    store = IndexStore()
    store.is_ready = False
    try:
        response = client.get("/api/v1/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["index"]["ready"] is False
    finally:
        store.is_ready = True

