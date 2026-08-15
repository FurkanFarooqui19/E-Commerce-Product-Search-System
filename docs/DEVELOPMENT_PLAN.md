# Development Plan
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**References:** PRD.md, ARCHITECTURE.md, TECH_STACK.md  
**Timeline:** 5–6 Weeks (1–2 developers)

---

## Table of Contents

1. [Principles](#1-principles)
2. [Phase Overview](#2-phase-overview)
3. [Phase 1 — Foundation](#3-phase-1--foundation-week-1)
4. [Phase 2 — Core Search Engine](#4-phase-2--core-search-engine-week-2)
5. [Phase 3 — API & Evaluation](#5-phase-3--api--evaluation-week-3)
6. [Phase 4 — Advanced Features](#6-phase-4--advanced-features-week-4-5)
7. [Phase 5 — Polish & Deployment](#7-phase-5--polish--deployment-week-5-6)
8. [Dependency Graph](#8-dependency-graph)
9. [Definition of Done](#9-definition-of-done)
10. [Risk Register](#10-risk-register)

---

## 1. Principles

1. **Dependency-First Ordering** — Lower layers (data models, index, engine) are built before upper layers (services, API).
2. **Test as You Go** — Unit tests are written alongside each algorithm module, not at the end.
3. **MVP First** — Phases 1–3 deliver a fully functional, testable system. Phases 4–5 add polish.
4. **No Code Duplication** — Config values live in `config.py` only; no magic numbers scattered in code.
5. **Runnable at Every Phase** — After each phase, the system must boot and serve at least one endpoint.

---

## 2. Phase Overview

| Phase | Name | Duration | Output |
|-------|------|---------|--------|
| 1 | Foundation | Week 1 | Project scaffolding, database, seed data |
| 2 | Core Search Engine | Week 2 | Inverted index, Keyword/TF-IDF/BM25 rankers |
| 3 | API & Evaluation | Week 3 | REST API, evaluation framework, tests |
| 4 | Advanced Features | Week 4–5 | NL parser, hybrid ranking, query suggestions |
| 5 | Polish & Deployment | Week 5–6 | Docker, README, notebooks, final evaluation |

---

## 3. Phase 1 — Foundation (Week 1)

**Goal:** A working project skeleton with database, models, configuration, and seed data. The index can be built.

### Tasks

#### 1.1 Project Scaffolding

- [ ] Create directory structure as defined in `ARCHITECTURE.md §7`.
- [ ] Initialize `git` repository and `.gitignore` (ignore `*.db`, `*.pkl`, `.env`, `__pycache__`).
- [ ] Create `requirements.txt` and `requirements-dev.txt` (see `TECH_STACK.md §7`).
- [ ] Create `.env.example` with all required environment variables documented.
- [ ] Create `config.py` with all BM25 parameters, field weights, page size defaults.
- [ ] Create `pytest.ini` with coverage configuration.

**Deliverable:** `pip install -r requirements.txt` succeeds. Project structure matches spec.

---

#### 1.2 Database Setup

- [ ] Create `app/database.py` with SQLAlchemy engine and session factory.
- [ ] Create `app/models/product.py` — `Category`, `Product`, `ProductSpecification` models.
- [ ] Create `app/models/evaluation.py` — `EvaluationQuery`, `RelevanceJudgment` models.
- [ ] Initialize Alembic (`alembic init alembic`).
- [ ] Write initial Alembic migration (`alembic revision --autogenerate -m "initial_schema"`).
- [ ] Apply migration (`alembic upgrade head`).
- [ ] Write unit test: schema creates without errors on fresh SQLite.

**Deliverable:** `alembic upgrade head` creates all 5 tables. Schema matches `DATABASE.md`.

---

#### 1.3 Seed Data

- [ ] Create `app/data/seed_products.json` — 510+ products across 8 categories.
  - Electronics: 100 products (headphones, laptops, smartphones, tablets, cameras)
  - Clothing: 80 products (shirts, shoes, dresses, jackets)
  - Books: 60 products (fiction, technical, academic)
  - Home & Kitchen: 80 products (appliances, cookware, furniture)
  - Sports: 70 products (equipment, clothing, footwear)
  - Health & Beauty: 50 products (skincare, supplements, grooming)
  - Toys: 40 products (educational, games, puzzles)
  - Automotive: 30 products (accessories, tools, cleaning)
- [ ] Create `app/data/eval_queries.json` — 50 queries with relevance judgments.
  - At least 5 queries per category.
  - Each query annotated with 3–10 relevant product IDs and graded relevance (0–3).
- [ ] Write `scripts/seed_db.py` — loads JSON files, inserts to DB idempotently.
- [ ] Run seed: `python scripts/seed_db.py`.
- [ ] Verify: `SELECT COUNT(*) FROM products;` → 510+.

**Deliverable:** Database seeded. Query `SELECT * FROM products LIMIT 5;` returns realistic data.

---

#### 1.4 App Factory

- [ ] Create `app/main.py` — FastAPI application factory with startup/shutdown lifecycle.
- [ ] Register startup event that loads (or builds) the inverted index.
- [ ] Add `/api/v1/health` endpoint (returns static response initially).
- [ ] Verify: `uvicorn app.main:app --reload` starts without errors. `GET /api/v1/health` returns 200.

**Phase 1 Acceptance Criteria:**
- [ ] All tables created and seeded.
- [ ] App boots without errors.
- [ ] `/api/v1/health` returns 200.
- [ ] No hardcoded config values outside `config.py`.

---

## 4. Phase 2 — Core Search Engine (Week 2)

**Goal:** All three ranking algorithms implemented, tested, and producing correct scores. Inverted index builds and loads correctly.

> ⚡ **Critical Path** — This phase is the core intellectual contribution of the project. Spend the most time here.

### Tasks

#### 2.1 Query Preprocessor

- [ ] Create `app/engine/preprocessor.py` — `QueryPreprocessor` class.
  - Methods: `process(text: str) -> list[str]`
  - Steps: lowercase → tokenize → stopword removal (NLTK + custom) → Porter stemming.
- [ ] Write unit tests (`tests/unit/test_preprocessor.py`):
  - Test lowercasing.
  - Test stopword removal (standard + custom e-commerce stopwords).
  - Test stemming produces expected stems.
  - Test empty query returns empty list.
  - Test numeric tokens are preserved.

**Deliverable:** `preprocessor.py` with ≥90% test coverage.

---

#### 2.2 Inverted Index Builder

- [ ] Create `app/engine/index_builder.py` — `IndexBuilder` class.
  - `build(products: list[Product]) -> IndexStore`
  - Per-field preprocessing.
  - Accumulates `raw_tf`, `doc_freq`, `field_lengths`.
  - Computes `corpus_stats` (N, avgdl per field, weighted avgdl).
  - Pre-computes weighted TF for BM25 and TF-IDF.
- [ ] Create `app/models/index.py` — `TermEntry`, `PostingEntry`, `CorpusStats` dataclasses.
- [ ] Create `scripts/build_index.py` — CLI to force rebuild index.
- [ ] Write unit tests (`tests/unit/test_index_builder.py`):
  - Test posting list contains correct product IDs.
  - Test `doc_freq` is correct.
  - Test `avgdl` is computed correctly.
  - Test index serializes and deserializes correctly.

**Deliverable:** `python scripts/build_index.py` creates `data/index.pkl`. Index loads correctly.

---

#### 2.3 Index Service

- [ ] Create `app/services/index_service.py` — `IndexService`.
  - `build_index()` — calls `IndexBuilder`, serializes to pickle.
  - `load_index()` — loads from pickle, validates, populates `IndexStore` singleton.
  - `is_ready()` — returns bool.
- [ ] Integrate into `app/main.py` startup event.

---

#### 2.4 Keyword Ranker

- [ ] Create `app/engine/keyword_ranker.py` — `KeywordRanker` class.
  - `rank(tokens, candidate_ids, index) -> list[tuple[int, float]]`
  - Score = count of matching tokens per document.
- [ ] Write unit tests (`tests/unit/test_keyword_ranker.py`):
  - Test score = 0 for non-matching document.
  - Test score = N for document matching N query tokens.
  - Test results sorted descending by score.
  - Test candidate filtering works (only scored docs in candidate_ids).

---

#### 2.5 TF-IDF Ranker

- [ ] Create `app/engine/tfidf_ranker.py` — `TFIDFRanker` class.
  - `rank(tokens, candidate_ids, index, corpus_stats) -> list[tuple[int, float]]`
  - Uses log-normalized TF and smooth IDF (see `SEARCH_ENGINE_SPEC.md §5`).
  - Applies field weights.
- [ ] Write unit tests (`tests/unit/test_tfidf_ranker.py`):
  - Test IDF is higher for rare terms.
  - Test TF saturation with log normalization.
  - Test field weighting: name match ranks higher than description-only match.
  - Test score is 0 for non-matching document.
  - Test score ordering is correct with known inputs.

---

#### 2.6 BM25 Ranker

- [ ] Create `app/engine/bm25_ranker.py` — `BM25Ranker` class.
  - `rank(tokens, candidate_ids, index, corpus_stats, k1, b) -> list[tuple[int, float]]`
  - Implements Robertson-Sparck Jones BM25 IDF.
  - Applies field-weighted TF and document length normalization.
- [ ] Write unit tests (`tests/unit/test_bm25_ranker.py`):
  - Test BM25 IDF formula matches expected value for known inputs.
  - Test TF saturation: doubling TF does NOT double score (unlike keyword).
  - Test length normalization: shorter documents rank higher for same TF.
  - Test field weighting: name match scores higher than description match.
  - Test k1=0 collapses to IDF-only scoring.
  - Test b=0 disables length normalization.
  - Test score ranking order with realistic inputs.

---

#### 2.7 Filter Engine

- [ ] Create `app/engine/filter_engine.py` — `FilterEngine` class.
  - `get_candidate_ids(category, min_price, max_price, db) -> list[int]`
  - Generates SQL WHERE clause and queries the database.
  - Returns list of product IDs passing all filters.
- [ ] Write unit tests (`tests/unit/test_filter_engine.py`):
  - Test category filter (case-insensitive partial match).
  - Test price range filter (inclusive bounds).
  - Test combined filters.
  - Test no filters returns all active product IDs.
  - Test empty result returns `[]`.

---

#### 2.8 Result Fusion

- [ ] Create `app/engine/result_fusion.py` — `ResultFusion` class.
  - `normalize_and_sort(scored_results) -> list[tuple[int, float]]`
  - Min-max normalization.
  - Tie-breaking (name match > lower price > newer product).
- [ ] Write unit tests.

**Phase 2 Acceptance Criteria:**
- [ ] All three rankers implemented and unit-tested.
- [ ] BM25 unit tests verify TF saturation and length normalization.
- [ ] Index builds from seed data in < 30 seconds.
- [ ] Filter engine returns correct candidate sets.
- [ ] Unit test coverage for `app/engine/` ≥ 80%.

---

## 5. Phase 3 — API & Evaluation (Week 3)

**Goal:** Full REST API working end-to-end. Evaluation framework running. Integration tests passing.

### Tasks

#### 3.1 Pydantic Schemas

- [ ] Create `app/api/schemas/request.py` — `SearchRequest`, `EvaluationRequest`.
- [ ] Create `app/api/schemas/response.py` — `SearchResponse`, `ProductResponse`, `EvaluationReport`.
- [ ] Write unit tests for schema validation edge cases.

---

#### 3.2 Search Service

- [ ] Create `app/services/search_service.py` — `SearchService`.
  - `search(request: SearchRequest, db: Session) -> SearchResponse`
  - Orchestrates: NLParser → Preprocessor → FilterEngine → Ranker → ResultFusion → Pagination.
  - Implements fallback logic (see `SEARCH_ENGINE_SPEC.md §11`).
  - Records latency.
- [ ] Unit test: mock components; verify orchestration order.

---

#### 3.3 Product Service

- [ ] Create `app/services/product_service.py` — `ProductService`.
  - `get_by_id(product_id, db) -> Product | None`
  - `get_all(filters, page, page_size, db) -> tuple[list[Product], int]`
  - `fetch_by_ids(ids, db) -> list[Product]` (preserves rank order).

---

#### 3.4 API Routes

- [ ] Create `app/api/routes/search.py` — `GET /api/v1/search`, `GET /api/v1/search/compare`.
- [ ] Create `app/api/routes/products.py` — `GET /api/v1/products`, `GET /api/v1/products/{id}`.
- [ ] Create `app/api/routes/categories.py` — `GET /api/v1/categories`, `GET /api/v1/categories/{id}`.
- [ ] Create `app/api/routes/evaluation.py` — `POST /api/v1/evaluate`, `GET /api/v1/evaluate/query-sets`.
- [ ] Update `/api/v1/health` to return real index and database status.
- [ ] Register all routers in `app/main.py`.

---

#### 3.5 Evaluation Service

- [ ] Create `app/services/evaluation_service.py` — `EvaluationService`.
  - `run(request: EvaluationRequest, db: Session) -> EvaluationReport`
  - Computes Precision@K, Recall@K, MRR, NDCG@K for each mode.
  - Measures latency per query.
  - Generates comparison summary.
- [ ] Write unit tests with known query/result sets and expected metric values.

---

#### 3.6 Integration Tests

- [ ] Create `tests/integration/test_search_api.py`:
  - Test `GET /search?q=headphones` returns 200 with results.
  - Test mode switching (keyword/tfidf/bm25) returns different scores.
  - Test category filter reduces result count.
  - Test price filter works (all results within price range).
  - Test pagination metadata is correct.
  - Test empty query returns 400.
  - Test invalid mode returns 400.
  - Test `GET /search/compare` returns results for all modes.
- [ ] Create `tests/integration/test_evaluation_api.py`:
  - Test `POST /evaluate` returns all requested metrics.
  - Test metrics are numerically valid (0 ≤ P@K ≤ 1, etc.).
- [ ] Create `tests/integration/test_full_pipeline.py`:
  - End-to-end: seed DB → build index → search → assert top result is correct product.

**Phase 3 Acceptance Criteria:**
- [ ] All API endpoints return correct responses.
- [ ] `POST /api/v1/evaluate` returns Precision@K, Recall@K, MRR, NDCG@K for all three modes.
- [ ] BM25 outperforms Keyword on evaluation dataset (P@10 and NDCG@10).
- [ ] Integration test suite passes 100%.
- [ ] OpenAPI docs accessible at `http://localhost:8000/docs`.

---

## 6. Phase 4 — Advanced Features (Week 4–5)

**Goal:** NL parser, hybrid ranking, synonym expansion. System now handles natural-language queries intelligently.

### Tasks

#### 4.1 NL Query Parser

- [ ] Create `app/engine/nl_parser.py` — `NLQueryParser`.
  - Regex-based price extraction (all patterns from `SEARCH_ENGINE_SPEC.md §8.3`).
  - Category vocabulary matching.
  - Returns `StructuredQuery` dataclass.
- [ ] Integrate into `SearchService`.
- [ ] Unit tests for all price patterns and category hints.
- [ ] Integration test: query `"wireless headphones under 2000"` auto-applies `max_price=2000`.

---

#### 4.2 Hybrid Ranker

- [ ] Create `app/engine/hybrid_ranker.py` — `HybridRanker`.
  - `rank(tokens, candidate_ids, index, corpus_stats, alpha) -> list[tuple[int, float]]`
  - Combines BM25 score + field bonus (see `SEARCH_ENGINE_SPEC.md §10.2`).
- [ ] Expose `mode=hybrid` in API.
- [ ] Add hybrid to evaluation.
- [ ] Unit tests.

---

#### 4.3 Search Logging

- [ ] Create `search_logs` table migration.
- [ ] Log every search request in `SearchService` (async or best-effort — don't block response).
- [ ] Add `GET /api/v1/admin/logs` endpoint (basic, no auth for MVP).

---

#### 4.4 Query Suggestions / Autocomplete (Stretch Goal)

- [ ] `GET /api/v1/search/suggest?q=wire` returns top 5 matching product name prefixes.
- [ ] Backed by simple prefix scan over the index vocabulary.

**Phase 4 Acceptance Criteria:**
- [ ] NL parser correctly extracts price and category from 90% of test queries.
- [ ] Hybrid mode available and evaluated.
- [ ] Search logs persisted to database.

---

## 7. Phase 5 — Polish & Deployment (Week 5–6)

**Goal:** Production-ready packaging, documentation, and a final evaluation report.

### Tasks

#### 5.1 Docker Setup

- [ ] Write `Dockerfile` (see `TECH_STACK.md §6.1`).
- [ ] Write `docker-compose.yml` with `api` service (and optional `db` for PostgreSQL profile).
- [ ] Test: `docker-compose up` starts app; `GET /health` returns 200.
- [ ] Add `docker-compose.yml` instructions to `README.md`.

---

#### 5.2 README

- [ ] Write `README.md` with:
  - Project overview and architecture diagram (ASCII).
  - Quick start (pip + uvicorn, Docker).
  - API usage examples (curl commands).
  - How to build the index.
  - How to run evaluation.
  - How to run tests.
  - Link to all docs files.

---

#### 5.3 Jupyter Notebooks

- [ ] `notebooks/algorithm_comparison.ipynb`:
  - Runs evaluation for all modes.
  - Plots bar charts: P@K, NDCG@K by mode.
  - Shows per-query ranking differences.
- [ ] `notebooks/parameter_tuning.ipynb`:
  - Grid search BM25 k1 ∈ [1.0, 1.2, 1.5, 2.0] × b ∈ [0.5, 0.75, 1.0].
  - Plots heatmap of NDCG@10 over parameter grid.
  - Reports best k1, b combination.

---

#### 5.4 Final Evaluation Run

- [ ] Run `POST /api/v1/evaluate` against the full 50-query evaluation set.
- [ ] Verify success criteria from `PRD.md §10` are met.
- [ ] Generate `EVALUATION_RESULTS.md` with final metric table.

---

#### 5.5 Code Quality

- [ ] Run `black` formatter on all Python files.
- [ ] Run `ruff` linter; fix all issues.
- [ ] Run `mypy` type checker; resolve critical type errors.
- [ ] Final `pytest --cov` run; ensure coverage ≥ 80%.

**Phase 5 Acceptance Criteria:**
- [ ] `docker-compose up` starts the system.
- [ ] README is clear enough for a new developer to set up in 10 minutes.
- [ ] All success criteria in `PRD.md §10` are met.
- [ ] Notebooks produce charts showing BM25 > TF-IDF > Keyword.

---

## 8. Dependency Graph

```
Phase 1 (Foundation)
    ├── config.py
    ├── database.py
    ├── models/product.py
    ├── models/evaluation.py
    └── scripts/seed_db.py
           │
           ▼
Phase 2 (Core Engine)
    ├── engine/preprocessor.py ─────────────────────────┐
    ├── engine/index_builder.py (depends on preprocessor)│
    ├── engine/keyword_ranker.py (depends on index)      │
    ├── engine/tfidf_ranker.py (depends on index)        │
    ├── engine/bm25_ranker.py (depends on index)         │
    ├── engine/filter_engine.py (depends on DB models)   │
    └── engine/result_fusion.py                          │
           │                                             │
           ▼                                             │
Phase 3 (API)                                           │
    ├── api/schemas/ (depends on models)                 │
    ├── services/search_service.py (depends on all above)│
    ├── services/product_service.py                      │
    ├── services/evaluation_service.py                   │
    └── api/routes/ (depends on services)                │
           │                                             │
           ▼                                             │
Phase 4 (Advanced)                                      │
    ├── engine/nl_parser.py ─────────────────────────────┘
    └── engine/hybrid_ranker.py (depends on bm25_ranker)
           │
           ▼
Phase 5 (Deploy)
    ├── Dockerfile / docker-compose.yml
    ├── notebooks/
    └── README.md
```

---

## 9. Definition of Done

A feature/task is "done" when:

1. ✅ Code is written and reviewed (self-review for solo developers).
2. ✅ Unit tests written and passing.
3. ✅ Coverage for the modified module ≥ 80%.
4. ✅ No hardcoded values outside `config.py`.
5. ✅ Relevant docstring added to public methods.
6. ✅ Integration test passes (if applicable).
7. ✅ App still boots after the change.

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Seed data quality is poor (too generic, overlapping terms insufficient) | Medium | High | Use varied, realistic product names; include synonyms deliberately |
| BM25 doesn't outperform Keyword on evaluation set | Low | High | Tune k1/b parameters; check if eval query set is biased to exact matches |
| Index memory usage too high | Low | Medium | Profile with 510 products; limit vocabulary with min_df threshold |
| SQLite concurrency issues under load testing | Low | Low | Use WAL mode (`PRAGMA journal_mode=WAL`); switch to PostgreSQL if needed |
| NLTK punkt_tab download fails in Docker | Medium | Medium | Pre-download in Dockerfile; fallback to basic whitespace tokenizer |
| Evaluation query set relevance judgments are inconsistent | Medium | High | Use graded relevance (0–3) to reduce binary judgment ambiguity; review judgments in a second pass |
