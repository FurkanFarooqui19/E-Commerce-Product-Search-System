"""
tests/unit/test_suggest.py — Unit tests for Query Suggestions / Autocomplete engine.

Covers (DEVELOPMENT_PLAN.md §4.4):
1. Prefix scan matches vocabulary terms starting with the prefix.
2. Only terms appearing in the product 'name' field are suggested.
3. Suggestions are ranked by name-field doc frequency descending.
4. top_n limit is respected.
5. Case-insensitivity (e.g., 'WIRE' matches 'wireless').
6. Empty or whitespace prefix returns empty list.
7. Unready index returns empty list without raising.
"""

from __future__ import annotations

import pytest

from app.engine.suggest import get_suggestions
from app.models.index import IndexStore, PostingEntry, TermEntry


@pytest.fixture(autouse=True)
def clean_index_store():
    store = IndexStore()
    store.reset()
    yield store
    store.reset()


@pytest.fixture
def mock_index_store():
    store = IndexStore()
    store.reset()
    store.is_ready = True
    store.index = {
        # "wireless": in 3 product names
        "wireless": TermEntry(
            doc_freq=3,
            postings={
                1: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
                2: PostingEntry(fields={"name": 1, "description": 1, "category": 0, "specs": 0}, total_tf=2),
                3: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
            },
        ),
        # "wire": in 1 product name
        "wire": TermEntry(
            doc_freq=1,
            postings={
                4: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
            },
        ),
        # "wired": in 2 product names
        "wired": TermEntry(
            doc_freq=2,
            postings={
                5: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
                6: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
            },
        ),
        # "wirelessspec": only in specs/description, NOT in name
        "wirelessspec": TermEntry(
            doc_freq=2,
            postings={
                7: PostingEntry(fields={"name": 0, "description": 2, "category": 0, "specs": 1}, total_tf=3),
                8: PostingEntry(fields={"name": 0, "description": 0, "category": 0, "specs": 1}, total_tf=1),
            },
        ),
        # "laptop": completely different prefix
        "laptop": TermEntry(
            doc_freq=5,
            postings={
                9: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
            },
        ),
    }
    return store


@pytest.mark.unit
def test_suggest_prefix_matching(mock_index_store):
    """'wire' matches 'wireless', 'wired', 'wire' in order of name_doc_freq."""
    suggestions = get_suggestions("wire", top_n=5)
    # wireless (3) > wired (2) > wire (1)
    assert suggestions == ["wireless", "wired", "wire"]


@pytest.mark.unit
def test_suggest_ignores_terms_not_in_name(mock_index_store):
    """Terms appearing only in description/specs must not be suggested."""
    suggestions = get_suggestions("wire", top_n=10)
    assert "wirelessspec" not in suggestions


@pytest.mark.unit
def test_suggest_respects_top_n(mock_index_store):
    """top_n parameter limits the number of suggestions."""
    suggestions = get_suggestions("wire", top_n=2)
    assert len(suggestions) == 2
    assert suggestions == ["wireless", "wired"]


@pytest.mark.unit
def test_suggest_case_insensitive(mock_index_store):
    """Prefix scan is case-insensitive."""
    suggestions = get_suggestions("WIRE", top_n=5)
    assert suggestions == ["wireless", "wired", "wire"]


@pytest.mark.unit
def test_suggest_empty_or_whitespace():
    """Empty or whitespace prefix returns empty list."""
    assert get_suggestions("") == []
    assert get_suggestions("   ") == []


@pytest.mark.unit
def test_suggest_unready_index():
    """When index is not ready, returns empty list without error."""
    store = IndexStore()
    store.reset()
    store.is_ready = False
    assert get_suggestions("wire") == []


@pytest.mark.unit
def test_suggest_no_match(mock_index_store):
    """Prefix with no matches returns empty list."""
    assert get_suggestions("xyznotfound") == []
