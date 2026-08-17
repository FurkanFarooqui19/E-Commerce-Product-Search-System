import math
from app.config import FIELD_WEIGHTS
from app.models.index import CorpusStats


class BM25Ranker:
    @staticmethod
    def rank(
        tokens: list[str],
        candidate_ids: list[int],
        index: dict,
        corpus_stats: CorpusStats,
        k1: float,
        b: float,
    ) -> list[tuple[int, float]]:
        """
        Rank candidates using Robertson-Sparck Jones BM25 with length normalization and field weighting.
        tf(t, d) = weighted_tf(t, d)
        |d| = weighted_doc_length(d)
        avgdl = weighted_avgdl
        IDF(t) = log((N - df(t) + 0.5) / (df(t) + 0.5) + 1)
        """
        if not tokens or not candidate_ids or not corpus_stats:
            return []

        N = corpus_stats.total_documents
        scores = {}

        # Precompute weighted_avgdl
        weighted_avgdl = sum(
            FIELD_WEIGHTS.get(f, 1.0) * corpus_stats.avg_field_lengths.get(f, 0.0)
            for f in FIELD_WEIGHTS
        )

        for doc_id in candidate_ids:
            score = 0.0

            # Compute weighted document length
            doc_field_lens = corpus_stats.field_lengths.get(doc_id, {})
            weighted_doc_len = sum(
                FIELD_WEIGHTS.get(f, 1.0) * doc_field_lens.get(f, 0)
                for f in FIELD_WEIGHTS
            )

            for token in tokens:
                if token in index:
                    term_entry = index[token]
                    df = term_entry.doc_freq

                    # Compute Robertson-Sparck Jones IDF
                    idf = math.log((N - df + 0.5) / (df + 0.5) + 1.0)

                    if doc_id in term_entry.postings:
                        posting = term_entry.postings[doc_id]
                        # Compute weighted TF
                        weighted_tf = sum(
                            FIELD_WEIGHTS.get(f, 1.0) * posting.fields.get(f, 0)
                            for f in FIELD_WEIGHTS
                        )

                        if weighted_tf > 0:
                            # Apply length normalization denominator
                            denom = weighted_tf + k1 * (
                                1.0
                                - b
                                + b
                                * (
                                    weighted_doc_len / weighted_avgdl
                                    if weighted_avgdl > 0
                                    else 1.0
                                )
                            )
                            term_score = idf * (weighted_tf * (k1 + 1.0) / denom)
                            score += term_score

            if score > 0.0:
                scores[doc_id] = score

        return sorted(scores.items(), key=lambda x: x[1], reverse=True)
