"""models package — SQLAlchemy ORM models."""

# Import all models so Alembic autogenerate sees them
from app.models.product import Category, Product, ProductSpecification
from app.models.evaluation import (
    EvaluationQuery,
    RelevanceJudgment,
    SearchLog,
)

__all__ = [
    "Category",
    "Product",
    "ProductSpecification",
    "EvaluationQuery",
    "RelevanceJudgment",
    "SearchLog",
]
