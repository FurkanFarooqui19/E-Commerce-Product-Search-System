import pytest
import math
from app.engine.tfidf_ranker import TFIDFRanker
from app.models.index import TermEntry, PostingEntry, CorpusStats

@pytest.fixture
def sample_corpus():
    # 3 documents in corpus
    stats = CorpusStats(
        total_documents=3,
        avg_doc_length=5.0,
        avg_field_lengths={"name": 2.0, "description": 3.0, "category": 0.0, "specs": 0.0},
        doc_lengths={1: 4, 2: 5, 3: 6},
        field_lengths={
            1: {"name": 2, "description": 2, "category": 0, "specs": 0},
            2: {"name": 2, "description": 3, "category": 0, "specs": 0},
            3: {"name": 2, "description": 4, "category": 0, "specs": 0}
        }
    )
    
    # 'wireless' appears in 2 docs (df=2). 'headphon' appears in 1 doc (df=1).
    index = {
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
                1: PostingEntry(fields={"name": 0, "description": 1, "category": 0, "specs": 0}, total_tf=1)
            }
        )
    }
    
    return index, stats

@pytest.mark.unit
def test_tfidf_idf_rarity(sample_corpus):
    index, stats = sample_corpus
    # Calculate idfs
    # idf(t) = log((N + 1) / (df(t) + 1)) + 1
    # N=3.
    # df('wireless') = 2 -> idf = log((3 + 1) / (2 + 1)) + 1 = log(4/3) + 1
    # df('headphon') = 1 -> idf = log((3 + 1) / (1 + 1)) + 1 = log(4/2) + 1 = log(2) + 1
    # Since 2 < 4/3 is false, df=1 should have higher idf than df=2.
    # Let's run ranker and verify.
    # Doc 1 matches 'wireless' (weighted_tf = 3.0*1 = 3.0) and 'headphon' (weighted_tf = 1.5*1 = 1.5)
    # Doc 2 matches 'wireless' (weighted_tf = 1.5*1 = 1.5)
    results = TFIDFRanker.rank(["wireless", "headphon"], [1, 2], index, stats)
    
    assert len(results) == 2
    assert results[0][0] == 1  # Doc 1 ranks first
    assert results[0][1] > results[1][1]

@pytest.mark.unit
def test_tfidf_field_weighting(sample_corpus):
    index, stats = sample_corpus
    # Doc 1 has 'wireless' in 'name' (weight 3.0).
    # Doc 2 has 'wireless' in 'description' (weight 1.5).
    # Same term 'wireless', but Doc 1 should score higher due to name match field weight.
    results = TFIDFRanker.rank(["wireless"], [1, 2], index, stats)
    
    assert len(results) == 2
    assert results[0][0] == 1  # Doc 1 should rank higher
    assert results[0][1] > results[1][1]

@pytest.mark.unit
def test_tfidf_non_matching(sample_corpus):
    index, stats = sample_corpus
    # Query is 'laptop' which is not in the corpus
    results = TFIDFRanker.rank(["laptop"], [1, 2], index, stats)
    assert results == []
