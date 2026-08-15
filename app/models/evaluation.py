"""
models/evaluation.py — SQLAlchemy ORM models for the evaluation framework.

Tables implemented here (DATABASE.md §3):
  - evaluation_queries
  - relevance_judgments

The search_logs table is created here too (Phase 4 populates it, but the
schema is established now per DATABASE.md §3.6 so migrations stay clean).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EvaluationQuery(Base):
    """
    Curated query used for evaluation benchmarks.
    DATABASE.md §3.4
    """

    __tablename__ = "evaluation_queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )

    # Relationships
    judgments: Mapped[list["RelevanceJudgment"]] = relationship(
        "RelevanceJudgment",
        back_populates="query",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EvaluationQuery id={self.id} query={self.query_text!r}>"


class RelevanceJudgment(Base):
    """
    Graded relevance annotation mapping an evaluation query to a product.

    Relevance scale (DATABASE.md §3.5):
        3 — Highly Relevant
        2 — Relevant
        1 — Marginally Relevant
        0 — Not Relevant
    """

    __tablename__ = "relevance_judgments"

    __table_args__ = (
        UniqueConstraint("query_id", "product_id", name="uq_judgment_query_product"),
        CheckConstraint("relevance BETWEEN 0 AND 3", name="ck_relevance_range"),
        Index("idx_judgments_query_id", "query_id"),
        Index("idx_judgments_product_id", "product_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("evaluation_queries.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    relevance: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    query: Mapped["EvaluationQuery"] = relationship(
        "EvaluationQuery", back_populates="judgments"
    )

    def __repr__(self) -> str:
        return (
            f"<RelevanceJudgment query_id={self.query_id} "
            f"product_id={self.product_id} relevance={self.relevance}>"
        )


class SearchLog(Base):
    """
    Query analytics log.  Schema created now; populated in Phase 4.
    DATABASE.md §3.6
    """

    __tablename__ = "search_logs"

    __table_args__ = (
        Index("idx_search_logs_created_at", "created_at"),
        Index("idx_search_logs_mode", "mode"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    result_count: Mapped[int] = mapped_column(Integer, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False)
    fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )

    def __repr__(self) -> str:
        return (
            f"<SearchLog id={self.id} mode={self.mode!r} "
            f"query={self.query_text!r} latency={self.latency_ms}ms>"
        )
