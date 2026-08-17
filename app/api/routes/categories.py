"""
app/api/routes/categories.py — Category endpoints.

Endpoints (API_SPEC.md §4.3):
  GET /categories        — list all categories with product counts
  GET /categories/{id}   — single category or 404
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.response import (
    CategoryListResponse,
    SingleCategoryResponse,
)
from app.database import get_db
from app.services.product_service import ProductService

router = APIRouter(tags=["Categories"])
logger = logging.getLogger(__name__)


def _cat_row_to_dict(category, product_count: int) -> dict:
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "parent_id": category.parent_id,
        "product_count": product_count,
    }


@router.get(
    "/categories",
    response_model=CategoryListResponse,
    summary="List all categories",
)
def list_categories(db: Session = Depends(get_db)):
    rows = ProductService.get_all_categories(db)
    categories = [_cat_row_to_dict(cat, count) for cat, count in rows]
    return {"categories": categories, "total": len(categories)}


@router.get(
    "/categories/{category_id}",
    response_model=SingleCategoryResponse,
    summary="Get category by ID",
)
def get_category(category_id: int, db: Session = Depends(get_db)):
    row = ProductService.get_category_by_id(category_id, db)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "CATEGORY_NOT_FOUND",
                    "message": f"Category with id {category_id} not found",
                    "field": "id",
                }
            },
        )
    category, count = row
    return {"category": _cat_row_to_dict(category, count)}
