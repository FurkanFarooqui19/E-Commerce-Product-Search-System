"""
app/api/routes/admin.py — Admin endpoints.

Endpoints (DEVELOPMENT_PLAN.md §4.3):
  GET /admin/logs  — paginated search log viewer with optional mode filter.

No authentication for MVP (spec: "basic, no auth for MVP").
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import VALID_SEARCH_MODES
from app.database import get_db
from app.services.log_service import SearchLogService

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


@router.get(
    "/logs",
    summary="List search logs",
    description=(
        "Returns a paginated list of persisted search log entries, "
        "ordered by most-recent first. Optionally filter by ranking mode."
    ),
)
def list_search_logs(
    mode: Optional[str] = Query(
        default=None,
        description=(
            "Filter logs by ranking mode. "
            f"Valid values: {', '.join(VALID_SEARCH_MODES)}."
        ),
    ),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(default=50, ge=1, le=200, description="Rows per page (max 200)."),
    db: Session = Depends(get_db),
) -> dict:
    """
    GET /api/v1/admin/logs

    Query parameters
    ----------------
    mode       : optional — filter to a specific ranking mode
    page       : 1-indexed page number (default 1)
    page_size  : results per page, 1-200 (default 50)

    Response shape
    --------------
    {
        "logs": [ { id, query_text, mode, category, min_price, max_price,
                    result_count, latency_ms, fallback, created_at } ],
        "pagination": { page, page_size, total_results, total_pages,
                        has_next, has_prev }
    }
    """
    return SearchLogService.list_logs(db, mode=mode, page=page, page_size=page_size)
