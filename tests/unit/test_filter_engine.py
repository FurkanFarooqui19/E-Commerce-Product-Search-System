import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base
from app.models.product import Product, Category
from app.engine.filter_engine import FilterEngine


@pytest.fixture(scope="module")
def test_db():
    # Setup fresh in-memory SQLite DB
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)

    with Session(engine) as session:
        # Categories
        cat_e = Category(id=1, name="Electronics", slug="electronics")
        cat_c = Category(id=2, name="Clothing", slug="clothing")
        session.add_all([cat_e, cat_c])
        session.flush()

        # Products
        p1 = Product(
            id=1,
            name="Sony TV",
            price=50000.0,
            category_id=cat_e.id,
            is_active=True,
            brand="Sony",
            description="Smart TV",
        )
        p2 = Product(
            id=2,
            name="Nike Shirt",
            price=1500.0,
            category_id=cat_c.id,
            is_active=True,
            brand="Nike",
            description="Running Shirt",
        )
        p3 = Product(
            id=3,
            name="Cheap TV",
            price=10000.0,
            category_id=cat_e.id,
            is_active=True,
            brand="Generic",
            description="Small TV",
        )
        p4 = Product(
            id=4,
            name="Old Phone",
            price=5000.0,
            category_id=cat_e.id,
            is_active=False,
            brand="Sony",
            description="Inactive phone",
        )  # Inactive
        session.add_all([p1, p2, p3, p4])
        session.commit()

    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(test_db):
    with Session(test_db) as session:
        yield session


@pytest.mark.unit
def test_filter_engine_no_filters(db_session):
    # No filters should return all ACTIVE product IDs (1, 2, 3)
    results = FilterEngine.get_candidate_ids(None, None, None, db_session)
    assert set(results) == {1, 2, 3}


@pytest.mark.unit
def test_filter_engine_category(db_session):
    # Category filter (partial, case-insensitive)
    results = FilterEngine.get_candidate_ids("elect", None, None, db_session)
    assert set(results) == {1, 3}

    results = FilterEngine.get_candidate_ids("clothing", None, None, db_session)
    assert set(results) == {2}


@pytest.mark.unit
def test_filter_engine_price_bounds(db_session):
    # Min price
    results = FilterEngine.get_candidate_ids(None, 10000.0, None, db_session)
    assert set(results) == {1, 3}

    # Max price
    results = FilterEngine.get_candidate_ids(None, None, 1500.0, db_session)
    assert set(results) == {2}

    # Range (inclusive)
    results = FilterEngine.get_candidate_ids(None, 1500.0, 10000.0, db_session)
    assert set(results) == {2, 3}


@pytest.mark.unit
def test_filter_engine_combined(db_session):
    results = FilterEngine.get_candidate_ids("elect", 1500.0, 15000.0, db_session)
    assert set(results) == {3}


@pytest.mark.unit
def test_filter_engine_empty_results(db_session):
    results = FilterEngine.get_candidate_ids("clothing", 50000.0, None, db_session)
    assert results == []
