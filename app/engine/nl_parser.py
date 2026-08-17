"""
app/engine/nl_parser.py — Natural-Language Query Parser.

Extracts structured intent (price bounds, category hints) from a free-form
query string *before* tokenisation so that extracted entities are not damaged
by stopword removal or stemming.

Spec: SEARCH_ENGINE_SPEC.md §8
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
#  StructuredQuery dataclass (SEARCH_ENGINE_SPEC.md §8.4)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class StructuredQuery:
    """Output of NLQueryParser.parse()."""

    raw_query: str
    clean_query: str            # raw_query with extracted price phrases removed
    min_price: Optional[float]
    max_price: Optional[float]
    category_hint: Optional[str]  # matched category name or None
    tokens: list[str] = field(default_factory=list)  # populated after preprocessing


# ─────────────────────────────────────────────────────────────────────────────
#  Compiled price-extraction patterns (SEARCH_ENGINE_SPEC.md §8.3)
# ─────────────────────────────────────────────────────────────────────────────

# Each entry: (compiled_regex, field_name)
# "price_range" is handled separately as it extracts two groups.
_PRICE_RANGE_PATTERN = re.compile(
    r"between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)",
    re.IGNORECASE,
)

_PRICE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"under\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "max_price"),
    (re.compile(r"below\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "max_price"),
    (re.compile(r"less\s+than\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "max_price"),
    (re.compile(r"above\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "min_price"),
    (re.compile(r"over\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "min_price"),
    (re.compile(r"more\s+than\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "min_price"),
]


# ─────────────────────────────────────────────────────────────────────────────
#  NLQueryParser
# ─────────────────────────────────────────────────────────────────────────────

class NLQueryParser:
    """
    Extracts structured entities (price bounds, category hints) from a raw
    query string.

    Usage::

        # Build parser once with the list of known category names from the DB.
        parser = NLQueryParser(category_names=["Electronics", "Books", ...])

        sq = parser.parse("wireless headphones under 2000")
        # sq.max_price   → 2000.0
        # sq.clean_query → "wireless headphones"
        # sq.category_hint → None   (no category keyword found)

    SEARCH_ENGINE_SPEC.md §8
    """

    def __init__(self, category_names: list[str] | None = None) -> None:
        """
        Parameters
        ----------
        category_names:
            List of canonical category name strings loaded from the DB
            (e.g. ``["Electronics", "Clothing & Apparel", "Books"]``).
            Used for vocabulary matching.  Pass ``None`` or ``[]`` to skip
            category extraction.
        """
        self._category_names: list[str] = list(category_names or [])

        # Pre-build a mapping: lowercase keyword → canonical category name.
        # We split multi-word names on whitespace and '&' so that a query
        # token like "electronics", "clothing", or "book" matches the right
        # category even without the full category name in the query.
        self._vocab: dict[str, str] = {}
        for cat in self._category_names:
            # Add the full name (lowercased) as a key.
            self._vocab[cat.lower()] = cat
            # Add each individual word as a key (except very short connectors).
            for word in re.split(r"[\s&]+", cat):
                w = word.strip().lower()
                if len(w) >= 3:  # skip "& "
                    self._vocab.setdefault(w, cat)

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #

    def parse(self, raw_query: str) -> StructuredQuery:
        """
        Parse *raw_query* and return a :class:`StructuredQuery`.

        Steps (SEARCH_ENGINE_SPEC.md §8.1):
        1. Extract price range first (most specific pattern).
        2. Extract single-sided price bounds.
        3. Remove matched price phrases from clean_query.
        4. Check each remaining word against the category vocabulary.
        """
        clean = raw_query.strip()
        min_price: Optional[float] = None
        max_price: Optional[float] = None

        # ── Step 1: Price range (between X and Y) ────────────────────────
        m = _PRICE_RANGE_PATTERN.search(clean)
        if m:
            min_price = float(m.group(1))
            max_price = float(m.group(2))
            clean = (clean[: m.start()] + clean[m.end() :]).strip()

        # ── Step 2: Single-sided price patterns ──────────────────────────
        for pattern, field_name in _PRICE_PATTERNS:
            m = pattern.search(clean)
            if m:
                val = float(m.group(1))
                if field_name == "max_price" and max_price is None:
                    max_price = val
                elif field_name == "min_price" and min_price is None:
                    min_price = val
                clean = (clean[: m.start()] + clean[m.end() :]).strip()

        # Collapse multiple spaces that may have been introduced.
        clean = re.sub(r"\s{2,}", " ", clean).strip()

        # ── Step 3: Category vocabulary matching ─────────────────────────
        category_hint = self._match_category(clean)

        return StructuredQuery(
            raw_query=raw_query,
            clean_query=clean,
            min_price=min_price,
            max_price=max_price,
            category_hint=category_hint,
        )

    # ------------------------------------------------------------------ #
    #  Private helpers
    # ------------------------------------------------------------------ #

    def _match_category(self, text: str) -> Optional[str]:
        """
        Return the canonical category name for the first vocabulary match
        found in *text*, or ``None`` if no match.

        Matching is case-insensitive and word-boundary-safe so that "books"
        matches "Books" but "notebook" does not match "book".
        """
        if not self._vocab:
            return None

        words = re.split(r"[\s,]+", text.lower())
        for word in words:
            word = word.strip(".,!?\"'")
            if word in self._vocab:
                return self._vocab[word]

        return None
