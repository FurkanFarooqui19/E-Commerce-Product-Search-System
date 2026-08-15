"""
models/product.py — SQLAlchemy ORM models for the product catalogue.

Tables implemented here (DATABASE.md §3):
  - categories
  - products
  - product_specifications

All column names, types, constraints, and relationships match DATABASE.md exactly.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from app.database import Base


class Category(Base):
    """
    Product category.  Supports one level of parent-child nesting.
    DATABASE.md §3.1
    """

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )

    # Relationships
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="category"
    )
    children: Mapped[list["Category"]] = relationship(
        "Category",
        backref=backref("parent", remote_side="Category.id"),
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r}>"


class Product(Base):
    """
    Core product catalogue entry.
    DATABASE.md §3.2
    """

    __tablename__ = "products"

    # Secondary indexes defined per DATABASE.md §5.2
    __table_args__ = (
        Index("idx_products_category_id", "category_id"),
        Index("idx_products_price", "price"),
        Index("idx_products_is_active", "is_active"),
        Index("idx_products_brand", "brand"),
        Index("idx_products_rating", "rating"),
        Index("idx_products_active_price", "is_active", "price"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    # Numeric(10,2) avoids floating-point rounding errors (DATABASE.md field notes)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    specifications: Mapped[list["ProductSpecification"]] = relationship(
        "ProductSpecification",
        back_populates="product",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name!r} price={self.price}>"

    def specs_as_text(self) -> str:
        """
        Concatenate all specification key-value pairs into a single string
        for use during index construction (DATABASE.md §3.3, index-time handling).
        """
        return " ".join(
            f"{s.spec_key} {s.spec_value}" for s in self.specifications
        )


class ProductSpecification(Base):
    """
    Key-value specification pairs for a product.
    Normalised to avoid wide, sparse tables.
    DATABASE.md §3.3
    """

    __tablename__ = "product_specifications"

    __table_args__ = (
        Index("idx_specs_product_id", "product_id"),
        Index("idx_specs_key", "spec_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    spec_key: Mapped[str] = mapped_column(String(100), nullable=False)
    spec_value: Mapped[str] = mapped_column(String(500), nullable=False)

    # Relationship
    product: Mapped["Product"] = relationship(
        "Product", back_populates="specifications"
    )

    def __repr__(self) -> str:
        return (
            f"<ProductSpecification product_id={self.product_id} "
            f"{self.spec_key}={self.spec_value!r}>"
        )
