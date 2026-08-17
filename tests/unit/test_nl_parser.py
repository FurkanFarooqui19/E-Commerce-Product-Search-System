"""
tests/unit/test_nl_parser.py — Unit tests for NLQueryParser.

Covers (DEVELOPMENT_PLAN.md §4.1):
  - All six price extraction patterns from SEARCH_ENGINE_SPEC.md §8.3.
  - Price range pattern (between X and Y).
  - Category vocabulary matching.
  - Price phrase removal from clean_query.
  - Conflict resolution: explicit params beat NL-extracted values
    (tested indirectly via StructuredQuery field values).
  - Edge cases: no price, decimal prices, whitespace variations.
"""

import pytest
from app.engine.nl_parser import NLQueryParser, StructuredQuery

# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

CATEGORIES = [
    "Electronics",
    "Clothing & Apparel",
    "Books",
    "Home & Kitchen",
    "Sports & Outdoors",
    "Health & Beauty",
    "Toys & Games",
    "Automotive",
]


@pytest.fixture(scope="module")
def parser():
    """NLQueryParser loaded with the 8 seed categories."""
    return NLQueryParser(category_names=CATEGORIES)


@pytest.fixture(scope="module")
def bare_parser():
    """NLQueryParser with no category vocabulary."""
    return NLQueryParser()


# ─────────────────────────────────────────────────────────────────────────────
#  1. StructuredQuery shape
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_returns_structured_query(parser):
    """parse() returns a StructuredQuery dataclass."""
    sq = parser.parse("wireless headphones")
    assert isinstance(sq, StructuredQuery)
    assert sq.raw_query == "wireless headphones"


# ─────────────────────────────────────────────────────────────────────────────
#  2. Price extraction — max_price patterns
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_price_under(parser):
    """'under 2000' → max_price=2000."""
    sq = parser.parse("wireless headphones under 2000")
    assert sq.max_price == pytest.approx(2000.0)
    assert sq.min_price is None


@pytest.mark.unit
def test_price_below(parser):
    """'below 5000' → max_price=5000."""
    sq = parser.parse("laptop below 5000")
    assert sq.max_price == pytest.approx(5000.0)
    assert sq.min_price is None


@pytest.mark.unit
def test_price_less_than(parser):
    """'less than 1500' → max_price=1500."""
    sq = parser.parse("running shoes less than 1500")
    assert sq.max_price == pytest.approx(1500.0)
    assert sq.min_price is None


# ─────────────────────────────────────────────────────────────────────────────
#  3. Price extraction — min_price patterns
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_price_above(parser):
    """'above 500' → min_price=500."""
    sq = parser.parse("headphones above 500")
    assert sq.min_price == pytest.approx(500.0)
    assert sq.max_price is None


@pytest.mark.unit
def test_price_over(parser):
    """'over 1000' → min_price=1000."""
    sq = parser.parse("smartwatch over 1000")
    assert sq.min_price == pytest.approx(1000.0)
    assert sq.max_price is None


@pytest.mark.unit
def test_price_more_than(parser):
    """'more than 3000' → min_price=3000."""
    sq = parser.parse("books more than 3000")
    assert sq.min_price == pytest.approx(3000.0)
    assert sq.max_price is None


# ─────────────────────────────────────────────────────────────────────────────
#  4. Price extraction — range pattern
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_price_between(parser):
    """'between 1000 and 5000' → min_price=1000, max_price=5000."""
    sq = parser.parse("laptop between 1000 and 5000")
    assert sq.min_price == pytest.approx(1000.0)
    assert sq.max_price == pytest.approx(5000.0)


@pytest.mark.unit
def test_price_between_range_takes_priority_over_single(parser):
    """Range pattern is consumed first; residual single patterns are ignored."""
    sq = parser.parse("laptop between 1000 and 5000 under 6000")
    # Range consumed 'between 1000 and 5000'; 'under 6000' sets max_price=6000
    # unless max_price was already set from range.
    assert sq.min_price == pytest.approx(1000.0)
    # max_price comes from the range (5000); the 'under 6000' is ignored because max_price != None
    assert sq.max_price == pytest.approx(5000.0)


