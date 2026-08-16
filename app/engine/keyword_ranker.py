class KeywordRanker:
    @staticmethod
    def rank(
        tokens: list[str],
        candidate_ids: list[int],
        index: dict
    ) -> list[tuple[int, float]]:
        """
        Rank candidates based on the count of matching query tokens.
        Score = sum of match(t, d) for t in Q.
        """
        if not tokens or not candidate_ids:
            return []

        scores = {}
        for doc_id in candidate_ids:
            score = 0.0
            for token in tokens:
                if token in index and doc_id in index[token].postings:
                    score += 1.0
            # Only include documents that match at least one token
            if score > 0.0:
                scores[doc_id] = score

        # Sort descending by score
        return sorted(scores.items(), key=lambda x: x[1], reverse=True)
