"""
app/services/search_service.py — Orchestrates the full search pipeline.

Pipeline order (SEARCH_ENGINE_SPEC.md §1, ARCHITECTURE.md §4.3):
  1. Inline NL price extraction from raw query (Phase 3 minimal pass-through;
     full NLQueryParser with category vocab matching is Phase 4).
  2. Merge extracted values with explicit API parameters (explicit takes priority).
  3. QueryPreprocessor.process() → token list.
  4. If token list is empty → return empty result immediately.
  5. FilterEngine.get_candidate_ids() → candidate set.
  6. Fallback logic (SEARCH_ENGINE_SPEC.md §11):
       a. Zero results + category filter → relax category, retry.
       b. Still zero → relax all filters, retry.
       c. Still zero → drop lowest-IDF token, retry.
       d. Return empty result with fallback flags.
  7. Ranker.rank() → [(product_id, score), …]
  8. ResultFusion.normalize_and_sort() → sorted + normalized list.
  9. Paginate.
  10. Fetch full product objects from DB.
  11. Build and return SearchResponse.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Optional

from sqlalchemy.orm import Session

from app.config import (
    BM25_B,
    BM25_K1,
    LOW_CONFIDENCE_THRESHOLD,
)
from app.engine.bm25_ranker import BM25Ranker
from app.engine.filter_engine import FilterEngine
from app.engine.keyword_ranker import KeywordRanker
from app.engine.preprocessor import QueryPreprocessor
from app.engine.result_fusion import ResultFusion
from app.engine.tfidf_ranker import TFIDFRanker
from app.models.index import IndexStore
from app.services.product_service import ProductService

logger = logging.getLogger(__name__)

# Pre-compiled price-extraction patterns (SEARCH_ENGINE_SPEC.md §8.3)
_PRICE_PATTERNS = [
    (re.compile(r"under\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "max_price"),
    (re.compile(r"below\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "max_price"),
    (re.compile(r"less\s+than\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "max_price"),
    (re.compile(r"above\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "min_price"),
    (re.compile(r"over\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "min_price"),
    (re.compile(r"more\s+than\s+(\d+(?:\.\d+)?)", re.IGNORECASE), "min_price"),
]
_PRICE_RANGE_PATTERN = re.compile(
    r"between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)", re.IGNORECASE
)


def _extract_price_from_query(query: str) -> tuple[str, Optional[float], Optional[float]]:
    """
    Extract price constraints from the raw query string.
    Returns (clean_query, min_price, max_price).
    Removes price phrases from query so they don't pollute token matching.
    """
    clean = query
    min_price: Optional[float] = None
    max_price: Optional[float] = None

    # Check range first (more specific)
    m = _PRICE_RANGE_PATTERN.search(clean)
    if m:
        min_price = float(m.group(1))
        max_price = float(m.group(2))
        clean = clean[: m.start()] + clean[m.end() :]

    # Single-sided patterns
    for pattern, field in _PRICE_PATTERNS:
        m = pattern.search(clean)
        if m:
            val = float(m.group(1))
            if field == "max_price" and max_price is None:
                max_price = val
            elif field == "min_price" and min_price is None:
                min_price = val
            clean = clean[: m.start()] + clean[m.end() :]

    return clean.strip(), min_price, max_price


def _select_ranker(mode: str):
    """Return the appropriate ranker for the given mode string."""
    return {"keyword": KeywordRanker, "tfidf": TFIDFRanker, "bm25": BM25Ranker}.get(mode, BM25Ranker)


def _run_ranker(mode: str, tokens: list[str], candidate_ids: list[int], store: IndexStore):
    """Dispatch ranking to the appropriate engine with correct arguments."""
    if mode == "keyword":
        return KeywordRanker.rank(tokens, candidate_ids, store.index)
    elif mode == "tfidf":
        return TFIDFRanker.rank(tokens, candidate_ids, store.index, store.corpus_stats)
    else:  # bm25 (default)
        return BM25Ranker.rank(
            tokens, candidate_ids, store.index, store.corpus_stats, BM25_K1, BM25_B
        )


def _get_lowest_idf_token(tokens: list[str], store: IndexStore) -> Optional[str]:
    """Return the token with the lowest IDF (most common → least informative)."""
    if not tokens:
        return None
    N = store.corpus_stats.total_documents if store.corpus_stats else 1

    def idf(t: str) -> float:
        df = store.index[t].doc_freq if t in store.index else 0
        return (N + 1) / (df + 1)  # lower = more common

    return min(tokens, key=idf)


class SearchService:
    """
    Orchestrates the end-to-end search pipeline.
    ARCHITECTURE.md §2.3, §4.3
    """

    _preprocessor = QueryPreprocessor()

    @classmethod
    def search(
        cls,
        *,
        q: str,
        mode: str = "bm25",
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        page: int = 1,
        page_size: int = 10,
        db: Session,
    ) -> dict:
        """
        Execute a search and return a dict matching SearchResponse schema.
        """
        t_start = time.perf_counter()

        store = IndexStore()
        if not store.is_ready:
            raise RuntimeError("INDEX_NOT_READY")

        # ── Step 1: Inline NL price extraction ────────────────────────────
        clean_query, nl_min, nl_max = _extract_price_from_query(q)

        # Explicit API params take precedence over NL-extracted values
        eff_min = min_price if min_price is not None else nl_min
        eff_max = max_price if max_price is not None else nl_max

        nl_extracted = {"min_price": nl_min, "max_price": nl_max, "category_hint": None}

        # ── Step 2: Preprocess query ───────────────────────────────────────
        tokens = cls._preprocessor.process(clean_query)

        # Empty token list → return empty immediately (no fallback needed)
        if not tokens:
            latency_ms = (time.perf_counter() - t_start) * 1000
            return cls._empty_response(
                raw_q=q,
                tokens=tokens,
                mode=mode,
                category=category,
                min_price=eff_min,
                max_price=eff_max,
                nl_extracted=nl_extracted,
                page=page,
                page_size=page_size,
                latency_ms=latency_ms,
                index_size=store.corpus_stats.total_documents if store.corpus_stats else 0,
            )

        # ── Steps 3–6: Filter + fallback ──────────────────────────────────
        scored, fallback_applied, fallback_reason, used_category, used_tokens = (
            cls._filter_and_rank_with_fallback(
                tokens=tokens,
                mode=mode,
                category=category,
                min_price=eff_min,
                max_price=eff_max,
                store=store,
                db=db,
            )
        )

        # ── Step 7: Result fusion (normalize + sort) ──────────────────────
        product_meta = cls._build_product_meta(scored, db)
        fused = ResultFusion.normalize_and_sort(scored, used_tokens, store.index, product_meta)

        total_candidates = len(fused)
        low_confidence = bool(fused and fused[0][1] < LOW_CONFIDENCE_THRESHOLD)

        # ── Step 8: Paginate ──────────────────────────────────────────────
        start = (page - 1) * page_size
        page_slice = fused[start : start + page_size]

        # ── Step 9: Fetch product details ─────────────────────────────────
        ids_in_page = [pid for pid, _ in page_slice]
        products_map = {p.id: p for p in ProductService.fetch_by_ids(ids_in_page, db)}

        # Build result items
        results = []
        for rank_idx, (pid, score) in enumerate(page_slice, start=1):
            if pid in products_map:
                results.append({"rank": rank_idx, "score": score, "product": products_map[pid]})

        latency_ms = (time.perf_counter() - t_start) * 1000
        total_pages = max(1, -(-total_candidates // page_size)) if total_candidates else 0

        return {
            "query": {
                "raw": q,
                "processed_tokens": used_tokens,
                "mode": mode,
                "filters_applied": {
                    "category": used_category,
                    "min_price": eff_min,
                    "max_price": eff_max,
                },
                "nl_extracted": nl_extracted,
            },
            "results": results,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_results": total_candidates,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
            "metadata": {
                "latency_ms": round(latency_ms, 2),
                "total_candidates": total_candidates,
                "fallback_applied": fallback_applied,
                "fallback_reason": fallback_reason,
                "low_confidence": low_confidence,
                "index_size": store.corpus_stats.total_documents if store.corpus_stats else 0,
            },
        }

    @classmethod
    def _filter_and_rank_with_fallback(
        cls,
        *,
        tokens: list[str],
        mode: str,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float],
        store: IndexStore,
        db: Session,
    ) -> tuple[list[tuple[int, float]], bool, Optional[str], Optional[str], list[str]]:
        """
        Apply filter→rank with progressive fallback (SEARCH_ENGINE_SPEC.md §11).
        Returns (scored_results, fallback_applied, fallback_reason, used_category, used_tokens).
        """
        current_tokens = list(tokens)

        # Attempt 1: Full filters
        candidates = FilterEngine.get_candidate_ids(category, min_price, max_price, db)
        scored = _run_ranker(mode, current_tokens, candidates, store)
        if scored:
            return scored, False, None, category, current_tokens

        # Fallback 1: Relax category filter
        if category:
            candidates = FilterEngine.get_candidate_ids(None, min_price, max_price, db)
            scored = _run_ranker(mode, current_tokens, candidates, store)
            if scored:
                return scored, True, "Category filter relaxed", None, current_tokens

        # Fallback 2: Relax all filters
        candidates = FilterEngine.get_candidate_ids(None, None, None, db)
        scored = _run_ranker(mode, current_tokens, candidates, store)
        if scored:
            return scored, True, "All filters relaxed", None, current_tokens

        # Fallback 3: Drop lowest-IDF token
        if len(current_tokens) > 1:
            drop = _get_lowest_idf_token(current_tokens, store)
            reduced = [t for t in current_tokens if t != drop]
            scored = _run_ranker(mode, reduced, candidates, store)
            if scored:
                return scored, True, f"Query reduced (dropped '{drop}')", None, reduced

        return [], True, "No results found after relaxing all filters", None, current_tokens

    @classmethod
    def _build_product_meta(
        cls, scored: list[tuple[int, float]], db: Session
    ) -> dict[int, dict]:
        """Fetch minimal metadata for tie-breaking in ResultFusion."""
        if not scored:
            return {}
        ids = [pid for pid, _ in scored]
        products = ProductService.fetch_by_ids(ids, db)
        return {
            p.id: {"price": float(p.price), "created_at": p.created_at}
            for p in products
        }

    @staticmethod
    def _empty_response(
        *,
        raw_q: str,
        tokens: list[str],
        mode: str,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float],
        nl_extracted: dict,
        page: int,
        page_size: int,
        latency_ms: float,
        index_size: int,
    ) -> dict:
        return {
            "query": {
                "raw": raw_q,
                "processed_tokens": tokens,
                "mode": mode,
                "filters_applied": {
                    "category": category,
                    "min_price": min_price,
                    "max_price": max_price,
                },
                "nl_extracted": nl_extracted,
            },
            "results": [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_results": 0,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False,
            },
            "metadata": {
                "latency_ms": round(latency_ms, 2),
                "total_candidates": 0,
                "fallback_applied": True,
                "fallback_reason": "Query produced no tokens after preprocessing",
                "low_confidence": False,
                "index_size": index_size,
            },
        }

    @classmethod
    def compare(
        cls,
        *,
        q: str,
        modes: list[str],
        top_k: int = 10,
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        db: Session,
    ) -> dict:
        """
        Run the same query through multiple modes and return side-by-side results.
        API_SPEC.md §4.1 /search/compare
        """
        store = IndexStore()
        if not store.is_ready:
            raise RuntimeError("INDEX_NOT_READY")

        clean_query, nl_min, nl_max = _extract_price_from_query(q)
        eff_min = min_price if min_price is not None else nl_min
        eff_max = max_price if max_price is not None else nl_max

        tokens = cls._preprocessor.process(clean_query)
        candidates = FilterEngine.get_candidate_ids(category, eff_min, eff_max, db)

        results: dict[str, list] = {}
        latency_ms: dict[str, float] = {}

        for mode in modes:
            t0 = time.perf_counter()
            scored = _run_ranker(mode, tokens, candidates, store)
            product_meta = cls._build_product_meta(scored, db)
            fused = ResultFusion.normalize_and_sort(scored, tokens, store.index, product_meta)
            elapsed = (time.perf_counter() - t0) * 1000

            page_slice = fused[:top_k]
            ids = [pid for pid, _ in page_slice]
            products_map = {p.id: p for p in ProductService.fetch_by_ids(ids, db)}

            mode_results = []
            for rank_idx, (pid, score) in enumerate(page_slice, start=1):
                if pid in products_map:
                    mode_results.append(
                        {
                            "rank": rank_idx,
                            "score": score,
                            "product_id": pid,
                            "product_name": products_map[pid].name,
                        }
                    )
            results[mode] = mode_results
            latency_ms[mode] = round(elapsed, 2)

        return {
            "query": q,
            "processed_tokens": tokens,
            "results": results,
            "latency_ms": latency_ms,
        }