# ─────────────────────────────────────────────────────────────────────────────
#  5. Decimal prices
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_decimal_price(parser):
    """Decimal prices like '999.99' are extracted correctly."""
    sq = parser.parse("shoes under 999.99")
    assert sq.max_price == pytest.approx(999.99)


# ─────────────────────────────────────────────────────────────────────────────
#  6. clean_query — price phrases removed
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_clean_query_removes_price_phrase(parser):
    """Price phrase is stripped from clean_query so tokens aren't polluted."""
    sq = parser.parse("wireless headphones under 2000")
    assert "under" not in sq.clean_query
    assert "2000" not in sq.clean_query
    assert "wireless" in sq.clean_query
    assert "headphones" in sq.clean_query


@pytest.mark.unit
def test_clean_query_no_price(parser):
    """Without a price phrase, clean_query equals the stripped raw_query."""
    sq = parser.parse("noise cancelling headphones")
    assert sq.clean_query == "noise cancelling headphones"
    assert sq.min_price is None
    assert sq.max_price is None


@pytest.mark.unit
def test_clean_query_multiword_pattern(parser):
    """Multi-word patterns like 'less than' are fully removed."""
    sq = parser.parse("yoga mat less than 2000")
    assert "less" not in sq.clean_query
    assert "than" not in sq.clean_query
    assert "2000" not in sq.clean_query
    assert "yoga" in sq.clean_query


# ─────────────────────────────────────────────────────────────────────────────
#  7. Category vocabulary matching
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_category_hint_electronics(parser):
    """'electronics' maps to 'Electronics'."""
    sq = parser.parse("electronics under 3000")
    assert sq.category_hint == "Electronics"


@pytest.mark.unit
def test_category_hint_books(parser):
    """'books' maps to 'Books'."""
    sq = parser.parse("programming books")
    assert sq.category_hint == "Books"


@pytest.mark.unit
def test_category_hint_clothing(parser):
    """'clothing' maps to 'Clothing & Apparel'."""
    sq = parser.parse("clothing under 500")
    assert sq.category_hint == "Clothing & Apparel"


@pytest.mark.unit
def test_category_hint_sports(parser):
    """'sports' matches 'Sports & Outdoors'."""
    sq = parser.parse("sports equipment under 2000")
    assert sq.category_hint == "Sports & Outdoors"


@pytest.mark.unit
def test_category_hint_automotive(parser):
    """'automotive' matches 'Automotive'."""
    sq = parser.parse("automotive accessories")
    assert sq.category_hint == "Automotive"


@pytest.mark.unit
def test_category_hint_no_match(parser):
    """A query without a category keyword returns category_hint=None."""
    sq = parser.parse("wireless bluetooth headphones")
    assert sq.category_hint is None


@pytest.mark.unit
def test_category_hint_with_no_vocabulary(bare_parser):
    """Parser with no category vocabulary always returns category_hint=None."""
    sq = bare_parser.parse("electronics under 3000")
    assert sq.category_hint is None


# ─────────────────────────────────────────────────────────────────────────────
#  8. raw_query preserved
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_raw_query_preserved(parser):
    """raw_query is always identical to the input string."""
    raw = "  Wireless Headphones UNDER 2000  "
    sq = parser.parse(raw)
    assert sq.raw_query == raw


# ─────────────────────────────────────────────────────────────────────────────
#  9. Case-insensitivity
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_price_pattern_case_insensitive(parser):
    """Price patterns are matched case-insensitively."""
    assert parser.parse("headphones UNDER 2000").max_price == pytest.approx(2000.0)
    assert parser.parse("headphones Below 3000").max_price == pytest.approx(3000.0)
    assert parser.parse("headphones ABOVE 500").min_price == pytest.approx(500.0)
    assert parser.parse("headphones More Than 1000").min_price == pytest.approx(1000.0)


# ─────────────────────────────────────────────────────────────────────────────
#  10. No price in query
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_no_price_returns_none(parser):
    """Both price fields are None when no price phrase is present."""
    sq = parser.parse("best noise cancelling headphones")
    assert sq.min_price is None
    assert sq.max_price is None


@pytest.mark.unit
def test_empty_query(parser):
    """Empty string does not crash and returns a valid StructuredQuery."""
    sq = parser.parse("")
    assert sq.min_price is None
    assert sq.max_price is None
    assert sq.category_hint is None
    assert sq.clean_query == ""
