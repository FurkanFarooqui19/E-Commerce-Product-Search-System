import re
import nltk
from nltk.stem import PorterStemmer
from nltk.stem.snowball import SnowballStemmer
from app.config import CUSTOM_STOPWORDS, STEMMER


class QueryPreprocessor:
    def __init__(self):
        # Automatically download NLTK data if not present
        try:
            nltk.data.find("tokenizers/punkt")
        except Exception:
            nltk.download("punkt", quiet=True)
        try:
            nltk.data.find("corpora/stopwords")
        except Exception:
            nltk.download("stopwords", quiet=True)
        try:
            # We also download punkt_tab if there's any exception (like OSError)
            nltk.data.find("tokenizers/punkt_tab")
        except Exception:
            nltk.download("punkt_tab", quiet=True)

        self.stopwords = set(nltk.corpus.stopwords.words("english"))
        self.stopwords.update(CUSTOM_STOPWORDS)

        if STEMMER == "snowball":
            self.stemmer = SnowballStemmer("english")
        else:
            self.stemmer = PorterStemmer()

    def process(self, text: str) -> list[str]:
        if not text or not text.strip():
            return []
        # Lowercase and split on whitespace and punctuation
        tokens = re.split(r"[^\w]+", text.lower())
        tokens = [t for t in tokens if t]
        # Remove stopwords
        tokens = [t for t in tokens if t not in self.stopwords]
        # Perform stemming
        return [self.stemmer.stem(t) for t in tokens]
