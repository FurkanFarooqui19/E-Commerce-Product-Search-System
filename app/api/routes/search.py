"""
app/api/routes/search.py — Search endpoints.

Endpoints (API_SPEC.md §4.1):
  GET /search          — full search with mode, filters, pagination
  GET /search/compare  — run same query through multiple modes
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.schemas.response import (
    CompareResponse,
    SearchResponse,
    SuggestResponse,
)
from app.config import DEFAULT_SEARCH_MODE, MAX_PAGE_SIZE, VALID_SEARCH_MODES
from app.database import get_db
from app.engine.suggest import get_suggestions
from app.models.index import IndexStore
from app.services.search_service import SearchService

router = APIRouter(tags=["Search"])
logger = logging.getLogger(__name__)


def _require_index():
    """Raise 503 if the index is not ready."""
    if not IndexStore().is_ready:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "INDEX_NOT_READY",
                    "message": "Inverted index not yet built",
                    "field": None,
                }
            },
        )


@router.get(
    "/search",
    response_model=SearchResponse,
    summary="Search products",
    description="Search products using the specified ranking algorithm with optional filters.",
)
def search(
    q: str = Query(default="", max_length=500, description="Search query"),
    mode: str = Query(default=DEFAULT_SEARCH_MODE, description="Ranking algorithm"),
    category: Optional[str] = Query(default=None, max_length=100),
    min_price: Optional[float] = Query(default=None, ge=0.0),
    max_price: Optional[float] = Query(default=None, ge=0.0),
    page: int = Query(default=1),
    page_size: int = Query(default=10),
    db: Session = Depends(get_db),
):
    _require_index()

    # Validate empty query (strip)
    if not q.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "MISSING_QUERY",
                    "message": "Search query cannot be empty",
                    "field": "q",
                }
            },
        )

    # Validate mode
    if mode not in VALID_SEARCH_MODES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_MODE",
                    "message": f"Invalid search mode '{mode}'. Valid values: {', '.join(VALID_SEARCH_MODES)}",
                    "field": "mode",
                }
            },
        )

    # Validate price range
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PRICE_RANGE",
                    "message": "min_price must be <= max_price",
                    "field": "min_price",
                }
            },
        )

    # Validate page and page_size
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PAGE",
                    "message": "page must be >= 1",
                    "field": "page",
                }
            },
        )
    if page_size < 1 or page_size > MAX_PAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PAGE_SIZE",
                    "message": f"page_size must be between 1 and {MAX_PAGE_SIZE}",
                    "field": "page_size",
                }
            },
        )

    try:
        result = SearchService.search(
            q=q,
            mode=mode,
            category=category,
            min_price=min_price,
            max_price=max_price,
            page=page,
            page_size=page_size,
            db=db,
        )
    except RuntimeError as exc:
        if "INDEX_NOT_READY" in str(exc):
            raise HTTPException(
                status_code=503,
                detail={
                    "error": {
                        "code": "INDEX_NOT_READY",
                        "message": str(exc),
                        "field": None,
                    }
                },
            )
        raise

    # Build result items (convert ORM Product → response dict)
    result_items = []
    for item in result["results"]:
        product = item["product"]
        result_items.append(
            {
                "rank": item["rank"],
                "score": item["score"],
                "product": _product_to_dict(product),
            }
        )

    return {
        "query": result["query"],
        "results": result_items,
        "pagination": result["pagination"],
        "metadata": result["metadata"],
    }


@router.get(
    "/search/compare",
    response_model=CompareResponse,
    summary="Compare search modes",
    description="Run the same query through multiple ranking modes for side-by-side comparison.",
)
def search_compare(
    q: str = Query(default="", max_length=500),
    modes: str = Query(
        default="keyword,tfidf,bm25", description="Comma-separated list of modes"
    ),
    top_k: int = Query(default=10),
    category: Optional[str] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0.0),
    max_price: Optional[float] = Query(default=None, ge=0.0),
    db: Session = Depends(get_db),
):
    _require_index()

    # Validate empty query (strip)
    if not q.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "MISSING_QUERY",
                    "message": "Search query cannot be empty",
                    "field": "q",
                }
            },
        )

    # Validate top_k
    if top_k < 1 or top_k > MAX_PAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PAGE_SIZE",
                    "message": f"top_k must be between 1 and {MAX_PAGE_SIZE}",
                    "field": "top_k",
                }
            },
        )

    # Validate price range
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PRICE_RANGE",
                    "message": "min_price must be <= max_price",
                    "field": "min_price",
                }
            },
        )

    parsed_modes = [m.strip() for m in modes.split(",") if m.strip()]
    invalid = [m for m in parsed_modes if m not in VALID_SEARCH_MODES]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_MODE",
                    "message": f"Invalid modes: {invalid}",
                    "field": "modes",
                }
            },
        )

    raw = SearchService.compare(
        q=q,
        modes=parsed_modes,
        top_k=top_k,
        category=category,
        min_price=min_price,
        max_price=max_price,
        db=db,
    )

    return raw


@router.get(
    "/search/suggest",
    response_model=SuggestResponse,
    summary="Query suggestions / autocomplete",
    description="Returns top matching product name prefixes from the index vocabulary.",
)
def search_suggest(
    q: str = Query(default="", max_length=100, description="Query prefix to complete"),
    limit: int = Query(
        default=5, ge=1, le=20, description="Maximum number of suggestions to return"
    ),
):
    _require_index()

    if not q.strip():
        return {
            "query": q,
            "suggestions": [],
            "total": 0,
        }

    suggestions = get_suggestions(prefix=q, top_n=limit)
    return {
        "query": q,
        "suggestions": suggestions,
        "total": len(suggestions),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Helper
# ─────────────────────────────────────────────────────────────────────────────


def _product_to_dict(product) -> dict:
    """Convert a SQLAlchemy Product ORM object to a response-compatible dict."""
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "brand": product.brand,
        "category": product.category.name if product.category else "",
        "category_id": product.category_id,
        "price": float(product.price),
        "stock": product.stock,
        "rating": product.rating,
        "image_url": product.image_url,
        "is_active": product.is_active,
        "specifications": [
            {"key": s.spec_key, "value": s.spec_value} for s in product.specifications
        ],
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }
