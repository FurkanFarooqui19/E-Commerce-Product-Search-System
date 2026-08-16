"""
tests/unit/test_evaluation_service.py — Unit tests for evaluation metric functions.

Tests the pure metric functions independently of the DB/search pipeline.
All expected values are hand-computed from SEARCH_EVALUATION.md §4 examples.
"""

import math
import pytest

from app.services.evaluation_service import (
    dcg_at_k,
    ideal_dcg_at_k,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
)

# ─────────────────────────────────────────────────────────────────────────────
#  Precision@K  (SEARCH_EVALUATION.md §3.1 and §4.1)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_precision_at_k_basic():
    """Example from SEARCH_EVALUATION.md §4.1: P@5=0.6, P@10=0.4"""
    retrieved = [1, 7, 4, 15, 23, 9, 3, 18, 12, 6]
    relevant = {1, 4, 12, 23}
    assert precision_at_k(retrieved, relevant, 5) == pytest.approx(3 / 5)
    assert precision_at_k(retrieved, relevant, 10) == pytest.approx(4 / 10)


@pytest.mark.unit
def test_precision_at_k_all_relevant():
    assert precision_at_k([1, 2, 3], {1, 2, 3}, 3) == pytest.approx(1.0)


@pytest.mark.unit
def test_precision_at_k_none_relevant():
    assert precision_at_k([1, 2, 3], {99}, 3) == pytest.approx(0.0)


@pytest.mark.unit
def test_precision_at_k_k_zero():
    assert precision_at_k([1, 2], {1}, 0) == pytest.approx(0.0)


@pytest.mark.unit
def test_precision_at_k_empty_retrieved():
    assert precision_at_k([], {1, 2}, 5) == pytest.approx(0.0)


# ─────────────────────────────────────────────────────────────────────────────
#  Recall@K  (SEARCH_EVALUATION.md §3.2 and §4.1)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_recall_at_k_basic():
    """Example from SEARCH_EVALUATION.md §4.1: R@10=1.0 (all 4 found)"""
    retrieved = [1, 7, 4, 15, 23, 9, 3, 18, 12, 6]
    relevant = {1, 4, 12, 23}
    assert recall_at_k(retrieved, relevant, 10) == pytest.approx(1.0)


@pytest.mark.unit
def test_recall_at_k_partial():
    retrieved = [1, 7, 4, 15]
    relevant = {1, 4, 12, 23}
    # 2 of 4 found in top-4
    assert recall_at_k(retrieved, relevant, 4) == pytest.approx(2 / 4)


@pytest.mark.unit
def test_recall_at_k_empty_relevant():
    assert recall_at_k([1, 2, 3], set(), 3) == pytest.approx(0.0)


@pytest.mark.unit
def test_recall_at_k_empty_retrieved():
    assert recall_at_k([], {1, 2}, 5) == pytest.approx(0.0)


# ─────────────────────────────────────────────────────────────────────────────
#  MRR  (SEARCH_EVALUATION.md §3.3 and §4.2)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_mrr_first_result_relevant():
    assert reciprocal_rank([5, 2, 3], {5}, cap=20) == pytest.approx(1.0)


@pytest.mark.unit
def test_mrr_second_result_relevant():
    """Example from SEARCH_EVALUATION.md §4.2: first relevant at rank 2 → RR=0.5"""
    assert reciprocal_rank([7, 4, 15, 23, 9], {4}, cap=20) == pytest.approx(0.5)


@pytest.mark.unit
def test_mrr_no_relevant_in_cap():
    assert reciprocal_rank([1, 2, 3], {99}, cap=20) == pytest.approx(0.0)


@pytest.mark.unit
def test_mrr_macro_average():
    """Three queries with RR 1.0, 0.5, 0.333 → MRR ≈ 0.611"""
    rr1 = reciprocal_rank([1, 2, 3], {1})
    rr2 = reciprocal_rank([7, 4, 3], {4})
    rr3 = reciprocal_rank([10, 11, 5], {5})
    mrr = (rr1 + rr2 + rr3) / 3
    assert mrr == pytest.approx((1.0 + 0.5 + 1 / 3) / 3, abs=1e-3)


