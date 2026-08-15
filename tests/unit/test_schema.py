"""
tests/unit/test_schema.py — Phase 1 unit test.

Verifies:
  - All 5 tables (+ search_logs = 6 total) are created without errors on a
    fresh in-memory SQLite database.
  - All expected tables are present.
  - ORM models can be instantiated without error.
  - config.py exposes all required constants.

Per DEVELOPMENT_PLAN.md §1.2:
  "Write unit test: schema creates without errors on fresh SQLite."
"""

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.database import Base
import app.models  # noqa: F401 — registers all models on Base.metadata


# ─────────────────────────────────────────────────────────────────────────────
#  Fixtures
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def in_memory_engine():
    """Create a fresh in-memory SQLite engine and build all tables."""
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    yield eng
    eng.dispose()


@pytest.fixture(scope="module")
def db_session(in_memory_engine):
    """Provide a SQLAlchemy session bound to the in-memory engine."""
    with Session(in_memory_engine) as session:
        yield session


# ─────────────────────────────────────────────────────────────────────────────
#  Tests
# ─────────────────────────────────────────────────────────────────────────────
EXPECTED_TABLES = {
    "categories",
    "products",
    "product_specifications",
    "evaluation_queries",
    "relevance_judgments",
    "search_logs",
}


@pytest.mark.unit
def test_all_tables_created(in_memory_engine):
    """All tables defined in DATABASE.md §3 must exist after create_all."""
    inspector = inspect(in_memory_engine)
    actual_tables = set(inspector.get_table_names())
    assert EXPECTED_TABLES.issubset(actual_tables), (
        f"Missing tables: {EXPECTED_TABLES - actual_tables}"
    )


@pytest.mark.unit
def test_categories_columns(in_memory_engine):
    """categories table has all expected columns."""
    inspector = inspect(in_memory_engine)
    col_names = {c["name"] for c in inspector.get_columns("categories")}
    assert {"id", "name", "slug", "description", "parent_id", "created_at"}.issubset(col_names)


@pytest.mark.unit
def test_products_columns(in_memory_engine):
    """products table has all expected columns."""
    inspector = inspect(in_memory_engine)
    col_names = {c["name"] for c in inspector.get_columns("products")}
    assert {
        "id", "category_id", "name", "description", "brand",
        "price", "stock", "rating", "image_url", "is_active",
        "created_at", "updated_at",
    }.issubset(col_names)


@pytest.mark.unit
def test_product_specifications_columns(in_memory_engine):
    """product_specifications table has all expected columns."""
    inspector = inspect(in_memory_engine)
    col_names = {c["name"] for c in inspector.get_columns("product_specifications")}
    assert {"id", "product_id", "spec_key", "spec_value"}.issubset(col_names)


@pytest.mark.unit
def test_evaluation_queries_columns(in_memory_engine):
    """evaluation_queries table has all expected columns."""
    inspector = inspect(in_memory_engine)
    col_names = {c["name"] for c in inspector.get_columns("evaluation_queries")}
    assert {"id", "query_text", "category", "min_price", "max_price", "notes", "created_at"}.issubset(col_names)


@pytest.mark.unit
def test_relevance_judgments_columns(in_memory_engine):
    """relevance_judgments table has all expected columns."""
    inspector = inspect(in_memory_engine)
    col_names = {c["name"] for c in inspector.get_columns("relevance_judgments")}
    assert {"id", "query_id", "product_id", "relevance"}.issubset(col_names)


@pytest.mark.unit
def test_insert_category_and_product(db_session):
    """ORM models can be instantiated and saved (round-trip smoke test)."""
    from app.models.product import Category, Product, ProductSpecification

    cat = Category(name="Test Electronics", slug="test-electronics", description="Test category")
    db_session.add(cat)
    db_session.flush()  # get auto-assigned id without committing

    prod = Product(
        category_id=cat.id,
        name="Test Wireless Headphones",
        description="High-quality wireless headphones with active noise cancellation and 30h battery life.",
        brand="TestBrand",
        price=4999.00,
        stock=10,
        rating=4.5,
        is_active=True,
    )
    db_session.add(prod)
    db_session.flush()

    spec = ProductSpecification(
        product_id=prod.id,
        spec_key="connectivity",
        spec_value="Bluetooth 5.2",
    )
    db_session.add(spec)
    db_session.flush()

    # Verify
    assert cat.id is not None
    assert prod.id is not None
    assert spec.id is not None
    assert prod.specs_as_text() == "connectivity Bluetooth 5.2"
    db_session.rollback()


@pytest.mark.unit
def test_insert_evaluation_query_and_judgment(db_session):
    """EvaluationQuery and RelevanceJudgment can be created (smoke test)."""
    from app.models.product import Category, Product
    from app.models.evaluation import EvaluationQuery, RelevanceJudgment

    # Insert prerequisite rows
    cat = Category(name="EvalCat", slug="eval-cat")
    db_session.add(cat)
    db_session.flush()

    prod = Product(
        category_id=cat.id,
        name="Eval Product",
        description="A product used only for evaluation testing purposes in unit tests.",
        brand="EvalBrand",
        price=999.0,
        stock=5,
        is_active=True,
    )
    db_session.add(prod)
    db_session.flush()

    eq = EvaluationQuery(query_text="wireless headphones", max_price=5000.0)
    db_session.add(eq)
    db_session.flush()

    rj = RelevanceJudgment(query_id=eq.id, product_id=prod.id, relevance=3)
    db_session.add(rj)
    db_session.flush()

    assert eq.id is not None
    assert rj.relevance == 3
    db_session.rollback()


@pytest.mark.unit
def test_config_required_constants():
    """config.py must expose all required constants with correct types."""
    from app import config

    assert isinstance(config.DATABASE_URL, str)
    assert isinstance(config.BM25_K1, float)
    assert isinstance(config.BM25_B, float)
    assert isinstance(config.HYBRID_ALPHA, float)
    assert isinstance(config.FIELD_WEIGHTS, dict)
    assert isinstance(config.DEFAULT_SEARCH_MODE, str)
    assert isinstance(config.VALID_SEARCH_MODES, tuple)
    assert isinstance(config.DEFAULT_PAGE_SIZE, int)
    assert isinstance(config.MAX_PAGE_SIZE, int)
    assert isinstance(config.CUSTOM_STOPWORDS, tuple)

    # Values must match spec defaults (SEARCH_ENGINE_SPEC.md §13)
    assert config.BM25_K1 == 1.5
    assert config.BM25_B == 0.75
    assert config.DEFAULT_SEARCH_MODE == "bm25"
    assert config.DEFAULT_PAGE_SIZE == 10
    assert config.MAX_PAGE_SIZE == 100
    assert config.FIELD_WEIGHTS["name"] == 3.0
    assert config.FIELD_WEIGHTS["category"] == 2.0
    assert config.FIELD_WEIGHTS["description"] == 1.5
    assert config.FIELD_WEIGHTS["specifications"] == 1.0
    assert "bm25" in config.VALID_SEARCH_MODES
    assert "tfidf" in config.VALID_SEARCH_MODES
    assert "keyword" in config.VALID_SEARCH_MODES


@pytest.mark.unit
def test_config_custom_stopwords_are_present():
    """All domain-specific stopwords listed in SEARCH_ENGINE_SPEC.md §2.2 are present."""
    from app import config

    required = {"best", "good", "great", "top", "cheap", "affordable"}
    assert required.issubset(set(config.CUSTOM_STOPWORDS))
