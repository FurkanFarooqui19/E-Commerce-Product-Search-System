"""
main.py — FastAPI application factory with startup/shutdown lifecycle.

Responsibilities (DEVELOPMENT_PLAN.md §1.4):
  - Create the FastAPI app instance.
  - Register startup event: create DB tables + attempt index load.
  - Mount the /api/v1/health endpoint.
  - Register all API routers (stub routers added in Phase 3).

API_SPEC.md base URL: http://localhost:8000/api/v1
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_VERSION, DEBUG
from app.database import Base, engine

# ─────────────────────────────────────────────────────────────────────────────
#  Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  Lifespan (startup / shutdown)
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    Startup:
      1. Create all database tables (idempotent — skips existing tables).
      2. Attempt to load the inverted index from disk.
         If index.pkl does not exist yet the IndexStore is left in
         is_ready=False state; the /health endpoint reports this clearly.

    Phase 2 will integrate IndexService.load_index() here.
    """
    # ── Startup ────────────────────────────────────────────────────────────
    logger.info("Starting E-Commerce Product Search System v%s", APP_VERSION)

    # Import models so their tables are registered on Base.metadata before
    # create_all is called.
    import app.models  # noqa: F401 — side-effect import

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")

    # Load index on startup
    from app.services.index_service import IndexService
    from app.database import SessionLocal
    with SessionLocal() as db:
        IndexService.load_index(db)

    logger.info("Application startup complete. Ready to serve requests.")
    yield

    # ── Shutdown ────────────────────────────────────────────────────────────
    logger.info("Application shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI application
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="E-Commerce Product Search API",
    description=(
        "Backend search engine supporting Keyword, TF-IDF, and BM25 ranking "
        "with category and price filtering. See /docs for interactive API explorer."
    ),
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Allow all origins in development (tighten in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
#  Health endpoint — /api/v1/health
#  API_SPEC.md §4.5 — returns static response in Phase 1;
#  Phase 3 will populate real index and DB counts.
# ─────────────────────────────────────────────────────────────────────────────
@app.get(
    "/api/v1/health",
    tags=["Health"],
    summary="Health check",
    response_description="System health status",
)
def health_check(response: Response) -> dict:
    """
    Returns the health status of the API, index, and database connection.

    Phase 1: index.ready is always False (index not yet built).
    Phase 3: will return real counts from IndexStore and the database.
    """
    from sqlalchemy import text

    # Quick DB ping
    db_connected = False
    product_count = 0
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM products"))
            product_count = result.scalar() or 0
            db_connected = True
    except Exception as exc:
        logger.warning("Health check DB ping failed: %s", exc)

    from app.models.index import IndexStore
    store = IndexStore()
    
    vocab_size = len(store.index) if store.is_ready else 0
    doc_count = store.corpus_stats.total_documents if (store.is_ready and store.corpus_stats) else 0

    is_healthy = bool(db_connected and store.is_ready)
    if not is_healthy:
        response.status_code = 503

    return {
        "status": "healthy" if is_healthy else "degraded",
        "index": {
            "ready": store.is_ready,
            "document_count": doc_count,
            "vocabulary_size": vocab_size,
            "built_at": None,  # Can add a timestamp if we start storing it in CorpusStats
            "note": "Index loaded successfully." if store.is_ready else "Index not loaded.",
        },
        "database": {
            "connected": db_connected,
            "product_count": product_count,
        },
        "version": APP_VERSION,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Phase 3 routers — API_SPEC.md §4
# ─────────────────────────────────────────────────────────────────────────────
from app.api.routes import search, products, categories, evaluation  # noqa: E402

app.include_router(search.router,     prefix="/api/v1")
app.include_router(products.router,   prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(evaluation.router, prefix="/api/v1")
