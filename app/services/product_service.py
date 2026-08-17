"""
app/services/product_service.py — CRUD operations on the product catalogue.

Methods (DEVELOPMENT_PLAN.md §3.3, ARCHITECTURE.md §2.3):
  - get_by_id    — single product or None
  - get_all      — paginated product list with optional filters
  - fetch_by_ids — ordered batch fetch (preserves ranking order)
  - get_all_categories   — all Category rows with product count
  - get_category_by_id   — single Category or None
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Category, Product

logger = logging.getLogger(__name__)


class ProductService:

    # ─────────────────────────────────────────────────────────────────────────
    #  Products
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_by_id(product_id: int, db: Session) -> Optional[Product]:
        """Return the active product with the given ID, or None."""
        return (
            db.query(Product)
            .filter(Product.id == product_id, Product.is_active)
            .first()
        )

    @staticmethod
    def get_all(
        db: Session,
        *,
        page: int = 1,
        page_size: int = 20,
        category_id: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        brand: Optional[str] = None,
        is_active: bool = True,
    ) -> tuple[list[Product], int]:
        """
        Return a paginated list of products and the total count.
        API_SPEC.md §4.2 GET /products parameters.
        """
        q = db.query(Product)

        if is_active is not None:
            q = q.filter(Product.is_active == is_active)
        if category_id is not None:
            q = q.filter(Product.category_id == category_id)
        if min_price is not None:
            q = q.filter(Product.price >= min_price)
        if max_price is not None:
            q = q.filter(Product.price <= max_price)
        if brand is not None:
            q = q.filter(func.lower(Product.brand) == brand.lower())

        total = q.count()
        offset = (page - 1) * page_size
        products = q.offset(offset).limit(page_size).all()
        return products, total

    @staticmethod
    def fetch_by_ids(ids: list[int], db: Session) -> list[Product]:
        """
        Fetch products for the given IDs and return them in the same order.
        Uses an in-memory sort after the DB query to preserve rank order.
        DEVELOPMENT_PLAN.md §3.3
        """
        if not ids:
            return []
        products = db.query(Product).filter(Product.id.in_(ids)).all()
        # Restore original order (rank order from scorer)
        order = {pid: idx for idx, pid in enumerate(ids)}
        return sorted(products, key=lambda p: order.get(p.id, len(ids)))

    # ─────────────────────────────────────────────────────────────────────────
    #  Categories
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_all_categories(db: Session) -> list[tuple[Category, int]]:
        """
        Return all categories with their active product counts.
        API_SPEC.md §4.3
        """
        rows = (
            db.query(Category, func.count(Product.id).label("product_count"))
            .outerjoin(
                Product,
                (Product.category_id == Category.id) & Product.is_active,
            )
            .group_by(Category.id)
            .order_by(Category.name)
            .all()
        )
        return [(cat, count) for cat, count in rows]

    @staticmethod
    def get_category_by_id(
        category_id: int, db: Session
    ) -> Optional[tuple[Category, int]]:
        """
        Return a single category with its active product count, or None.
        API_SPEC.md §4.3
        """
        row = (
            db.query(Category, func.count(Product.id).label("product_count"))
            .outerjoin(
                Product,
                (Product.category_id == Category.id) & Product.is_active,
            )
            .filter(Category.id == category_id)
            .group_by(Category.id)
            .first()
        )
        return (row[0], row[1]) if row else None
