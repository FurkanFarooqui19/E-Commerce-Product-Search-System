# E-Commerce Product Search System

High-performance, classical information retrieval search engine for an e-commerce product catalog. Built with **FastAPI**, **SQLAlchemy**, and pure Python ranking algorithms (**Keyword Matching**, **TF-IDF**, **BM25**, and **Hybrid Ranking** with length normalization, field weighting, natural language query parsing, and autocomplete).

---

## 1. Quick Start with Docker

### Prerequisites
* [Docker 27+](https://docs.docker.com/get-docker/) & [Docker Compose v2+](https://docs.docker.com/compose/)

### Build & Run
To build the image and start the search API service:

```bash
# Build and start the API container in detached mode
docker compose up --build -d

# Check service logs
docker compose logs -f api

# Verify health status
curl http://localhost:8000/api/v1/health

# Run a sample search query
curl "http://localhost:8000/api/v1/search?q=wireless+headphones&mode=bm25"
```

### Stop the Containers
```bash
docker compose down
```

### Optional PostgreSQL Profile
To run with PostgreSQL instead of SQLite:
```bash
docker compose --profile postgres up -d
```

---

## 2. Local Setup (Without Docker)

### Prerequisites
* Python 3.10 or 3.11
* Virtual environment tool

```bash
# 1. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate    # Linux/macOS
# or: .venv\Scripts\activate # Windows

# 2. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3. Seed database and build index
python scripts/seed_db.py
python scripts/build_index.py

# 4. Start API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 3. Key Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Health check (reports index size & database connection) |
| `/api/v1/search` | `GET` | Main search endpoint (`mode=keyword\|tfidf\|bm25\|hybrid`) |
| `/api/v1/search/compare` | `GET` | Side-by-side comparison of ranking algorithms |
| `/api/v1/search/suggest` | `GET` | Autocomplete / query suggestions |
| `/api/v1/evaluate` | `POST` | Evaluation benchmark (P@K, NDCG@K, MRR) |
| `/api/v1/admin/logs` | `GET` | Search query analytics logs |
| `/docs` | `GET` | Interactive Swagger UI API documentation |

---

## 4. Running Tests

```bash
# Run all unit and integration tests
pytest tests/unit/ tests/integration/

# Run with test coverage report
pytest --cov=app/engine --cov-report=term-missing
```

---

## 5. Documentation Reference

Detailed specifications are available in the [`docs/`](docs/) directory:
* [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
* [`docs/SEARCH_ENGINE_SPEC.md`](docs/SEARCH_ENGINE_SPEC.md) — Algorithmic & Ranking Specification
* [`docs/API_SPEC.md`](docs/API_SPEC.md) — REST API Specification
* [`docs/DATABASE.md`](docs/DATABASE.md) — Schema & Database Design
* [`docs/TECH_STACK.md`](docs/TECH_STACK.md) — Architectural Decisions & Stack Reference
* [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — Implementation Roadmap & Phases
