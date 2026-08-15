# Technology Stack
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**References:** PRD.md, ARCHITECTURE.md

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Core Technologies](#2-core-technologies)
3. [NLP & Search Libraries](#3-nlp--search-libraries)
4. [Data & Storage](#4-data--storage)
5. [Testing](#5-testing)
6. [Developer Tooling](#6-developer-tooling)
7. [Dependencies (requirements.txt)](#7-dependencies-requirementstxt)
8. [Rejected Technologies](#8-rejected-technologies)
9. [Upgrade Path](#9-upgrade-path)

---

## 1. Stack Overview

| Layer | Technology | Version | Justification |
|-------|-----------|---------|--------------|
| Language | Python | 3.11+ | Dominant language for NLP/IR; rich ecosystem |
| API Framework | FastAPI | 0.111.x | Async, Pydantic-native, auto OpenAPI docs |
| Data Validation | Pydantic v2 | 2.7.x | FastAPI integration, fast Rust-backed validation |
| ASGI Server | Uvicorn | 0.30.x | Production-grade ASGI server for FastAPI |
| ORM | SQLAlchemy | 2.0.x | Async-capable, DB-agnostic, mature |
| Database (Dev) | SQLite | Built-in | Zero setup, file-based, perfect for development |
| Database (Prod) | PostgreSQL | 16.x | Production-grade, full SQL, ACID compliance |
| NLP Toolkit | NLTK | 3.8.x | Stopwords, stemming, tokenization — battle-tested |
| Migrations | Alembic | 1.13.x | SQLAlchemy-native migration tool |
| Testing | pytest | 8.x | De facto Python testing standard |
| Coverage | pytest-cov | 5.x | Test coverage reporting |
| HTTP Testing | httpx | 0.27.x | Async HTTP client for FastAPI test client |
| Containerization | Docker + Compose | 27.x / 2.x | Portable, reproducible environment |

---

## 2. Core Technologies

### 2.1 Python 3.11+

**Version:** 3.11 minimum (3.12 recommended)  
**Justification:**
- Python 3.11 brings ~25% performance improvement over 3.10 via the Faster CPython project.
- Type hint syntax improvements (`X | Y` union types, `Self`, `TypeVarTuple`).
- All chosen libraries support 3.11+.
- Widely available in CI/CD environments and Docker images.

**Version Pin Strategy:** Pin to `python:3.11-slim` in Docker for reproducibility.

---

### 2.2 FastAPI 0.111.x

**Why FastAPI over Flask:**

| Feature | FastAPI | Flask |
|---------|---------|-------|
| Type validation | Built-in (Pydantic) | Manual |
| Async support | Native | Requires extension |
| OpenAPI docs | Auto-generated | Plugin required |
| Performance | Higher (async I/O) | Comparable (sync) |
| Schema-first | Yes | No |

**Key Features Used:**
- `Depends()` for dependency injection (database sessions, index store).
- `APIRouter` for modular route organization.
- Pydantic `BaseModel` for request/response validation.
- Automatic `/docs` (Swagger UI) and `/redoc` (ReDoc) endpoints.

---

### 2.3 Pydantic v2 (2.7.x)

**Why Pydantic v2:**
- v2 is Rust-backed — ~5–50x faster validation than v1.
- Native FastAPI 0.100+ integration.
- `model_validator`, `field_validator` decorators for custom validation.
- `model_config` replaces deprecated `class Config`.

---

### 2.4 Uvicorn 0.30.x

**Configuration:**

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

**Why Uvicorn over Gunicorn:**
- Native ASGI; Gunicorn is WSGI-first and requires `uvicorn.workers.UvicornWorker`.
- For production with multiple workers, run Gunicorn with UvicornWorker class.

---

### 2.5 SQLAlchemy 2.0.x

**Why SQLAlchemy 2.0:**
- Unified session API (`with Session(engine) as session:`).
- Async session support (`AsyncSession`) for future scaling.
- `DeclarativeBase` with full type annotation support.
- Alembic migrations work seamlessly.

**Session Management:**
```python
# Dependency injection in FastAPI
def get_db():
    with Session(engine) as session:
        yield session
```

---

## 3. NLP & Search Libraries

### 3.1 NLTK 3.8.x

**Why NLTK:**
- Provides all NLP primitives needed: tokenization, stopword lists, stemming.
- No external API calls — fully offline.
- PorterStemmer and SnowballStemmer both available.
- Extremely well-documented and stable.

**Components Used:**

| Component | NLTK Module | Usage |
|-----------|------------|-------|
| Tokenization | `word_tokenize` | Query and document tokenization |
| Stopwords | `corpus.stopwords` | English stopword list |
| Stemming | `stem.PorterStemmer` | Morphological normalization |

**Required Downloads (run once at setup):**
```python
import nltk
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('punkt_tab')  # required in NLTK 3.8+
```

**Why NOT spaCy for MVP:**
- spaCy models are large (100MB+); NLTK is lighter for this use case.
- spaCy listed as Phase 4 upgrade for lemmatization and NER-based query parsing.

---

### 3.2 Python `re` (Built-in)

Used in `NLQueryParser` for regex-based price extraction:
```python
import re
pattern = re.compile(r'under\s+(\d+(?:\.\d+)?)', re.IGNORECASE)
```

No external dependency needed.

---

### 3.3 Python `pickle` (Built-in)

Used for fast in-memory index serialization:
```python
import pickle
with open('data/index.pkl', 'wb') as f:
    pickle.dump(index_store, f, protocol=pickle.HIGHEST_PROTOCOL)
```

**Why pickle over JSON:**
- Preserves Python data types (`defaultdict`, `dataclass`, `float`) without conversion.
- Faster deserialization for large nested dictionaries.
- Acceptable for trusted internal data (not user-facing).

---

### 3.4 `math` (Built-in)

Used for TF-IDF and BM25 calculations:
```python
import math
idf = math.log((N + 1) / (df + 1)) + 1
```

No NumPy required for the core algorithms — pure Python keeps the dependency footprint minimal.

---

## 4. Data & Storage

### 4.1 SQLite (Development)

**Version:** Built into Python's `sqlite3` module (SQLite 3.40+)  
**Database File:** `app/data/products.db`

**Configuration:**
```python
DATABASE_URL = "sqlite:///./app/data/products.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
```

**Why SQLite for Development:**
- Zero setup — no server process needed.
- Cross-platform (Windows, macOS, Linux).
- SQLAlchemy abstracts all dialect differences.
- Sufficient for 10K product catalog in development.

---

### 4.2 PostgreSQL 16 (Production)

**Why PostgreSQL:**
- Full ACID compliance for concurrent writes.
- Better support for concurrent read connections.
- pg_trgm extension for optional fuzzy text matching.
- Industry standard for production Python applications.

**Production Configuration:**
```python
DATABASE_URL = "postgresql://user:password@localhost:5432/ecommerce_search"
engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
```

---

### 4.3 Alembic 1.13.x

**Why Alembic:**
- Official SQLAlchemy migration companion.
- Auto-generates migrations from model diffs.
- Supports both SQLite and PostgreSQL without changes.
- Version-controlled migration history.

---

## 5. Testing

### 5.1 pytest 8.x

**Why pytest:**
- De facto standard for Python testing.
- Fixture-based dependency injection for test setup.
- Parametrize decorator for data-driven tests.
- Rich plugin ecosystem.

**Key Fixtures Used:**
```python
@pytest.fixture
def test_client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as client:
        yield client

@pytest.fixture
def in_memory_index():
    # Build minimal index for unit tests
    ...
```

---

### 5.2 pytest-cov 5.x

**Configuration (`pytest.ini`):**
```ini
[pytest]
addopts = --cov=app/engine --cov-report=term-missing --cov-fail-under=80
testpaths = tests
```

**Coverage Target:** ≥80% for all modules in `app/engine/`.

---

### 5.3 httpx 0.27.x

**Why httpx:**
- FastAPI's `TestClient` uses `httpx` under the hood.
- Supports both sync and async test clients.
- Clean, requests-like API.

```python
from fastapi.testclient import TestClient
client = TestClient(app)
response = client.get("/api/v1/search?q=headphones")
assert response.status_code == 200
```

---

## 6. Developer Tooling

### 6.1 Docker 27.x + Docker Compose 2.x

**Why Docker:**
- Guaranteed reproducibility across developer machines and CI.
- Isolates Python version and system dependencies.
- One-command startup: `docker-compose up`.

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -m nltk.downloader punkt stopwords punkt_tab

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml services:**
- `api` — FastAPI application
- `db` — PostgreSQL (production profile only)

---

### 6.2 python-dotenv 1.0.x

**Why:**
- Load `.env` file into environment variables.
- Keeps secrets out of source code.

```python
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app/data/products.db")
```

---

### 6.3 Jupyter Notebook (Optional — Dev Only)

**Used for:**
- `notebooks/algorithm_comparison.ipynb` — interactive algorithm comparison.
- `notebooks/parameter_tuning.ipynb` — BM25 k1/b parameter grid search.

Not included in `requirements.txt`; in `requirements-dev.txt`.

---

## 7. Dependencies (requirements.txt)

```text
# API
fastapi==0.111.1
uvicorn[standard]==0.30.6
pydantic==2.7.4

# Database
sqlalchemy==2.0.31
alembic==1.13.2

# NLP
nltk==3.8.1

# Utilities
python-dotenv==1.0.1

# HTTP (for evaluation scripts calling the API)
httpx==0.27.0
```

**requirements-dev.txt:**
```text
# Testing
pytest==8.3.2
pytest-cov==5.0.0
pytest-asyncio==0.23.8

# Development
jupyter==1.0.0
ipykernel==6.29.5
black==24.8.0
ruff==0.5.7
mypy==1.11.1
pre-commit==3.8.0
```

---

## 8. Rejected Technologies

| Technology | Reason Rejected |
|-----------|----------------|
| Elasticsearch | Overkill for 500–10K products; hides algorithm internals; hard to run locally |
| Redis | Not needed until caching is required (Phase 4+) |
| Celery | No background task queue needed in MVP |
| React/Vue frontend | Out of scope; API is frontend-agnostic |
| BERT / sentence-transformers | Requires GPU or large RAM; neural search is a Phase 5 extension |
| spaCy (MVP) | Model size adds unnecessary weight; NLTK sufficient for stemming + stopwords |
| TailwindCSS | No frontend in scope |
| Whoosh | Pure Python FTS library; slower than custom BM25; less educational |
| Solr | Similar to Elasticsearch concerns; too heavy for a portfolio project |

---

## 9. Upgrade Path

The architecture is designed to accommodate these future upgrades without major refactoring:

| Current (MVP) | Future Upgrade | Trigger |
|--------------|---------------|---------|
| SQLite | PostgreSQL | Going to production |
| NLTK Porter Stemmer | spaCy Lemmatizer | Phase 4 NLP improvements |
| In-memory pickle index | Elasticsearch / Redis | Catalog > 50K products |
| BM25 + field weighting | BM25 + Dense Retrieval (ColBERT) | Phase 5 semantic search |
| No caching | Redis query cache | High traffic (>100 RPS) |
| No auth | FastAPI OAuth2 / API keys | Multi-tenant or public deployment |
