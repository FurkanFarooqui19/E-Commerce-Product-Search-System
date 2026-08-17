"""
app/api/schemas/response.py — Pydantic v2 response models.

References:
    API_SPEC.md §2 (common schemas)
    API_SPEC.md §4.1 (SearchResponse)
    API_SPEC.md §4.2 (ProductResponse)
    API_SPEC.md §4.3 (CategoryResponse)
    API_SPEC.md §4.4 (EvaluationResponse)
    API_SPEC.md §4.5 (HealthResponse)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
#  Common / shared
# ─────────────────────────────────────────────────────────────────────────────

class SpecificationResponse(BaseModel):
    """Single key-value product specification. API_SPEC.md §2.1"""
    key: str
    value: str

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    """Full product object. API_SPEC.md §2.2"""
    id: int
    name: str
    description: str
    brand: str
    category: str
    category_id: int
    price: float
    stock: int
    rating: Optional[float] = None
    image_url: Optional[str] = None
    is_active: bool
    specifications: list[SpecificationResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginationMeta(BaseModel):
    """Pagination envelope. API_SPEC.md §2.4"""
    page: int
    page_size: int
    total_results: int
    total_pages: int
    has_next: bool
    has_prev: bool


# ─────────────────────────────────────────────────────────────────────────────
#  Search
# ─────────────────────────────────────────────────────────────────────────────

class FiltersApplied(BaseModel):
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class NLExtracted(BaseModel):
    """Values extracted by inline NL price parser."""
    max_price: Optional[float] = None
    min_price: Optional[float] = None
    category_hint: Optional[str] = None


class QueryMeta(BaseModel):
    """Describes how the query was interpreted. API_SPEC.md §4.1"""
    raw: str
    processed_tokens: list[str]
    mode: str
    filters_applied: FiltersApplied
    nl_extracted: NLExtracted


class SearchMetadata(BaseModel):
    """Search execution metadata. API_SPEC.md §4.1"""
    latency_ms: float
    total_candidates: int
    fallback_applied: bool
    fallback_reason: Optional[str] = None
    low_confidence: bool
    index_size: int


class SearchResultItem(BaseModel):
    """Single ranked result. API_SPEC.md §2.3"""
    rank: int
    score: float
    product: ProductResponse


class SearchResponse(BaseModel):
    """Full search response envelope. API_SPEC.md §4.1"""
    query: QueryMeta
    results: list[SearchResultItem]
    pagination: PaginationMeta
    metadata: SearchMetadata


# ─────────────────────────────────────────────────────────────────────────────
#  Search/Compare
# ─────────────────────────────────────────────────────────────────────────────

class CompareResultItem(BaseModel):
    """Single result in compare mode. API_SPEC.md §4.1 compare endpoint."""
    rank: int
    score: float
    product_id: int
    product_name: str


class CompareResponse(BaseModel):
    query: str
    processed_tokens: list[str]
    results: dict[str, list[CompareResultItem]]
    latency_ms: dict[str, float]


# ─────────────────────────────────────────────────────────────────────────────
#  Search/Suggest
# ─────────────────────────────────────────────────────────────────────────────

class SuggestResponse(BaseModel):
    """GET /search/suggest response. DEVELOPMENT_PLAN.md §4.4"""
    query: str
    suggestions: list[str]
    total: int


# ─────────────────────────────────────────────────────────────────────────────
#  Products
# ─────────────────────────────────────────────────────────────────────────────

class SingleProductResponse(BaseModel):
    """GET /products/{id} response. API_SPEC.md §4.2"""
    product: ProductResponse


class ProductListResponse(BaseModel):
    """GET /products response. API_SPEC.md §4.2"""
    products: list[ProductResponse]
    pagination: PaginationMeta


# ─────────────────────────────────────────────────────────────────────────────
#  Categories
# ─────────────────────────────────────────────────────────────────────────────

class CategoryResponse(BaseModel):
    """Single category object. API_SPEC.md §4.3"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    product_count: int

    model_config = {"from_attributes": True}


class CategoryListResponse(BaseModel):
    """GET /categories response. API_SPEC.md §4.3"""
    categories: list[CategoryResponse]
    total: int


class SingleCategoryResponse(BaseModel):
    """GET /categories/{id} response. API_SPEC.md §4.3"""
    category: CategoryResponse


# ─────────────────────────────────────────────────────────────────────────────
#  Evaluation
# ─────────────────────────────────────────────────────────────────────────────

class PerQueryMetrics(BaseModel):
    """Per-query evaluation metrics. API_SPEC.md §4.4"""
    query: str
    precision_at_k: float
    recall_at_k: float
    mrr: float
    ndcg_at_k: float
    latency_ms: float


class ModeMetrics(BaseModel):
    """Aggregate metrics for a single mode. API_SPEC.md §4.4"""
    precision_at_k: float
    recall_at_k: float
    mrr: float
    ndcg_at_k: float
    avg_latency_ms: float
    per_query: list[PerQueryMetrics]


class ComparisonSummary(BaseModel):
    bm25_vs_keyword_ndcg_improvement: Optional[str] = None
    bm25_vs_tfidf_ndcg_improvement: Optional[str] = None


class EvaluationReport(BaseModel):
    """Full evaluation report. API_SPEC.md §4.4"""
    k: int
    total_queries: int
    modes: dict[str, ModeMetrics]
    winner: str
    comparison_summary: ComparisonSummary


class EvaluationResponse(BaseModel):
    """POST /evaluate response. API_SPEC.md §4.4"""
    evaluation_report: EvaluationReport


# ─────────────────────────────────────────────────────────────────────────────
#  Query Sets
# ─────────────────────────────────────────────────────────────────────────────

class QuerySetItem(BaseModel):
    id: int
    name: str
    query_count: int
    created_at: datetime


class QuerySetsResponse(BaseModel):
    query_sets: list[QuerySetItem]


# ─────────────────────────────────────────────────────────────────────────────
#  Error
# ─────────────────────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ─────────────────────────────────────────────────────────────────────────────
#  Health
# ─────────────────────────────────────────────────────────────────────────────

class IndexHealth(BaseModel):
    ready: bool
    document_count: int = 0
    vocabulary_size: int = 0
    built_at: Optional[str] = None


class DatabaseHealth(BaseModel):
    connected: bool
    product_count: int = 0


class HealthResponse(BaseModel):
    status: str
    index: IndexHealth
    database: DatabaseHealth
    version: str
