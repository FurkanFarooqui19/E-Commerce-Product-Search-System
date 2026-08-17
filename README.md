# E-Commerce Product Search System

A high-performance, classical Information Retrieval (IR) search engine for an e-commerce product catalog. Built with **FastAPI**, **SQLAlchemy**, and pure-Python ranking algorithms (**Keyword Matching**, **TF-IDF**, **BM25**, and **Hybrid Ranking** with length normalization, field weighting, natural language query parsing, and autocomplete).

---

## 1. Architecture Overview

The system is structured as a **layered monolith**, providing clean separation of concerns, modular testability, and zero external IR dependencies (no Elasticsearch/Solr required).

```
┌────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                      │
│        HTTP Clients, Web Browsers, Eval Scripts        │
└───────────────────────────┬────────────────────────────┘
                            │ REST (JSON over HTTP)
┌───────────────────────────▼────────────────────────────┐
│                       API LAYER                        │
│                  FastAPI Application                   │
│         (Routing, Pydantic Schema Validation)          │
└───────────────────────────┬────────────────────────────┘
                            │ Python Service Invocations
┌───────────────────────────▼────────────────────────────┐
│                     SERVICE LAYER                      │
│   SearchService    ProductService    EvaluationService │
│   IndexService     SearchLogService                    │
└──────────────┬────────────────────────────┬────────────┘
               │                            │
 ┌─────────────▼─────────────┐       ┌──────▼────────────┐
 │    SEARCH ENGINE LAYER    │       │   FILTER ENGINE   │
 │  NLQueryParser            │       │   (SQL Candidate  │
 │  QueryPreprocessor (NLTK) │       │    Pre-Filtering) │
 │  KeywordRanker            │       └──────┬────────────┘
 │  TFIDFRanker              │              │
 │  BM25Ranker (k1, b)       │              │
 │  HybridRanker (α=0.8)     │              │
 │  ResultFusion (Min-Max)   │              │
 │  SuggestEngine (Prefix)   │              │
 └─────────────┬─────────────┘              │
               │ In-Memory Postings         │
 ┌─────────────▼─────────────┐              │
 │     INDEX STORE (RAM)     │              │
 │  Inverted Index Singleton │              │
 └─────────────┬─────────────┘              │
               │ Disk Persistence           │
┌──────────────▼────────────────────────────▼────────────┐
│                       DATA LAYER                       │
│    SQLite Database (products.db) + Pickle (index.pkl)  │
│    (Optional PostgreSQL 16 Profile for Production)     │
└────────────────────────────────────────────────────────┘
```

### Search Pipeline Lifecycle
1. **NL Query Parsing**: Extracts structured constraints (`under 2000` $\rightarrow$ `max_price=2000`, `electronics` $\rightarrow$ category hint) prior to tokenization.
2. **Preprocessing**: Lowercasing, punctuation stripping, domain stopword removal, and Porter/Snowball stemming via NLTK.
3. **Candidate Filtering**: SQL-backed pre-pass for active products, category match, and price boundaries.
4. **Scoring & Ranking**: In-memory scoring over inverted-index postings using the selected algorithm.
5. **Result Fusion & Normalization**: Global min-max score normalization to $[0.0, 1.0]$ and multi-key deterministic tie-breaking (`name match` $\rightarrow$ `price asc` $\rightarrow$ `created_at desc`).
6. **Best-Effort Analytics**: Non-blocking request logging to `search_logs`.

---

## 2. Quick Start

### Option A: Docker (Recommended)

