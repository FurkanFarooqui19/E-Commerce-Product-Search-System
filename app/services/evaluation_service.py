"""
app/services/evaluation_service.py — Compute IR evaluation metrics.

Metrics implemented (SEARCH_EVALUATION.md §3):
  - Precision@K    (binary relevance: grade >= 2)
  - Recall@K       (binary relevance: grade >= 2)
  - MRR            (binary relevance: grade >= 1; computed over top-20)
  - NDCG@K         (graded relevance 0-3; uses DCG formula)
  - Latency (ms)   (wall-clock time inside SearchService.search)

Per-query metrics are macro-averaged across all queries.
"""

from __future__ import annotations

import logging
import math
import time
from typing import Optional

from sqlalchemy.orm import Session

from app.api.schemas.request import EvaluationRequest, InlineQuery
from app.models.evaluation import EvaluationQuery
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  Pure metric functions (testable independently)
# ─────────────────────────────────────────────────────────────────────────────

def precision_at_k(retrieved_ids: list[int], relevant_ids: set[int], k: int) -> float:
    """P@K = |relevant in top-K| / K  (SEARCH_EVALUATION.md §3.1)"""
    if k == 0:
        return 0.0
    top_k = retrieved_ids[:k]
    hits = sum(1 for pid in top_k if pid in relevant_ids)
    return hits / k


def recall_at_k(retrieved_ids: list[int], relevant_ids: set[int], k: int) -> float:
    """R@K = |relevant in top-K| / |all relevant|  (SEARCH_EVALUATION.md §3.2)"""
    if not relevant_ids:
        return 0.0
    top_k = retrieved_ids[:k]
    hits = sum(1 for pid in top_k if pid in relevant_ids)
    return hits / len(relevant_ids)


def reciprocal_rank(retrieved_ids: list[int], relevant_ids: set[int], cap: int = 20) -> float:
    """
    RR = 1/rank_of_first_relevant (grade >= 1), 0 if none in top-cap.
    SEARCH_EVALUATION.md §3.3
    """
    for i, pid in enumerate(retrieved_ids[:cap], start=1):
        if pid in relevant_ids:
            return 1.0 / i
    return 0.0


def dcg_at_k(retrieved_ids: list[int], grades: dict[int, int], k: int) -> float:
    """
    DCG@K = sum( (2^rel_i - 1) / log2(i+1) ) for i in 1..K
    SEARCH_EVALUATION.md §3.4 Step 1
    """
    dcg = 0.0
    for i, pid in enumerate(retrieved_ids[:k], start=1):
        rel = grades.get(pid, 0)
        dcg += (2**rel - 1) / math.log2(i + 1)
    return dcg


def ideal_dcg_at_k(grades: dict[int, int], k: int) -> float:
    """
    IDCG@K = DCG of ideal (descending) ordering.
    SEARCH_EVALUATION.md §3.4 Step 2
    """
    sorted_grades = sorted(grades.values(), reverse=True)
    idcg = 0.0
    for i, rel in enumerate(sorted_grades[:k], start=1):
        idcg += (2**rel - 1) / math.log2(i + 1)
    return idcg


def ndcg_at_k(retrieved_ids: list[int], grades: dict[int, int], k: int) -> float:
    """
    NDCG@K = DCG@K / IDCG@K.
    SEARCH_EVALUATION.md §3.4 Step 3
    """
    idcg = ideal_dcg_at_k(grades, k)
    if idcg == 0.0:
        return 0.0
    return dcg_at_k(retrieved_ids, grades, k) / idcg


# ─────────────────────────────────────────────────────────────────────────────
#  EvaluationService
# ─────────────────────────────────────────────────────────────────────────────

