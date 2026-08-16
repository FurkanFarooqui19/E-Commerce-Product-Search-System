import math
from app.config import FIELD_WEIGHTS
from app.models.index import CorpusStats

class TFIDFRanker:
    @staticmethod
    def rank(
        tokens: list[str],
        candidate_ids: list[int],
        index: dict,
        corpus_stats: CorpusStats
    ) -> list[tuple[int, float]]:
        """
        Rank candidates using TF-IDF with field weighting and log-normalized TF.
        tf(t, d) = 1 + log(1 + weighted_tf(t, d)) if weighted_tf > 0 else 0
        idf(t) = log((N + 1) / (df(t) + 1)) + 1
        Score = sum(tf(t, d) * idf(t)) for t in Q
        """
        if not tokens or not candidate_ids or not corpus_stats:
            return []

        N = corpus_stats.total_documents
        scores = {}

        for doc_id in candidate_ids:
            score = 0.0
            for token in tokens:
                if token in index:
                    term_entry = index[token]
                    df = term_entry.doc_freq
                    
                    # Compute smooth IDF
                    idf = math.log((N + 1) / (df + 1)) + 1.0
                    
                    if doc_id in term_entry.postings:
                        posting = term_entry.postings[doc_id]
                        # Compute weighted TF
                        weighted_tf = sum(
                            FIELD_WEIGHTS.get(field_name, 1.0) * posting.fields.get(field_name, 0)
                            for field_name in FIELD_WEIGHTS
                        )
                        
                        if weighted_tf > 0:
                            tf = 1.0 + math.log(1.0 + weighted_tf)
                            score += tf * idf
            
            if score > 0.0:
                scores[doc_id] = score

        return sorted(scores.items(), key=lambda x: x[1], reverse=True)
