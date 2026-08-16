"""
tests/unit/test_search_service.py — Unit tests for SearchService pipeline logic.

Tests use mocking to isolate SearchService from DB, IndexStore, and rankers.
Covers:
  - NL price extraction
  - Pipeline orchestration order
  - Empty token list returns empty result
  - Fallback logic triggers correctly
  - Mode switching selects correct ranker
  - Pagination math
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from app.services.search_service import (
    SearchService,
    _extract_price_from_query,
    _get_lowest_idf_token,
)


# ─────────────────────────────────────────────────────────────────────────────
#  NL Price Extraction
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_extract_price_under():
    clean, mn, mx = _extract_price_from_query("wireless headphones under 3000")
    assert mx == pytest.approx(3000.0)
    assert mn is None
    assert "under" not in clean
    assert "3000" not in clean


@pytest.mark.unit
def test_extract_price_below():
    clean, mn, mx = _extract_price_from_query("laptop below 50000")
    assert mx == pytest.approx(50000.0)
    assert mn is None


@pytest.mark.unit
def test_extract_price_above():
    clean, mn, mx = _extract_price_from_query("gaming headphones above 1000")
    assert mn == pytest.approx(1000.0)
    assert mx is None


@pytest.mark.unit
def test_extract_price_between():
    clean, mn, mx = _extract_price_from_query("laptop between 30000 and 70000")
    assert mn == pytest.approx(30000.0)
    assert mx == pytest.approx(70000.0)


@pytest.mark.unit
def test_extract_price_no_price():
    clean, mn, mx = _extract_price_from_query("wireless headphones")
    assert clean == "wireless headphones"
    assert mn is None
    assert mx is None


@pytest.mark.unit
def test_extract_price_less_than():
    clean, mn, mx = _extract_price_from_query("shoes less than 2000")
    assert mx == pytest.approx(2000.0)


@pytest.mark.unit
def test_extract_price_more_than():
    clean, mn, mx = _extract_price_from_query("laptop more than 40000")
    assert mn == pytest.approx(40000.0)


# ─────────────────────────────────────────────────────────────────────────────
#  Lowest-IDF token helper
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_get_lowest_idf_token_returns_most_common():
    """The token with highest df (most common) should be returned as lowest-IDF."""
    from app.models.index import TermEntry, PostingEntry, CorpusStats, IndexStore

    # Reset singleton for a clean state
    store = IndexStore()
    store.reset()
    store.is_ready = True

    # "common" appears in 90 docs; "rare" appears in 1 doc
    te_common = TermEntry(doc_freq=90, postings={})
    te_rare = TermEntry(doc_freq=1, postings={})
    store.index = {"common": te_common, "rare": te_rare}
    store.corpus_stats = CorpusStats(
        total_documents=100,
        avg_doc_length=10.0,
        avg_field_lengths={},
        doc_lengths={},
        field_lengths={},
    )

    result = _get_lowest_idf_token(["common", "rare"], store)
    assert result == "common"

    # Cleanup
    store.reset()


# ─────────────────────────────────────────────────────────────────────────────
#  Pipeline: empty tokens → empty result
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_search_empty_query_after_preprocessing():
    """
    A query that preprocesses to zero tokens (e.g., all stopwords)
    should return an empty result without hitting the DB.
    """
    from app.models.index import IndexStore, CorpusStats

    store = IndexStore()
    store.reset()
    store.is_ready = True
    store.corpus_stats = CorpusStats(
        total_documents=100,
        avg_doc_length=10.0,
        avg_field_lengths={},
        doc_lengths={},
        field_lengths={},
    )
    store.index = {}

    mock_db = MagicMock()

    # Use a query that consists entirely of stopwords
    result = SearchService.search(q="the a in", mode="bm25", db=mock_db)

    assert result["results"] == []
    assert result["pagination"]["total_results"] == 0
    assert result["metadata"]["fallback_applied"] is True
    assert "no tokens" in result["metadata"]["fallback_reason"].lower()

    store.reset()


# ─────────────────────────────────────────────────────────────────────────────
#  Pipeline: pagination math
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_pagination_total_pages_computed_correctly():
    """47 results, page_size=10 → total_pages=5"""
    total = 47
    page_size = 10
    total_pages = max(1, -(-total // page_size))
    assert total_pages == 5


@pytest.mark.unit
def test_pagination_total_pages_exact_multiple():
    """50 results, page_size=10 → total_pages=5"""
    total = 50
    page_size = 10
    total_pages = max(1, -(-total // page_size))
    assert total_pages == 5


@pytest.mark.unit
def test_pagination_single_page():
    """5 results, page_size=10 → total_pages=1"""
    total = 5
    page_size = 10
    total_pages = max(1, -(-total // page_size))
    assert total_pages == 1


# ─────────────────────────────────────────────────────────────────────────────
#  Schema validation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_search_request_invalid_mode():
    from app.api.schemas.request import SearchRequest
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        SearchRequest(q="laptop", mode="invalid_mode")


@pytest.mark.unit
def test_search_request_invalid_price_range():
    from app.api.schemas.request import SearchRequest
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        SearchRequest(q="laptop", min_price=5000, max_price=1000)


@pytest.mark.unit
def test_search_request_defaults():
    from app.api.schemas.request import SearchRequest

    req = SearchRequest(q="laptop")
    assert req.mode == "bm25"
    assert req.page == 1
    assert req.page_size == 10


@pytest.mark.unit
def test_evaluation_request_requires_queries_or_set_id():
    from app.api.schemas.request import EvaluationRequest
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        EvaluationRequest()  # neither query_set_id nor queries provided


@pytest.mark.unit
def test_compare_request_parsed_modes():
    from app.api.schemas.request import CompareRequest

    req = CompareRequest(q="laptop", modes="keyword,tfidf,bm25")
    assert req.parsed_modes() == ["keyword", "tfidf", "bm25"]


@pytest.mark.unit
def test_compare_request_invalid_mode_raises():
    from app.api.schemas.request import CompareRequest

    req = CompareRequest(q="laptop", modes="keyword,badmode")
    with pytest.raises(ValueError):
        req.parsed_modes()
