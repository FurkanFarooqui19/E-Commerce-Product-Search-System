import pytest
import math
from app.engine.bm25_ranker import BM25Ranker
from app.models.index import TermEntry, PostingEntry, CorpusStats


@pytest.fixture
def sample_corpus():
    # 3 docs.
    stats = CorpusStats(
        total_documents=3,
        avg_doc_length=5.0,
        avg_field_lengths={
            "name": 2.0,
            "description": 3.0,
            "category": 0.0,
            "specs": 0.0,
        },
        doc_lengths={1: 4, 2: 5, 3: 10},
        field_lengths={
            # doc 1 is shorter (name_len=2, desc_len=2)
            1: {"name": 2, "description": 2, "category": 0, "specs": 0},
            # doc 2 is average (name_len=2, desc_len=3)
            2: {"name": 2, "description": 3, "category": 0, "specs": 0},
            # doc 3 is much longer (name_len=2, desc_len=8)
            3: {"name": 2, "description": 8, "category": 0, "specs": 0},
        },
    )

    index = {
        "wireless": TermEntry(
            doc_freq=2,
            postings={
                # Doc 1 has tf=1 in name
                1: PostingEntry(
                    fields={"name": 1, "description": 0, "category": 0, "specs": 0},
                    total_tf=1,
                ),
                # Doc 3 has tf=1 in name
                3: PostingEntry(
                    fields={"name": 1, "description": 0, "category": 0, "specs": 0},
                    total_tf=1,
                ),
            },
        ),
        "headphon": TermEntry(
            doc_freq=1,
            postings={
                # Doc 1 has tf=1 in description
                1: PostingEntry(
                    fields={"name": 0, "description": 1, "category": 0, "specs": 0},
                    total_tf=1,
                ),
                # Doc 2 has tf=2 in description (double tf)
                2: PostingEntry(
                    fields={"name": 0, "description": 2, "category": 0, "specs": 0},
                    total_tf=2,
                ),
            },
        ),
    }

    return index, stats


@pytest.mark.unit
def test_bm25_tf_saturation(sample_corpus):
    index, stats = sample_corpus
    # Check Doc 1 (tf=1 in description) vs Doc 2 (tf=2 in description)
    # With k1=1.5, tf=2 should score higher than tf=1 but NOT double.
    # Keyword ranking would double, but BM25 saturates.
    results = BM25Ranker.rank(["headphon"], [1, 2], index, stats, k1=1.5, b=0.75)

    # Doc 2 has tf=2 so it must rank higher
    assert results[0][0] == 2
    assert results[1][0] == 1

    score_tf2 = results[0][1]
    score_tf1 = results[1][1]

    # Verify score is not doubled
    assert score_tf2 < 2.0 * score_tf1


@pytest.mark.unit
def test_bm25_length_normalization(sample_corpus):
    index, stats = sample_corpus
    # Doc 1 and Doc 3 both have 'wireless' in name (same tf=1, same field).
    # Doc 1 is shorter than Doc 3.
    # With length normalization (b=0.75), shorter document (Doc 1) must score higher.
    results = BM25Ranker.rank(["wireless"], [1, 3], index, stats, k1=1.5, b=0.75)

    assert results[0][0] == 1  # Shorter document first
    assert results[0][1] > results[1][1]


@pytest.mark.unit
def test_bm25_b_zero_disables_length_norm(sample_corpus):
    index, stats = sample_corpus
    # With b=0, length normalization is disabled, so Doc 1 and Doc 3 should score identically
    results = BM25Ranker.rank(["wireless"], [1, 3], index, stats, k1=1.5, b=0.0)

    assert math.isclose(results[0][1], results[1][1])


@pytest.mark.unit
def test_bm25_k1_zero_collapses_to_idf(sample_corpus):
    index, stats = sample_corpus
    # With k1=0, TF saturation term collapses to (0+1)/(0+k1...) = 1/0? No, tf * (k1+1) / (tf + 0) = tf * 1 / tf = 1.
    # So score = idf * 1 = idf.
    # All matching documents should have score exactly equal to the IDF.
    results = BM25Ranker.rank(["headphon"], [1, 2], index, stats, k1=0.0, b=0.75)

    # Both Doc 1 and Doc 2 match 'headphon' so both should score exactly the IDF of 'headphon'
    assert math.isclose(results[0][1], results[1][1])
