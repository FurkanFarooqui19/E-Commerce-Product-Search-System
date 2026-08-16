class ResultFusion:
    @staticmethod
    def normalize_and_sort(
        scored_results: list[tuple[int, float]],
        query_tokens: list[str],
        index: dict,
        product_metadata: dict[int, dict]  # {doc_id: {"price": float, "created_at": datetime}}
    ) -> list[tuple[int, float]]:
        """
        Applies min-max score normalization and tie-breaking to sort scored results.
        Ties are broken by:
          1. Matches in product name field.
          2. Lower price.
          3. Newer product (created_at descending).
        """
        if not scored_results:
            return []

        # Min-max normalization
        scores = [score for _, score in scored_results]
        max_score = max(scores)
        min_score = min(scores)
        diff = max_score - min_score

        normalized_results = []
        for doc_id, score in scored_results:
            norm_score = 1.0 if diff == 0 else (score - min_score) / diff
            normalized_results.append((doc_id, norm_score))

        # Tie-breaker sorting
        def get_sort_key(item):
            doc_id, norm_score = item
            meta = product_metadata.get(doc_id, {})
            price = float(meta.get("price", 0.0))
            created_at = meta.get("created_at")

            # Check if any query token matched the 'name' field
            name_match = any(
                token in index and
                doc_id in index[token].postings and
                index[token].postings[doc_id].fields.get("name", 0) > 0
                for token in query_tokens
            )

            # Get timestamp for date comparison
            ts = created_at.timestamp() if (created_at and hasattr(created_at, "timestamp")) else 0.0

            # Python sorts ascending. We negate descending criteria.
            return (-norm_score, -1 if name_match else 0, price, -ts)

        return sorted(normalized_results, key=get_sort_key)
