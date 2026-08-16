import pytest
from app.engine.keyword_ranker import KeywordRanker
from app.models.index import TermEntry, PostingEntry

@pytest.fixture
def mock_index():
    # term -> doc_freq -> postings -> {doc_id: PostingEntry}
    return {
        "wireless": TermEntry(
            doc_freq=2,
            postings={
                1: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
                2: PostingEntry(fields={"name": 0, "description": 1, "category": 0, "specs": 0}, total_tf=1)
            }
        ),
        "headphon": TermEntry(
            doc_freq=1,
            postings={
                1: PostingEntry(fields={"name": 1, "description": 1, "category": 0, "specs": 0}, total_tf=2)
            }
        ),
        "laptop": TermEntry(
            doc_freq=1,
            postings={
                3: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1)
            }
        )
    }

@pytest.mark.unit
def test_keyword_ranker_scores(mock_index):
    # doc 1 contains 'wireless' and 'headphon' (matches 2 tokens)
    # doc 2 contains only 'wireless' (matches 1 token)
    # doc 3 contains only 'laptop' (matches 0 tokens of 'wireless headphon')
    tokens = ["wireless", "headphon"]
    candidates = [1, 2, 3]
    
    results = KeywordRanker.rank(tokens, candidates, mock_index)
    
    assert len(results) == 2  # doc 3 matches 0 tokens so excluded
    assert results[0] == (1, 2.0)
    assert results[1] == (2, 1.0)

@pytest.mark.unit
def test_keyword_ranker_sorting_and_filtering(mock_index):
    tokens = ["wireless", "laptop"]
    # candidates only includes 2 and 3
    candidates = [2, 3]
    
    results = KeywordRanker.rank(tokens, candidates, mock_index)
    
    # Doc 2 matches 'wireless' (score 1.0)
    # Doc 3 matches 'laptop' (score 1.0)
    assert len(results) == 2
    # Check that only candidates were scored
    assert set(doc_id for doc_id, _ in results) == {2, 3}
