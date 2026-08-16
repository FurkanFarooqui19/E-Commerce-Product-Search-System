import pytest
from datetime import datetime, timedelta
from app.engine.result_fusion import ResultFusion
from app.models.index import TermEntry, PostingEntry

@pytest.fixture
def sample_data():
    # Setup mock index
    index = {
        "wireless": TermEntry(
            doc_freq=2,
            postings={
                # Doc 1 has 'wireless' in 'name'
                1: PostingEntry(fields={"name": 1, "description": 0, "category": 0, "specs": 0}, total_tf=1),
                # Doc 2 has 'wireless' in 'description'
                2: PostingEntry(fields={"name": 0, "description": 1, "category": 0, "specs": 0}, total_tf=1)
            }
        )
    }
    
    # Setup mock metadata
    now = datetime.now()
    metadata = {
        # Doc 1: Has name match, price 300, older
        1: {"price": 300.0, "created_at": now - timedelta(days=2)},
        # Doc 2: No name match, price 200, newer
        2: {"price": 200.0, "created_at": now},
        # Doc 3: No name match, price 100, older
        3: {"price": 100.0, "created_at": now - timedelta(days=10)},
        # Doc 4: No name match, price 100, newer
        4: {"price": 100.0, "created_at": now}
    }
    
    return index, metadata

@pytest.mark.unit
def test_result_fusion_normalization():
    # Doc 1: score 10.0 -> normalized 1.0
    # Doc 2: score 5.0 -> normalized 0.0
    # Doc 3: score 7.5 -> normalized 0.5
    scored = [(1, 10.0), (2, 5.0), (3, 7.5)]
    results = ResultFusion.normalize_and_sort(scored, ["wireless"], {}, {})
    
    assert len(results) == 3
    results_dict = dict(results)
    assert results_dict[1] == 1.0
    assert results_dict[2] == 0.0
    assert results_dict[3] == 0.5

@pytest.mark.unit
def test_result_fusion_degenerate_normalization():
    # If all scores are equal, all normalized scores should be 1.0
    scored = [(1, 10.0), (2, 10.0)]
    results = ResultFusion.normalize_and_sort(scored, ["wireless"], {}, {})
    assert results[0][1] == 1.0
    assert results[1][1] == 1.0

@pytest.mark.unit
def test_result_fusion_tie_breaking(sample_data):
    index, metadata = sample_data
    
    # All scores are equal (10.0). Normalization sets all to 1.0.
    # Tie-breaking will decide the order.
    # Candidates: 1, 2, 3, 4
    # Expected order:
    # 1. Doc 1: Has Name match (highest tie-breaker 1)
    # 2. Doc 4: No name match, lower price 100, newer date (now)
    # 3. Doc 3: No name match, lower price 100, older date
    # 4. Doc 2: No name match, higher price 200
    scored = [(1, 10.0), (2, 10.0), (3, 10.0), (4, 10.0)]
    
    results = ResultFusion.normalize_and_sort(
        scored,
        ["wireless"],
        index,
        metadata
    )
    
    assert [doc_id for doc_id, _ in results] == [1, 4, 3, 2]

@pytest.mark.unit
def test_result_fusion_empty():
    assert ResultFusion.normalize_and_sort([], ["test"], {}, {}) == []