# ─────────────────────────────────────────────────────────────────────────────
#  NDCG@K  (SEARCH_EVALUATION.md §3.4 and §4.3)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_dcg_at_k_example():
    """
    Example from SEARCH_EVALUATION.md §4.3:
    Ranks: [42→3, 17→2, 8→1, 55→0, 33→3]
    DCG@5 = 7 + 1.893 + 0.5 + 0 + 2.708 ≈ 12.101
    """
    retrieved = [42, 17, 8, 55, 33]
    grades = {42: 3, 17: 2, 8: 1, 55: 0, 33: 3}
    expected_dcg = (
        (2**3 - 1) / math.log2(2)   # rank 1: 7.0
        + (2**2 - 1) / math.log2(3)  # rank 2: ≈1.893
        + (2**1 - 1) / math.log2(4)  # rank 3: 0.5
        + (2**0 - 1) / math.log2(5)  # rank 4: 0.0
        + (2**3 - 1) / math.log2(6)  # rank 5: ≈2.708
    )
    assert dcg_at_k(retrieved, grades, 5) == pytest.approx(expected_dcg, rel=1e-3)


@pytest.mark.unit
def test_ideal_dcg_at_k_example():
    """
    IDCG@5 from SEARCH_EVALUATION.md §4.3 = 13.347
    Ideal ordering: [3,3,2,1,0]
    """
    grades = {42: 3, 17: 2, 8: 1, 55: 0, 33: 3}
    expected_idcg = (
        (2**3 - 1) / math.log2(2)   # rank 1: 7.0
        + (2**3 - 1) / math.log2(3)  # rank 2: ≈4.416
        + (2**2 - 1) / math.log2(4)  # rank 3: 1.5
        + (2**1 - 1) / math.log2(5)  # rank 4: ≈0.431
        + (2**0 - 1) / math.log2(6)  # rank 5: 0.0
    )
    assert ideal_dcg_at_k(grades, 5) == pytest.approx(expected_idcg, rel=1e-3)


@pytest.mark.unit
def test_ndcg_at_k_example():
    """
    NDCG@5 from SEARCH_EVALUATION.md §4.3 ≈ 0.907
    """
    retrieved = [42, 17, 8, 55, 33]
    grades = {42: 3, 17: 2, 8: 1, 55: 0, 33: 3}
    expected_dcg = (
        (2**3 - 1) / math.log2(2)
        + (2**2 - 1) / math.log2(3)
        + (2**1 - 1) / math.log2(4)
        + (2**0 - 1) / math.log2(5)
        + (2**3 - 1) / math.log2(6)
    )
    expected_idcg = (
        (2**3 - 1) / math.log2(2)
        + (2**3 - 1) / math.log2(3)
        + (2**2 - 1) / math.log2(4)
        + (2**1 - 1) / math.log2(5)
        + (2**0 - 1) / math.log2(6)
    )
    assert ndcg_at_k(retrieved, grades, 5) == pytest.approx(expected_dcg / expected_idcg, rel=1e-3)


@pytest.mark.unit
def test_ndcg_perfect_ranking():
    """Perfect ranking → NDCG = 1.0"""
    grades = {1: 3, 2: 2, 3: 1}
    retrieved = [1, 2, 3]
    assert ndcg_at_k(retrieved, grades, 3) == pytest.approx(1.0, rel=1e-6)


@pytest.mark.unit
def test_ndcg_zero_grades():
    """All non-relevant results → NDCG = 0.0"""
    grades = {1: 0, 2: 0}
    retrieved = [1, 2]
    assert ndcg_at_k(retrieved, grades, 2) == pytest.approx(0.0)


@pytest.mark.unit
def test_ndcg_empty_retrieved():
    grades = {1: 3, 2: 2}
    assert ndcg_at_k([], grades, 5) == pytest.approx(0.0)


@pytest.mark.unit
def test_ndcg_no_grades():
    """No grade entries → IDCG = 0 → NDCG = 0."""
    assert ndcg_at_k([1, 2, 3], {}, 3) == pytest.approx(0.0)
