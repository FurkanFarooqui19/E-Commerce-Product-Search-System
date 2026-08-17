"""
config.py — Centralised configuration for the E-Commerce Product Search System.

All tuneable parameters live here. No magic numbers anywhere else.
Values can be overridden by environment variables (loaded via python-dotenv).

References:
    TECH_STACK.md §7 (dependencies)
    SEARCH_ENGINE_SPEC.md §13 (parameter reference)
    DATABASE.md §4.1 (DATABASE_URL)
"""

import os
from dotenv import load_dotenv

# Load .env file into environment (no-op if .env does not exist)
load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
#  Application
# ─────────────────────────────────────────────────────────────────────────────
APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
APP_ENV: str = os.getenv("APP_ENV", "development")
DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

# ─────────────────────────────────────────────────────────────────────────────
#  Server
# ─────────────────────────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# ─────────────────────────────────────────────────────────────────────────────
#  Database (TECH_STACK.md §4.1 — SQLite default; PostgreSQL for prod)
# ─────────────────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite:///./app/data/products.db",
)

# ─────────────────────────────────────────────────────────────────────────────
#  Index
# ─────────────────────────────────────────────────────────────────────────────
INDEX_PATH: str = os.getenv("INDEX_PATH", "app/data/index.pkl")

# ─────────────────────────────────────────────────────────────────────────────
#  BM25 Parameters (SEARCH_ENGINE_SPEC.md §6, §13)
# ─────────────────────────────────────────────────────────────────────────────
BM25_K1: float = float(os.getenv("BM25_K1", "1.5"))  # TF saturation
BM25_B: float = float(os.getenv("BM25_B", "0.75"))  # Length normalisation

# ─────────────────────────────────────────────────────────────────────────────
#  Hybrid Ranking (SEARCH_ENGINE_SPEC.md §10.2) — Phase 4
# ─────────────────────────────────────────────────────────────────────────────
HYBRID_ALPHA: float = float(os.getenv("HYBRID_ALPHA", "0.8"))  # BM25 weight

# ─────────────────────────────────────────────────────────────────────────────
#  Field Weights (SEARCH_ENGINE_SPEC.md §7.2)
# ─────────────────────────────────────────────────────────────────────────────
FIELD_WEIGHTS: dict[str, float] = {
    "name": 3.0,
    "category": 2.0,
    "description": 1.5,
    "specs": 1.0,
    "specifications": 1.0,
}

# ─────────────────────────────────────────────────────────────────────────────
#  Search Defaults (SEARCH_ENGINE_SPEC.md §13, API_SPEC.md §1)
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_SEARCH_MODE: str = os.getenv("DEFAULT_SEARCH_MODE", "bm25")
VALID_SEARCH_MODES: tuple[str, ...] = ("keyword", "tfidf", "bm25", "hybrid")

DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "10"))
MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "100"))

# Minimum normalised score below which a result is flagged as low-confidence
LOW_CONFIDENCE_THRESHOLD: float = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.05"))

# ─────────────────────────────────────────────────────────────────────────────
#  NLP (SEARCH_ENGINE_SPEC.md §2)
# ─────────────────────────────────────────────────────────────────────────────
STEMMER: str = os.getenv("STEMMER", "porter")  # options: porter | snowball

# Standard NLTK English stopwords are extended with these domain terms
# (SEARCH_ENGINE_SPEC.md §2.2)
CUSTOM_STOPWORDS: tuple[str, ...] = (
    "best",
    "good",
    "great",
    "top",
    "cheap",
    "affordable",
    "nice",
    "perfect",
    "buy",
    "get",
    "find",
    "looking",
    "want",
    "need",
    "show",
    "list",
    "available",
)

# ─────────────────────────────────────────────────────────────────────────────
#  Seed / Evaluation data paths
# ─────────────────────────────────────────────────────────────────────────────
SEED_PRODUCTS_PATH: str = "app/data/seed_products.json"
EVAL_QUERIES_PATH: str = "app/data/eval_queries.json"