#### Prerequisites
* [Docker 27+](https://docs.docker.com/get-docker/) & [Docker Compose v2+](https://docs.docker.com/compose/)

#### Build and Run
```bash
# 1. Build and start API in detached mode
docker compose up --build -d

# 2. View container startup logs
docker compose logs -f api

# 3. Verify health check
curl http://localhost:8000/api/v1/health

# 4. Stop containers
docker compose down
```

#### Optional PostgreSQL Profile
To launch with a PostgreSQL 16 container instead of SQLite:
```bash
docker compose --profile postgres up -d
```

---

### Option B: Local Setup (Python)

#### Prerequisites
* Python 3.10 or 3.11
* `pip` and virtual environment tool

```bash
# 1. Create and activate virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3. Seed database with catalog & evaluation queries
python scripts/seed_db.py

# 4. Build the inverted index
python scripts/build_index.py

# 5. Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger API docs will be available at: **`http://localhost:8000/docs`**

---

## 3. Building and Managing the Index

The inverted index is serialized to `app/data/index.pkl` and loaded into RAM on startup:

```bash
# Seed the database from app/data/seed_products.json
python scripts/seed_db.py

# Rebuild inverted index and compute corpus statistics
python scripts/build_index.py
```

*When the server starts up, `IndexService` automatically detects if `index.pkl` is present and builds it from the database if missing.*

---

## 4. API Usage Examples (curl)

### 1. Health Check
```bash
curl -X GET "http://localhost:8000/api/v1/health"
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "index": {
    "ready": true,
    "document_count": 510,
    "vocabulary_size": 1005,
    "built_at": null,
    "note": "Index loaded successfully."
  },
  "database": {
    "connected": true,
    "product_count": 510
  },
  "version": "1.0.0"
}
```

---

### 2. Search Products
Search using different ranking algorithms (`bm25`, `hybrid`, `tfidf`, `keyword`):

```bash
# BM25 ranking with category and max price filter
curl -X GET "http://localhost:8000/api/v1/search?q=wireless+headphones&mode=bm25&max_price=30000&page=1&page_size=5"
```

---

### 3. Natural Language Search
The engine automatically extracts price ranges and category hints from free-text queries:

```bash
# Automatically applies max_price=2000 and filters out price phrase from keywords
curl -X GET "http://localhost:8000/api/v1/search?q=wireless+headphones+under+2000&mode=hybrid"
```

---

### 4. Algorithm Comparison
Compare keyword, TF-IDF, BM25, and Hybrid results side-by-side:

```bash
curl -X GET "http://localhost:8000/api/v1/search/compare?q=laptop&modes=keyword,tfidf,bm25,hybrid&top_k=3"
```

---

### 5. Autocomplete / Query Suggestions
Scan index vocabulary for product name prefixes:

```bash
curl -X GET "http://localhost:8000/api/v1/search/suggest?q=wire&limit=5"
```
**Response (200 OK):**
```json
{
  "query": "wire",
  "suggestions": [
    "wireless"
  ],
  "total": 1
}
```

---

### 6. Product Catalog & Categories
```bash
# List products
curl -X GET "http://localhost:8000/api/v1/products?page=1&page_size=5"

# Get single product by ID
curl -X GET "http://localhost:8000/api/v1/products/1"

# List categories
curl -X GET "http://localhost:8000/api/v1/categories"
```

---

### 7. Run IR Evaluation Benchmark
Evaluate ranking precision across the query benchmark:

```bash
curl -X POST "http://localhost:8000/api/v1/evaluate" \
     -H "Content-Type: application/json" \
     -d '{
       "query_set_id": 1,
       "modes": ["keyword", "tfidf", "bm25", "hybrid"],
       "k": 10
     }'
```

---

### 8. Admin Query Analytics Logs
Inspect recent queries and system latencies:

```bash
curl -X GET "http://localhost:8000/api/v1/admin/logs?page=1&page_size=10&mode=bm25"
```

---

## 5. Running Tests & Code Coverage

The repository includes a comprehensive unit and integration test suite (160 tests):

```bash
# Run all unit and integration tests
pytest tests/unit/ tests/integration/

# Run unit tests only
pytest tests/unit/

# Run integration tests only
pytest tests/integration/

# Run tests with code coverage report for the search engine
pytest --cov=app/engine --cov-report=term-missing
```

---

## 6. Documentation Sitemap

Full system documentation is maintained in the [`docs/`](docs/) directory:

| Document | Description |
| :--- | :--- |
| [**`docs/PRD.md`**](docs/PRD.md) | Product Requirements Document, user personas, functional requirements, and success metrics. |
| [**`docs/ARCHITECTURE.md`**](docs/ARCHITECTURE.md) | System architecture, layer responsibilities, data flow diagrams, and scalability considerations. |
| [**`docs/SEARCH_ENGINE_SPEC.md`**](docs/SEARCH_ENGINE_SPEC.md) | In-depth mathematical formulas for TF-IDF, Robertson-Sparck Jones BM25, Hybrid scoring, and fusion. |
| [**`docs/API_SPEC.md`**](docs/API_SPEC.md) | REST API contract, request/response JSON schemas, query parameters, and error envelopes. |
| [**`docs/DATABASE.md`**](docs/DATABASE.md) | Relational schema, SQLite/PostgreSQL DDL, indexing strategies, and entity relationships. |
| [**`docs/TECH_STACK.md`**](docs/TECH_STACK.md) | Technical stack justification, dependency versions, and Docker configuration notes. |
| [**`docs/DEVELOPMENT_PLAN.md`**](docs/DEVELOPMENT_PLAN.md) | 5-phase engineering roadmap, task checklists, and acceptance criteria. |
