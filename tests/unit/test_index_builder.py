import pickle
import pytest
from app.models.product import Product, Category, ProductSpecification
from app.engine.index_builder import IndexBuilder


@pytest.fixture
def mock_products():
    cat = Category(id=1, name="Electronics", slug="electronics")

    p1 = Product(
        id=101,
        name="Sony Headphones",
        description="Wireless noise cancelling noise headphones",
        category_id=cat.id,
        category=cat,
        specifications=[
            ProductSpecification(spec_key="color", spec_value="black"),
            ProductSpecification(spec_key="connectivity", spec_value="bluetooth"),
        ],
    )

    p2 = Product(
        id=102,
        name="Dell Laptop",
        description="Powerful laptop with 16GB RAM and SSD specs",
        category_id=cat.id,
        category=cat,
        specifications=[
            ProductSpecification(spec_key="ram", spec_value="16GB"),
            ProductSpecification(spec_key="color", spec_value="silver"),
        ],
    )

    return [p1, p2]


@pytest.mark.unit
def test_index_builder_postings_and_freq(mock_products):
    builder = IndexBuilder()
    index, stats = builder.build(mock_products)

    # 'headphones' is in product 101 name and description
    assert "headphon" in index
    assert index["headphon"].doc_freq == 1
    assert 101 in index["headphon"].postings

    # 'laptop' is in product 102
    assert "laptop" in index
    assert index["laptop"].doc_freq == 1
    assert 102 in index["laptop"].postings

    # 'color' is in spec of both products (101 color black, 102 color silver)
    # The term color is in specifications, so it stems to 'color'.
    assert "color" in index
    assert index["color"].doc_freq == 2
    assert 101 in index["color"].postings
    assert 102 in index["color"].postings


@pytest.mark.unit
def test_index_builder_corpus_stats(mock_products):
    builder = IndexBuilder()
    index, stats = builder.build(mock_products)

    assert stats.total_documents == 2
    assert stats.avg_doc_length == (stats.doc_lengths[101] + stats.doc_lengths[102]) / 2

    # Field lengths verified
    assert 101 in stats.field_lengths
    assert "name" in stats.field_lengths[101]
    assert "description" in stats.field_lengths[101]
    assert "category" in stats.field_lengths[101]
    assert "specs" in stats.field_lengths[101]


@pytest.mark.unit
def test_index_serialization(mock_products, tmp_path):
    builder = IndexBuilder()
    index, stats = builder.build(mock_products)

    pkl_file = tmp_path / "test_index.pkl"

    # Serialize
    with open(pkl_file, "wb") as f:
        pickle.dump((index, stats), f)

    # Deserialize
    with open(pkl_file, "rb") as f:
        loaded_index, loaded_stats = pickle.load(f)

    assert loaded_stats.total_documents == 2
    assert "headphon" in loaded_index
    assert loaded_index["headphon"].doc_freq == 1
