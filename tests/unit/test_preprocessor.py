import pytest
from unittest.mock import patch
from app.engine.preprocessor import QueryPreprocessor


@pytest.fixture
def preprocessor():
    return QueryPreprocessor()


@pytest.mark.unit
def test_lowercasing(preprocessor):
    assert preprocessor.process("WIRELESS HEADPHONES") == ["wireless", "headphon"]


@pytest.mark.unit
def test_stopword_removal(preprocessor):
    # 'the', 'a', 'in' are standard English stopwords
    assert preprocessor.process("the wireless in a box") == ["wireless", "box"]


@pytest.mark.unit
def test_custom_stopword_removal(preprocessor):
    # 'best', 'cheap' are custom e-commerce stopwords
    assert preprocessor.process("best cheap wireless headphones") == [
        "wireless",
        "headphon",
    ]


@pytest.mark.unit
def test_stemming(preprocessor):
    # 'running' stems to 'run', 'shoes' to 'shoe' (under Porter stemmer)
    assert preprocessor.process("running shoes") == ["run", "shoe"]


@pytest.mark.unit
def test_empty_query(preprocessor):
    assert preprocessor.process("") == []
    assert preprocessor.process("   ") == []
    assert preprocessor.process(None) == []


@pytest.mark.unit
def test_numeric_tokens_preserved(preprocessor):
    assert preprocessor.process("laptop 2024 model") == ["laptop", "2024", "model"]


@pytest.mark.unit
def test_punctuation_split(preprocessor):
    assert preprocessor.process("wireless, bluetooth-enabled; headphones.") == [
        "wireless",
        "bluetooth",
        "enabl",
        "headphon",
    ]


@pytest.mark.unit
def test_nltk_punkt_downloaded_when_missing():
    """Covers lines 12–13: nltk.download('punkt') is called when punkt data is absent."""
    with patch("nltk.data.find") as mock_find, patch("nltk.download") as mock_download:
        # Make the first find() call (punkt) raise, let the rest succeed
        mock_find.side_effect = [LookupError, None, None]
        p = QueryPreprocessor()
        mock_download.assert_any_call("punkt", quiet=True)
        assert p.process("running shoes") == ["run", "shoe"]


@pytest.mark.unit
def test_nltk_stopwords_downloaded_when_missing():
    """Covers lines 16–17: nltk.download('stopwords') is called when stopwords data is absent."""
    with patch("nltk.data.find") as mock_find, patch("nltk.download") as mock_download:
        # First find (punkt) succeeds; second (stopwords) raises; third (punkt_tab) succeeds
        mock_find.side_effect = [None, LookupError, None]
        p = QueryPreprocessor()
        mock_download.assert_any_call("stopwords", quiet=True)
        assert p.process("wireless headphones") == ["wireless", "headphon"]


@pytest.mark.unit
def test_snowball_stemmer_used_when_configured():
    """Covers line 28: SnowballStemmer is selected when STEMMER config is 'snowball'."""
    with patch("app.engine.preprocessor.STEMMER", "snowball"):
        p = QueryPreprocessor()
        from nltk.stem.snowball import SnowballStemmer

        assert isinstance(p.stemmer, SnowballStemmer)
        # Snowball also stems 'running' → 'run'
        result = p.process("running shoes")
        assert result == ["run", "shoe"]