class EvaluationService:
    """
    Runs evaluation benchmarks against a set of queries with known relevance.
    DEVELOPMENT_PLAN.md §3.5, ARCHITECTURE.md §4.4
    """

    @staticmethod
    def run(request: EvaluationRequest, db: Session) -> dict:
        """
        Execute evaluation and return a dict matching EvaluationResponse schema.
        """
        # ── Load queries ───────────────────────────────────────────────────
        queries = EvaluationService._load_queries(request, db)
        if not queries:
            raise ValueError("No evaluation queries found")

        k = request.k
        modes = request.modes
        filters = request.filters

        mode_results: dict[str, list[dict]] = {m: [] for m in modes}

        for query_obj in queries:
            query_text = query_obj["query_text"]
            grades: dict[int, int] = query_obj["grades"]          # product_id → 0-3
            binary_rel: set[int] = query_obj["binary_relevant"]   # grade >= 2
            mrr_rel: set[int] = query_obj["mrr_relevant"]         # grade >= 1

            # Use query-level constraints from the dataset when present.
            q_category = query_obj.get("category", filters.category)
            q_min_price = query_obj.get("min_price", filters.min_price)
            q_max_price = query_obj.get("max_price", filters.max_price)

            for mode in modes:
                t0 = time.perf_counter()
                try:
                    result = SearchService.search(
                        q=query_text,
                        mode=mode,
                        category=q_category,
                        min_price=q_min_price,
                        max_price=q_max_price,
                        page=1,
                        page_size=max(k, 20),  # fetch at least 20 for MRR
                        db=db,
                    )
                    retrieved_ids = [r["product"].id for r in result["results"]]
                except Exception as exc:
                    logger.warning("Search failed for query %r mode %s: %s", query_text, mode, exc)
                    retrieved_ids = []
                elapsed = (time.perf_counter() - t0) * 1000

                p_k = precision_at_k(retrieved_ids, binary_rel, k)
                r_k = recall_at_k(retrieved_ids, binary_rel, k)
                rr = reciprocal_rank(retrieved_ids, mrr_rel, cap=20)
                n_k = ndcg_at_k(retrieved_ids, grades, k)

                mode_results[mode].append(
                    {
                        "query": query_text,
                        "precision_at_k": p_k,
                        "recall_at_k": r_k,
                        "mrr": rr,
                        "ndcg_at_k": n_k,
                        "latency_ms": round(elapsed, 2),
                    }
                )

        # ── Aggregate per mode ─────────────────────────────────────────────
        def avg(lst: list[float]) -> float:
            return sum(lst) / len(lst) if lst else 0.0

        aggregated: dict[str, dict] = {}
        for mode in modes:
            per_q = mode_results[mode]
            aggregated[mode] = {
                "precision_at_k": avg([r["precision_at_k"] for r in per_q]),
                "recall_at_k": avg([r["recall_at_k"] for r in per_q]),
                "mrr": avg([r["mrr"] for r in per_q]),
                "ndcg_at_k": avg([r["ndcg_at_k"] for r in per_q]),
                "avg_latency_ms": avg([r["latency_ms"] for r in per_q]),
                "per_query": per_q,
            }

        # ── Determine winner ───────────────────────────────────────────────
        winner = max(modes, key=lambda m: aggregated[m]["ndcg_at_k"])

        # ── Comparison summary ─────────────────────────────────────────────
        comparison_summary: dict[str, Optional[str]] = {
            "bm25_vs_keyword_ndcg_improvement": None,
            "bm25_vs_tfidf_ndcg_improvement": None,
        }
        if "bm25" in aggregated and "keyword" in aggregated:
            kw_ndcg = aggregated["keyword"]["ndcg_at_k"]
            bm_ndcg = aggregated["bm25"]["ndcg_at_k"]
            if kw_ndcg > 0:
                pct = (bm_ndcg - kw_ndcg) / kw_ndcg * 100
                comparison_summary["bm25_vs_keyword_ndcg_improvement"] = f"{pct:+.1f}%"
        if "bm25" in aggregated and "tfidf" in aggregated:
            tf_ndcg = aggregated["tfidf"]["ndcg_at_k"]
            bm_ndcg = aggregated["bm25"]["ndcg_at_k"]
            if tf_ndcg > 0:
                pct = (bm_ndcg - tf_ndcg) / tf_ndcg * 100
                comparison_summary["bm25_vs_tfidf_ndcg_improvement"] = f"{pct:+.1f}%"

        return {
            "evaluation_report": {
                "k": k,
                "total_queries": len(queries),
                "modes": aggregated,
                "winner": winner,
                "comparison_summary": comparison_summary,
            }
        }

    # ─────────────────────────────────────────────────────────────────────────
    #  Query loading helpers
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _load_queries(request: EvaluationRequest, db: Session) -> list[dict]:
        """
        Load evaluation queries from DB (when query_set_id provided)
        or from inline request body.
        """
        if request.query_set_id is not None:
            return EvaluationService._load_from_db(request.query_set_id, db)
        return EvaluationService._load_inline(request.queries)

    @staticmethod
    def _load_from_db(query_set_id: int, db: Session) -> list[dict]:
        """Load EvaluationQuery rows that belong to the given query set ID.
        For MVP, query_set_id maps to a named group stored in EvaluationQuery.
        Since the DB doesn't have an explicit 'query_set' table, we load all
        EvaluationQuery rows (query_set_id is treated as 'load all').
        """
        rows = db.query(EvaluationQuery).all()
        result = []
        for row in rows:
            grades = {j.product_id: j.relevance for j in row.judgments}
            result.append(
                {
                    "query_text": row.query_text,
                    "category": row.category,
                    "min_price": row.min_price,
                    "max_price": row.max_price,
                    "grades": grades,
                    "binary_relevant": {pid for pid, g in grades.items() if g >= 2},
                    "mrr_relevant": {pid for pid, g in grades.items() if g >= 1},
                }
            )
        return result

    @staticmethod
    def _load_inline(queries: list[InlineQuery]) -> list[dict]:
        """Convert inline EvaluationRequest queries to the internal format."""
        result = []
        for q in queries:
            # Build grades from graded_judgments; fall back to binary relevant_product_ids
            if q.graded_judgments:
                grades = {j.product_id: j.relevance for j in q.graded_judgments}
            else:
                # Treat explicit relevant_product_ids as grade=3
                grades = {pid: 3 for pid in q.relevant_product_ids}

            result.append(
                {
                    "query_text": q.query_text,
                    "category": None,
                    "min_price": None,
                    "max_price": None,
                    "grades": grades,
                    "binary_relevant": {pid for pid, g in grades.items() if g >= 2},
                    "mrr_relevant": {pid for pid, g in grades.items() if g >= 1},
                }
            )
        return result
