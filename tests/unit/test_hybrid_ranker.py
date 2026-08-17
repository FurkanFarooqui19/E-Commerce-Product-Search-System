"""
tests/unit/test_hybrid_ranker.py — Unit tests for HybridRanker.

Covers (DEVELOPMENT_PLAN.md §4.2, SEARCH_ENGINE_SPEC.md §10.2):

1. Basic smoke test — returns ranked results.
2. alpha=1.0 collapses to pure BM25 ordering.
3. alpha=0.0 collapses to pure field_bonus ordering.
4. field_bonus rewards matches in higher-weighted fields (name > description).
5. Hybrid score is a convex combination: alpha * bm25 + (1-alpha) * field_bonus.
6. Documents with no matching token are excluded from results.
7. Empty inputs return empty list (guard clauses).
8. alpha parameter is respected (higher alpha → BM25 dominates).
"""

from __future__ import annotations

import math
import pytest

from app.engine.hybrid_ranker import HybridRanker
from app.engine.bm25_ranker import BM25Ranker
from app.models.index import CorpusStats, PostingEntry, TermEntry


# ─────────────────────────────────────────────────────────────────────────────
#  Shared fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def corpus():
    """
    Three-document corpus with two tokens.

    doc 1  — 'wireless' in name (weight 3.0),  shorter doc
    doc 2  — 'wireless' in description (weight 1.5), longer doc
    doc 3  — 'headphon' in name (weight 3.0),  average length

    Field weights from config: name=3.0, category=2.0, description=1.5, specs=1.0
    """
    stats = CorpusStats(
        total_documents=3,
        avg_doc_length=6.0,
        avg_field_lengths={"name": 2.0, "description": 4.0, "category": 0.0, "specs": 0.0},
        doc_lengths={1: 4, 2: 8, 3: 6},
        field_lengths={
            1: {"name": 2, "description": 2, "category": 0, "specs": 0},
            2: {"name": 2, "description": 6, "category": 0, "specs": 0},
            3: {"name": 3, "description": 3, "category": 0, "specs": 0},
        },
    )
    index = {
        "wireless": TermEntry(
            doc_freq=2,
            postings={
                # doc 1: match in NAME (high-weight field)
                1: PostingEntry(
                    fields={"name": 1, "description": 0, "category": 0, "specs": 0},
                    total_tf=1,
                ),
                # doc 2: match in DESCRIPTION (lower-weight field)
                2: PostingEntry(
                    fields={"name": 0, "description": 1, "category": 0, "specs": 0},
                    total_tf=1,
                ),
            },
        ),
        "headphon": TermEntry(
            doc_freq=1,
            postings={
                3: PostingEntry(
                    fields={"name": 1, "description": 0, "category": 0, "specs": 0},
                    total_tf=1,
                ),
            },
        ),
    }
    return index, stats


# ─────────────────────────────────────────────────────────────────────────────
#  1. Basic smoke test
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_hybrid_returns_results(corpus):
    """HybridRanker returns a non-empty, sorted list for matching tokens."""
    index, stats = corpus
    results = HybridRanker.rank(["wireless"], [1, 2, 3], index, stats, k1=1.5, b=0.75, alpha=0.8)
    assert len(results) >= 1
    # Scores are in descending order
    scores = [s for _, s in results]
    assert scores == sorted(scores, reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
#  2. alpha=1.0 → pure BM25 ordering
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_hybrid_alpha_one_matches_bm25_ordering(corpus):
    """
    When alpha=1.0 the hybrid score equals the BM25 score,
    so the ranking order must match BM25Ranker exactly.
    """
    index, stats = corpus
    hybrid = HybridRanker.rank(["wireless"], [1, 2], index, stats, k1=1.5, b=0.75, alpha=1.0)
    bm25 = BM25Ranker.rank(["wireless"], [1, 2], index, stats, k1=1.5, b=0.75)

    hybrid_ids = [pid for pid, _ in hybrid]
    bm25_ids = [pid for pid, _ in bm25]
    assert hybrid_ids == bm25_ids, (
        f"alpha=1.0 hybrid order {hybrid_ids} != BM25 order {bm25_ids}"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  3. alpha=0.0 → pure field_bonus ordering
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_hybrid_alpha_zero_ranks_by_field_bonus(corpus):
    """
    When alpha=0.0 BM25 is ignored.
    Doc 1 matches 'wireless' in NAME (weight 3.0).
    Doc 2 matches 'wireless' in DESCRIPTION (weight 1.5).
    Therefore doc 1 must outscore doc 2.
    """
    index, stats = corpus
    results = HybridRanker.rank(["wireless"], [1, 2], index, stats, k1=1.5, b=0.75, alpha=0.0)
    ids = [pid for pid, _ in results]
    assert ids[0] == 1, "Name-match should rank above description-match when alpha=0"


# ─────────────────────────────────────────────────────────────────────────────
#  4. field_bonus: name match outranks description match (alpha=0.0)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_field_bonus_name_beats_description(corpus):
    """
    The field_bonus formula gives higher weight to matches in 'name' (3.0)
    vs 'description' (1.5).  With alpha=0 this difference must be visible.
    """
    index, stats = corpus
    results = HybridRanker.rank(["wireless"], [1, 2], index, stats, k1=1.5, b=0.75, alpha=0.0)
    score_name = dict(results)[1]       # doc 1 matched in name
    score_desc = dict(results)[2]       # doc 2 matched in description
    assert score_name > score_desc


# ─────────────────────────────────────────────────────────────────────────────
#  5. Hybrid score is the correct convex combination
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_hybrid_score_is_convex_combination(corpus):
    """
    hybrid_score = alpha * bm25_score + (1-alpha) * field_bonus.
    Verify numerically for doc 1, query ['wireless'], alpha=0.8.
    """
    index, stats = corpus
    alpha = 0.8

    # Compute BM25 score for doc 1 via BM25Ranker
    bm25_results = BM25Ranker.rank(["wireless"], [1], index, stats, k1=1.5, b=0.75)
    bm25_score = dict(bm25_results).get(1, 0.0)

    # Compute field_bonus manually for doc 1
    # Doc 1: 'wireless' in name (weight 3.0); no other fields
    field_bonus = 3.0 / 1  # Σ weights for matching fields / |Q|=1

    expected = alpha * bm25_score + (1.0 - alpha) * field_bonus

    hybrid_results = HybridRanker.rank(["wireless"], [1], index, stats, k1=1.5, b=0.75, alpha=alpha)
    hybrid_score = dict(hybrid_results).get(1, 0.0)

    assert math.isclose(hybrid_score, expected, rel_tol=1e-9), (
        f"Expected {expected:.6f}, got {hybrid_score:.6f}"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  6. Non-matching documents excluded
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_hybrid_excludes_non_matching_documents(corpus):
    """
    Candidates that match no query token must not appear in results.
    Doc 3 matches 'headphon' only — querying ['wireless'] must exclude it.
    """
    index, stats = corpus
    results = HybridRanker.rank(["wireless"], [1, 2, 3], index, stats, k1=1.5, b=0.75, alpha=0.8)
    result_ids = {pid for pid, _ in results}
    assert 3 not in result_ids, "Doc 3 should be excluded (no 'wireless' match)"


# ─────────────────────────────────────────────────────────────────────────────
#  7. Guard clauses — empty inputs
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_hybrid_empty_tokens_returns_empty(corpus):
    index, stats = corpus
    assert HybridRanker.rank([], [1, 2, 3], index, stats) == []


@pytest.mark.unit
def test_hybrid_empty_candidates_returns_empty(corpus):
    index, stats = corpus
    assert HybridRanker.rank(["wireless"], [], index, stats) == []


@pytest.mark.unit
def test_hybrid_no_corpus_stats_returns_empty(corpus):
    index, _ = corpus
    assert HybridRanker.rank(["wireless"], [1, 2], index, None) == []


# ─────────────────────────────────────────────────────────────────────────────
#  8. alpha parameter influence
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_higher_alpha_gives_more_weight_to_bm25(corpus):
    """
    When alpha increases towards 1.0, the BM25 component dominates.
    Specifically: the ratio of score(doc1)/score(doc2) should shift
    as alpha changes, because BM25 and field_bonus rank them differently.

    Doc 1: shorter doc, name match → better BM25 score (length norm favours short docs).
    Doc 2: longer doc, description match → lower BM25 score.

    At alpha=1.0 (pure BM25): doc 1 should score higher.
    At alpha=0.0 (pure bonus): doc 1 still scores higher (name > desc weight).
    In both extremes doc 1 wins here; the key test is that scores change with alpha.
    """
    index, stats = corpus

    r_high = dict(HybridRanker.rank(["wireless"], [1, 2], index, stats, alpha=0.9))
    r_low = dict(HybridRanker.rank(["wireless"], [1, 2], index, stats, alpha=0.1))

    # Scores should differ between the two alpha settings
    assert not math.isclose(r_high.get(1, 0), r_low.get(1, 0)), (
        "Score for doc 1 should differ between alpha=0.9 and alpha=0.1"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  9. Multi-token query — field_bonus normalised by |Q|
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_field_bonus_normalised_by_query_length(corpus):
    """
    field_bonus(d, Q) = Σ_t Σ_f [w_f × match] / |Q|
    With a 2-token query ['wireless', 'headphon'], only doc 1 matches 'wireless'
    and doc 3 matches 'headphon'.  Neither matches both.
    The field_bonus for doc 1 should equal (3.0) / 2 = 1.5.
    """
    index, stats = corpus
    # alpha=0 → pure field_bonus
    results_alpha0 = dict(
        HybridRanker.rank(["wireless", "headphon"], [1, 3], index, stats,
                          k1=1.5, b=0.75, alpha=0.0)
    )
    # Doc 1 matches 'wireless' in name (3.0), normalised by 2 tokens → 1.5
    expected_bonus_doc1 = 3.0 / 2
    assert math.isclose(results_alpha0[1], expected_bonus_doc1, rel_tol=1e-9), (
        f"Expected field_bonus 1.5 for doc1, got {results_alpha0[1]}"
    )
    # Doc 3 matches 'headphon' in name (3.0), normalised by 2 tokens → 1.5
    expected_bonus_doc3 = 3.0 / 2
    assert math.isclose(results_alpha0[3], expected_bonus_doc3, rel_tol=1e-9), (
        f"Expected field_bonus 1.5 for doc3, got {results_alpha0[3]}"
    )
