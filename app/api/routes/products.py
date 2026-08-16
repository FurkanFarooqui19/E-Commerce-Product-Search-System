"""
app/api/routes/products.py — Product catalog endpoints.

Endpoints (API_SPEC.md §4.2):
  GET /products        — paginated product list
  GET /products/{id}   — single product by ID
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.schemas.response import (
    ProductListResponse,
    ProductResponse,
    SingleProductResponse,
    SpecificationResponse,
    PaginationMeta,
)
from app.config import MAX_PAGE_SIZE
from app.database import get_db
from app.services.product_service import ProductService

router = APIRouter(tags=["Products"])
logger = logging.getLogger(__name__)


def _orm_to_product_response(product) -> dict:
    """Convert Product ORM object to ProductResponse-compatible dict."""
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
            {"key": s.spec_key, "value": s.spec_value}
            for s in product.specifications
        ],
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }


@router.get(
    "/products/{product_id}",
    response_model=SingleProductResponse,
    summary="Get product by ID",
)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = ProductService.get_by_id(product_id, db)
    if product is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "PRODUCT_NOT_FOUND",
                    "message": f"Product with id {product_id} not found",
                    "field": "id",
                }
            },
        )
    return {"product": _orm_to_product_response(product)}


@router.get(
    "/products",
    response_model=ProductListResponse,
    summary="List products",
)
def list_products(
    category_id: Optional[int] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0.0),
    max_price: Optional[float] = Query(default=None, ge=0.0),
    brand: Optional[str] = Query(default=None),
    is_active: bool = Query(default=True),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
):
    products, total = ProductService.get_all(
        db,
        page=page,
        page_size=page_size,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        brand=brand,
        is_active=is_active,
    )

    total_pages = max(1, -(-total // page_size)) if total else 0

    return {
        "products": [_orm_to_product_response(p) for p in products],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_results": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }
