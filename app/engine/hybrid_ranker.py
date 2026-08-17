"""
app/engine/hybrid_ranker.py — Hybrid ranking algorithm.

Combines BM25 score with a field-presence bonus using a weighted linear
combination (SEARCH_ENGINE_SPEC.md §10.2):

    hybrid_score(d) = α × bm25_score(d) + (1 - α) × field_bonus(d)

where:
    bm25_score  — standard Robertson-Sparck Jones BM25 (identical to BM25Ranker)
    field_bonus — rewards matches in higher-weighted fields (see §10.2)
    α           — configurable weight (default 0.8, from config.HYBRID_ALPHA)

field_bonus(d, Q) = Σ_{t ∈ Q} Σ_f [ field_weight[f] × match(t, d, f) ] / |Q|

where match(t, d, f) = 1 if term t appears in field f of document d, else 0.

Both scores are kept in their raw (un-normalised) form; the ResultFusion layer
applies global min-max normalisation across all documents after HybridRanker
returns, consistent with every other ranker.
"""

from __future__ import annotations

import math

from app.config import BM25_B, BM25_K1, FIELD_WEIGHTS, HYBRID_ALPHA
from app.models.index import CorpusStats


class HybridRanker:
    """
    Hybrid ranker: BM25 + field-presence bonus.

    Public interface matches the pattern of BM25Ranker so SearchService can
    dispatch to it uniformly.

    Usage::

        results = HybridRanker.rank(
            tokens, candidate_ids, index, corpus_stats,
            k1=BM25_K1, b=BM25_B, alpha=HYBRID_ALPHA
        )
    """

    @staticmethod
    def rank(
        tokens: list[str],
        candidate_ids: list[int],
        index: dict,
        corpus_stats: CorpusStats,
        k1: float = BM25_K1,
        b: float = BM25_B,
        alpha: float = HYBRID_ALPHA,
    ) -> list[tuple[int, float]]:
        """
        Score *candidate_ids* against *tokens* using the hybrid formula.

        Parameters
        ----------
        tokens:
            Preprocessed query tokens.
        candidate_ids:
            Product IDs that survived the filter stage.
        index:
            Inverted index mapping term → TermEntry.
        corpus_stats:
            Corpus-level statistics (N, avgdl, field lengths …).
        k1:
            BM25 TF-saturation parameter (default from config).
        b:
            BM25 length-normalisation parameter (default from config).
        alpha:
            Weight given to the BM25 component.
            ``(1 - alpha)`` is given to the field_bonus component.

        Returns
        -------
        list[tuple[int, float]]
            Descending-sorted (product_id, hybrid_score) pairs.
            Documents with a zero hybrid score are excluded.
        """
        if not tokens or not candidate_ids or not corpus_stats:
            return []

        N = corpus_stats.total_documents
        n_tokens = len(tokens)

        # ── Pre-compute weighted average document length (for BM25) ──────────
        weighted_avgdl: float = sum(
            FIELD_WEIGHTS.get(f, 1.0) * corpus_stats.avg_field_lengths.get(f, 0.0)
            for f in FIELD_WEIGHTS
        )
        if weighted_avgdl == 0.0:
            weighted_avgdl = 1.0  # guard against degenerate corpus

        # ── Pre-compute per-token IDF values ──────────────────────────────────
        # Robertson-Sparck Jones IDF variant (same as BM25Ranker):
        #   IDF(t) = log( (N - df(t) + 0.5) / (df(t) + 0.5) + 1 )
        idf_cache: dict[str, float] = {}
        for token in tokens:
            if token in index:
                df = index[token].doc_freq
                idf_cache[token] = math.log((N - df + 0.5) / (df + 0.5) + 1.0)

        # ── Score each candidate ──────────────────────────────────────────────
        scores: dict[int, float] = {}

        for doc_id in candidate_ids:
            # Weighted document length for BM25 length normalisation
            doc_field_lens = corpus_stats.field_lengths.get(doc_id, {})
            weighted_doc_len: float = sum(
                FIELD_WEIGHTS.get(f, 1.0) * doc_field_lens.get(f, 0)
                for f in FIELD_WEIGHTS
            )

            bm25_score: float = 0.0
            field_bonus: float = 0.0

            for token in tokens:
                if token not in index:
                    continue

                term_entry = index[token]
                idf = idf_cache[token]

                if doc_id in term_entry.postings:
                    posting = term_entry.postings[doc_id]

                    # ── BM25 component ─────────────────────────────────────
                    weighted_tf: float = sum(
                        FIELD_WEIGHTS.get(f, 1.0) * posting.fields.get(f, 0)
                        for f in FIELD_WEIGHTS
                    )
                    if weighted_tf > 0.0:
                        norm = weighted_doc_len / weighted_avgdl
                        denom = weighted_tf + k1 * (1.0 - b + b * norm)
                        bm25_score += idf * (weighted_tf * (k1 + 1.0) / denom)

                    # ── Field-bonus component (SEARCH_ENGINE_SPEC.md §10.2) ─
                    # field_bonus += Σ_f [ weight_f × (1 if tf_f > 0 else 0) ]
                    for field, weight in FIELD_WEIGHTS.items():
                        if posting.fields.get(field, 0) > 0:
                            field_bonus += weight

            # Normalise field_bonus by number of query tokens (spec §10.2)
            if n_tokens > 0:
                field_bonus /= n_tokens

            hybrid = alpha * bm25_score + (1.0 - alpha) * field_bonus

            if hybrid > 0.0:
                scores[doc_id] = hybrid

        return sorted(scores.items(), key=lambda x: x[1], reverse=True)
