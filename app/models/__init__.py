"""models package — SQLAlchemy ORM models."""
# Import all models so Alembic autogenerate sees them
from app.models.product import Category, Product, ProductSpecification  # noqa: F401
from app.models.evaluation import EvaluationQuery, RelevanceJudgment, SearchLog  # noqa: F401
