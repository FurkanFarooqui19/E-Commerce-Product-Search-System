"""
app/api/schemas/request.py — Pydantic v2 request models.

References:
    API_SPEC.md §4.1  (SearchRequest)
    API_SPEC.md §4.4  (EvaluationRequest)
    SEARCH_ENGINE_SPEC.md §13 (valid modes)
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.config import (
    DEFAULT_PAGE_SIZE,
    DEFAULT_SEARCH_MODE,
    MAX_PAGE_SIZE,
    VALID_SEARCH_MODES,
)


# ─────────────────────────────────────────────────────────────────────────────
#  Search
# ─────────────────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    """
    Query parameters for GET /api/v1/search.
    API_SPEC.md §4.1
    """

    q: str = Field(..., min_length=1, max_length=500, description="Search query")
    mode: str = Field(default=DEFAULT_SEARCH_MODE, description="Ranking algorithm")
    category: Optional[str] = Field(default=None, max_length=100, description="Category filter")
    min_price: Optional[float] = Field(default=None, ge=0.0, description="Minimum price (inclusive)")
    max_price: Optional[float] = Field(default=None, ge=0.0, description="Maximum price (inclusive)")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Results per page")

    @model_validator(mode="after")
    def validate_price_range(self) -> "SearchRequest":
        if self.min_price is not None and self.max_price is not None:
            if self.min_price > self.max_price:
                raise ValueError("min_price must be <= max_price")
        return self

    @model_validator(mode="after")
    def validate_mode(self) -> "SearchRequest":
        if self.mode not in VALID_SEARCH_MODES:
            raise ValueError(
                f"Invalid search mode '{self.mode}'. Valid values: {', '.join(VALID_SEARCH_MODES)}"
            )
        return self


class CompareRequest(BaseModel):
    """
    Query parameters for GET /api/v1/search/compare.
    API_SPEC.md §4.1 (compare endpoint)
    """

    q: str = Field(..., min_length=1, max_length=500)
    modes: str = Field(default="keyword,tfidf,bm25", description="Comma-separated modes")
    top_k: int = Field(default=10, ge=1, le=MAX_PAGE_SIZE)
    category: Optional[str] = Field(default=None, max_length=100)
    min_price: Optional[float] = Field(default=None, ge=0.0)
    max_price: Optional[float] = Field(default=None, ge=0.0)

    def parsed_modes(self) -> list[str]:
        """Return validated list of modes from the comma-separated string."""
        raw = [m.strip() for m in self.modes.split(",") if m.strip()]
        invalid = [m for m in raw if m not in VALID_SEARCH_MODES]
        if invalid:
            raise ValueError(f"Invalid modes: {invalid}")
        return raw


# ─────────────────────────────────────────────────────────────────────────────
#  Evaluation
# ─────────────────────────────────────────────────────────────────────────────

class GradedJudgment(BaseModel):
    """Single graded relevance judgment for NDCG computation."""
    product_id: int
    relevance: int = Field(..., ge=0, le=3)


class InlineQuery(BaseModel):
    """
    Inline query with relevance judgments, used when query_set_id is null.
    API_SPEC.md §4.4
    """
    query_text: str = Field(..., min_length=1)
    relevant_product_ids: list[int] = Field(default_factory=list)
    graded_judgments: list[GradedJudgment] = Field(default_factory=list)


class EvaluationFilters(BaseModel):
    """Optional filters applied to every evaluation query."""
    category: Optional[str] = None
    min_price: Optional[float] = Field(default=None, ge=0.0)
    max_price: Optional[float] = Field(default=None, ge=0.0)


class EvaluationRequest(BaseModel):
    """
    Request body for POST /api/v1/evaluate.
    API_SPEC.md §4.4
    """
    query_set_id: Optional[int] = None
    queries: list[InlineQuery] = Field(default_factory=list)
    modes: list[str] = Field(default=["keyword", "tfidf", "bm25"])
    k: int = Field(default=10, ge=1, le=100)
    filters: EvaluationFilters = Field(default_factory=EvaluationFilters)

    @model_validator(mode="after")
    def validate_has_queries(self) -> "EvaluationRequest":
        if self.query_set_id is None and not self.queries:
            raise ValueError("Either query_set_id or queries must be provided")
        return self

    @model_validator(mode="after")
    def validate_modes(self) -> "EvaluationRequest":
        invalid = [m for m in self.modes if m not in VALID_SEARCH_MODES]
        if invalid:
            raise ValueError(f"Invalid modes: {invalid}")
        return self
