"""
app/engine/suggest.py — Query Suggestions / Autocomplete engine.

Implements a simple prefix scan over the inverted-index vocabulary to return
matching product-name token suggestions.

DEVELOPMENT_PLAN.md §4.4:
  "GET /api/v1/search/suggest?q=wire returns top 5 matching product name
   prefixes. Backed by simple prefix scan over the index vocabulary."

Algorithm
---------
1. Lowercase and strip the input prefix.
2. Scan every term in ``IndexStore.index`` whose key *starts with* the prefix.
3. Keep only terms that appear in at least one product's **name** field
   (i.e., some posting has ``fields["name"] > 0``), so suggestions stay
   relevant to product names rather than description/spec noise.
4. Rank surviving terms by total name-field doc frequency descending
   (most commonly appearing in product names = best suggestion).
5. Return the top *top_n* terms (default 5).

The scan is O(|vocab|) — the vocabulary is typically a few thousand stemmed
terms and fits comfortably in the singleton IndexStore so no extra data
structure is required.
"""

from __future__ import annotations

import logging

from app.models.index import IndexStore

logger = logging.getLogger(__name__)

_DEFAULT_TOP_N = 5


def get_suggestions(prefix: str, top_n: int = _DEFAULT_TOP_N) -> list[str]:
    """
    Return up to *top_n* vocabulary terms whose stemmed form starts with
    *prefix*, weighted by how many product names they appear in.

    Parameters
    ----------
    prefix:
        The raw (unstemmed, lowercased by this function) query prefix typed
        by the user.
    top_n:
        Maximum number of suggestions to return (default 5).

    Returns
    -------
    list[str]
        Matching vocabulary terms, sorted by name-field doc-frequency
        descending.  Returns an empty list when the index is not ready or
        the prefix is blank.
    """
    store = IndexStore()
    if not store.is_ready or not store.index:
        return []

    prefix = prefix.strip().lower()
    if not prefix:
        return []

    matches: list[tuple[str, int]] = []

    for term, term_entry in store.index.items():
        if not term.startswith(prefix):
            continue

        # Only suggest terms that appear in at least one product name
        name_doc_freq = sum(
            1
            for posting in term_entry.postings.values()
            if posting.fields.get("name", 0) > 0
        )
        if name_doc_freq == 0:
            continue

        matches.append((term, name_doc_freq))

    # Sort by name-field doc_freq descending — most common name-terms first
    matches.sort(key=lambda x: x[1], reverse=True)

    return [term for term, _ in matches[:top_n]]
