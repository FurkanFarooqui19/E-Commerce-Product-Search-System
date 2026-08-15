# System Architecture
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**References:** PRD.md, SEARCH_ENGINE_SPEC.md, TECH_STACK.md

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Layer Architecture](#2-layer-architecture)
3. [Component Breakdown](#3-component-breakdown)
4. [Data Flow](#4-data-flow)
5. [Search Flow (Detailed)](#5-search-flow-detailed)
6. [Component Interaction Diagram](#6-component-interaction-diagram)
7. [Directory Structure](#7-directory-structure)
8. [Technology Map](#8-technology-map)
9. [Design Decisions & Trade-offs](#9-design-decisions--trade-offs)
10. [Scalability Considerations](#10-scalability-considerations)

---

## 1. Architecture Overview

The system follows a **layered monolith** architecture. This choice balances:

- **Simplicity** — appropriate for a 1–2 person team and student portfolio.
- **Modularity** — each layer (API, service, engine, data) is independently testable.
- **No premature distribution** — avoids microservices complexity while keeping components decoupled via interfaces.

```
┌──────────────────────────────────────────────────┐
│                  CLIENT LAYER                     │
│         HTTP clients, evaluation scripts          │
└──────────────────────┬───────────────────────────┘
                       │ REST (JSON over HTTP)
┌──────────────────────▼───────────────────────────┐
│                   API LAYER                       │
│              FastAPI Application                  │
│        (Routing, Validation, Serialization)       │
└──────────────────────┬───────────────────────────┘
                       │ Python function calls
┌──────────────────────▼───────────────────────────┐
│                SERVICE LAYER                      │
│  SearchService   ProductService   EvalService     │
│  (Orchestrates pipeline, applies business logic)  │
└──────────────────────┬───────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
┌────────▼──────┐ ┌────▼─────┐ ┌────▼──────────┐
│  SEARCH       │ │  INDEX   │ │  FILTER       │
│  ENGINE LAYER │ │  STORE   │ │  ENGINE       │
│  (Rankers)    │ │  (RAM)   │ │  (SQL-backed) │
└────────┬──────┘ └──────────┘ └────────┬──────┘
         │                              │
┌────────▼──────────────────────────────▼──────────┐
│                   DATA LAYER                      │
│       SQLite Database + Pickle Index File         │
└──────────────────────────────────────────────────┘
```

---

## 2. Layer Architecture

### 2.1 Client Layer

External consumers of the REST API:
- HTTP clients (curl, Postman, frontend apps).
- Python evaluation scripts that programmatically call the API.
- Test harnesses in `tests/integration/`.

### 2.2 API Layer

**Technology:** FastAPI  
**Responsibility:** Accept HTTP requests, validate inputs using Pydantic schemas, delegate to the Service Layer, serialize responses.

Key principles:
- API layer contains **no business logic**.
- All route handlers call exactly one Service method.
- Pydantic models enforce type validation at the boundary.

### 2.3 Service Layer

**Responsibility:** Orchestrate the search pipeline, coordinate between the Search Engine, Filter Engine, and Database.

| Service | Responsibility |
|---------|---------------|
| `SearchService` | Runs the full search pipeline for a query |
| `ProductService` | CRUD operations on the product catalog |
| `IndexService` | Builds, loads, and validates the inverted index |
| `EvaluationService` | Runs evaluation benchmarks, computes metrics |

### 2.4 Search Engine Layer

**Responsibility:** Pure-function ranking algorithms operating on the in-memory index. No I/O.

| Component | Responsibility |
|-----------|---------------|
| `QueryPreprocessor` | Tokenize, stopword removal, stemming |
| `NLQueryParser` | Extract price/category intents from raw query |
| `KeywordRanker` | Boolean match scoring |
| `TFIDFRanker` | TF-IDF scoring |
| `BM25Ranker` | BM25 scoring (default) |
| `HybridRanker` | Combines BM25 + field bonus (Phase 4) |
| `ResultFusion` | Score normalization, tie-breaking |

### 2.5 Index Store

**Responsibility:** In-memory store for the inverted index and corpus statistics. Loaded from `data/index.pkl` at startup.

```python
class IndexStore:
    index: dict[str, TermEntry]     # inverted index
    corpus_stats: CorpusStats       # N, avgdl, doc_lengths
    is_ready: bool                  # health flag
```

### 2.6 Filter Engine

**Responsibility:** Translate filter parameters into SQL WHERE clauses; query the database to retrieve matching product IDs.

```python
class FilterEngine:
    def get_candidate_ids(
        category: str | None,
        min_price: float | None,
        max_price: float | None
    ) -> list[int]
```

### 2.7 Data Layer

**Responsibility:** Persistent storage for product catalog and evaluation annotations.

| Storage | Technology | Contents |
|---------|-----------|---------|
| Relational DB | SQLite (dev) / PostgreSQL (prod) | Products, categories, evaluation queries |
| Index file | `data/index.pkl` | Inverted index, corpus stats |

---

## 3. Component Breakdown

### 3.1 Core Components

```
app/
├── api/
│   ├── routes/
│   │   ├── search.py        # GET /api/v1/search
│   │   ├── products.py      # GET /api/v1/products/{id}, POST /api/v1/products
│   │   ├── categories.py    # GET /api/v1/categories
│   │   └── evaluation.py    # POST /api/v1/evaluate
│   ├── schemas/
│   │   ├── request.py       # SearchRequest, EvaluationRequest Pydantic models
│   │   └── response.py      # SearchResponse, ProductResponse Pydantic models
│   └── middleware.py        # Request logging, error handling
│
├── services/
│   ├── search_service.py    # SearchService: orchestrates pipeline
│   ├── product_service.py   # ProductService: product CRUD
│   ├── index_service.py     # IndexService: build/load index
│   └── evaluation_service.py# EvaluationService: metrics computation
│
├── engine/
│   ├── preprocessor.py      # QueryPreprocessor
│   ├── nl_parser.py         # NLQueryParser
│   ├── keyword_ranker.py    # KeywordRanker
│   ├── tfidf_ranker.py      # TFIDFRanker
│   ├── bm25_ranker.py       # BM25Ranker
│   ├── hybrid_ranker.py     # HybridRanker (Phase 4)
│   ├── filter_engine.py     # FilterEngine
│   ├── result_fusion.py     # Score normalization, tie-breaking
│   └── index_builder.py     # IndexBuilder: builds inverted index
│
├── models/
│   ├── product.py           # SQLAlchemy Product model
│   ├── evaluation.py        # EvaluationQuery, RelevanceJudgment models
│   └── index.py             # TermEntry, CorpusStats dataclasses
│
├── data/
│   ├── index.pkl            # Serialized inverted index (generated)
│   ├── seed_products.json   # 500+ seed products
│   └── eval_queries.json    # Evaluation query set with relevance judgments
│
├── config.py                # All tuneable parameters
├── database.py              # SQLAlchemy engine, session factory
└── main.py                  # FastAPI app factory, startup events
```

---

## 4. Data Flow

### 4.1 Startup Flow

```
1. main.py: FastAPI app created
2. database.py: SQLAlchemy engine initialized
3. IndexService.load_index():
   - Check if data/index.pkl exists
   - If not: trigger IndexService.build_index()
   - Load index into IndexStore (singleton)
4. App ready to serve requests
```

### 4.2 Index Build Flow

```
1. ProductService.get_all_products() → list[Product]
2. IndexBuilder.build(products):
   a. For each product:
      - Preprocess each field
      - Accumulate term frequencies per field
      - Record document length per field
   b. Compute corpus stats (N, avgdl per field)
   c. Compute IDF for all terms
   d. Pre-compute weighted TFs
3. Serialize to data/index.pkl
4. IndexStore updated in memory
```

### 4.3 Query Flow

```
Client → HTTP GET /api/v1/search?q=...&mode=bm25&category=...&min_price=...
    → SearchRouter.search()
    → SearchService.search(request):
        1. NLQueryParser.parse(q) → StructuredQuery
        2. QueryPreprocessor.process(clean_query) → tokens
        3. FilterEngine.get_candidate_ids(category, min_price, max_price) → [ids]
        4. Ranker.rank(tokens, candidate_ids, index) → [(product_id, score)]
        5. ResultFusion.normalize_and_sort(scored) → [(product_id, norm_score)]
        6. ProductService.fetch_by_ids(top_ids) → [Product]
        7. Build SearchResponse with pagination metadata
    → FastAPI serializes → JSON → Client
```

### 4.4 Evaluation Flow

```
Client → HTTP POST /api/v1/evaluate {query_set_id, k, modes}
    → EvaluationService.run(request):
        1. Load eval_queries for query_set_id from DB
        2. For each mode in modes:
           a. For each query:
              - Run SearchService.search(query, mode=mode)
              - Collect top-K result IDs
              - Compare to known-relevant product IDs
              - Compute P@K, R@K, MRR, NDCG@K, latency
           b. Aggregate metrics across all queries
        3. Return EvaluationReport with per-mode and per-query metrics
    → JSON → Client
```

---

## 5. Search Flow (Detailed)

```
┌──────────────────────────────────────────────────┐
│  Input: "best wireless headphones under 2000"    │
│  Params: mode=bm25, page=1, page_size=10         │
└──────────────────────┬───────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │     NL Query Parser     │
          │  Extracts: max_price=2000│
          │  clean_query: "wireless  │
          │  headphones"            │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │   Query Preprocessor    │
          │  tokens: ["wireless",   │
          │           "headphon"]   │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │     Filter Engine       │
          │  WHERE price <= 2000    │
          │  → [id1, id2, ..., idN] │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │      BM25 Ranker        │
          │  For each candidate_id: │
          │   - Lookup postings for │
          │     "wireless","headphon"│
          │   - Compute BM25 score  │
          │   - Apply field weights │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │     Result Fusion       │
          │  - Normalize scores     │
          │  - Sort descending      │
          │  - Apply tie-breaking   │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │    Product Fetcher      │
          │  Paginate: results[0:10]│
          │  Fetch product details  │
          │  from database          │
          └────────────┬────────────┘
                       │
          ┌────────────▼────────────┐
          │    JSON Response        │
          │  results, scores,       │
          │  pagination, metadata   │
          └─────────────────────────┘
```

---

## 6. Component Interaction Diagram

```
                    ┌─────────────┐
                    │  FastAPI    │
                    │  Routes     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
   │  Search     │  │  Product    │  │  Eval      │
   │  Service    │  │  Service    │  │  Service   │
   └──────┬──────┘  └──────┬──────┘  └─────┬──────┘
          │                │               │
    ┌─────┼──────┐         │               │
    │     │      │         │               │
┌───▼─┐ ┌─▼──┐ ┌▼──────┐  │           ┌───▼────┐
│ NL  │ │Pre │ │Filter │  │           │Metrics │
│Parse│ │proc│ │Engine │  │           │Computer│
└─────┘ └─┬──┘ └───┬───┘  │           └────────┘
          │        │      │
       ┌──▼────────▼──┐   │
       │  Index Store  │   │
       │  (in-memory)  │   │
       └──────┬────────┘   │
              │            │
       ┌──────▼────────────▼──┐
       │    BM25 / TF-IDF /   │
       │    Keyword Ranker     │
       └──────────┬────────────┘
                  │
       ┌──────────▼────────────┐
       │      SQLite DB        │
       │  (Products, Eval Data)│
       └───────────────────────┘
```

---

## 7. Directory Structure

```
ecommerce-search/
├── app/                        # Application source code
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, startup/shutdown events
│   ├── config.py               # Configuration (BM25 params, field weights, etc.)
│   ├── database.py             # SQLAlchemy setup
│   ├── api/
│   │   ├── routes/
│   │   │   ├── search.py
│   │   │   ├── products.py
│   │   │   ├── categories.py
│   │   │   └── evaluation.py
│   │   └── schemas/
│   │       ├── request.py
│   │       └── response.py
│   ├── services/
│   │   ├── search_service.py
│   │   ├── product_service.py
│   │   ├── index_service.py
│   │   └── evaluation_service.py
│   ├── engine/
│   │   ├── preprocessor.py
│   │   ├── nl_parser.py
│   │   ├── keyword_ranker.py
│   │   ├── tfidf_ranker.py
│   │   ├── bm25_ranker.py
│   │   ├── hybrid_ranker.py
│   │   ├── filter_engine.py
│   │   ├── result_fusion.py
│   │   └── index_builder.py
│   ├── models/
│   │   ├── product.py
│   │   ├── evaluation.py
│   │   └── index.py
│   └── data/
│       ├── index.pkl           # Generated at runtime
│       ├── seed_products.json
│       └── eval_queries.json
│
├── tests/
│   ├── unit/
│   │   ├── test_preprocessor.py
│   │   ├── test_bm25_ranker.py
│   │   ├── test_tfidf_ranker.py
│   │   ├── test_keyword_ranker.py
│   │   ├── test_nl_parser.py
│   │   └── test_filter_engine.py
│   └── integration/
│       ├── test_search_api.py
│       ├── test_evaluation_api.py
│       └── test_full_pipeline.py
│
├── scripts/
│   ├── seed_db.py              # Populate database with seed products
│   ├── build_index.py          # CLI: rebuild inverted index
│   └── run_evaluation.py       # CLI: run evaluation, print report
│
├── docs/                       # This documentation directory
├── notebooks/                  # Jupyter notebooks for experimentation
│   ├── algorithm_comparison.ipynb
│   └── parameter_tuning.ipynb
│
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── pytest.ini
└── README.md
```

---

## 8. Technology Map

| Layer | Technology | Version |
|-------|-----------|--------|
| API Framework | FastAPI | 0.111.x |
| Data Validation | Pydantic v2 | 2.7.x |
| WSGI Server | Uvicorn | 0.30.x |
| ORM | SQLAlchemy | 2.0.x |
| Database (Dev) | SQLite | Built-in |
| Database (Prod) | PostgreSQL | 16.x |
| NLP | NLTK | 3.8.x |
| Testing | pytest + pytest-cov | 8.x |
| Serialization | pickle (index), json (data) | Built-in |

Full justification in `TECH_STACK.md`.

---

## 9. Design Decisions & Trade-offs

### Decision 1: Monolith over Microservices

**Chosen:** Layered monolith.  
**Trade-off:** Less independently deployable, but far simpler to develop, debug, and run locally. The project scope does not justify service mesh complexity.

### Decision 2: In-Memory Inverted Index

**Chosen:** Load entire index into RAM at startup.  
**Trade-off:** Index limited by RAM (~500MB for 50K products). For 500–10K products this is negligible. Eliminates I/O latency during search.

### Decision 3: SQLite for Development

**Chosen:** SQLite for development; PostgreSQL-compatible schema.  
**Trade-off:** SQLite has no concurrent writes, but this is a read-heavy search system. Schema and ORM code work identically with PostgreSQL.

### Decision 4: Preprocessing at Both Index and Query Time

**Chosen:** Same preprocessing pipeline runs on documents (index time) and queries.  
**Trade-off:** Stemming reduces vocabulary size but may merge semantically different terms. Acceptable for this domain.

### Decision 5: Pre-Computed TF-IDF Weights

**Chosen:** Pre-compute and store TF-IDF weights during index build.  
**Trade-off:** Larger index file; eliminates repeated log calculations at query time.

### Decision 6: FastAPI over Flask

**Chosen:** FastAPI for built-in Pydantic validation, async support, and auto-generated OpenAPI docs.  
**Trade-off:** Slightly steeper learning curve than Flask; returns long-term value for maintainability.

---

## 10. Scalability Considerations

These are **not MVP requirements** but are designed-in to allow future growth:

| Concern | Current Design | Future Extension |
|---------|---------------|-----------------|
| Index size | In-memory pickle | Elasticsearch or Redis |
| Database | SQLite | PostgreSQL with connection pooling |
| Concurrency | FastAPI async + Uvicorn | Add Gunicorn workers |
| Index updates | Full rebuild | Incremental (partial re-index) |
| Ranking | BM25 CPU | GPU-accelerated neural reranking |
| Caching | None | Redis query cache for frequent queries |
