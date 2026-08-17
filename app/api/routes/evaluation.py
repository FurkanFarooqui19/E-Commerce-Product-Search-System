"""
app/api/routes/evaluation.py — Evaluation endpoints.

Endpoints (API_SPEC.md §4.4):
  POST /evaluate              — run evaluation benchmark
  GET  /evaluate/query-sets   — list stored evaluation query sets
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.request import EvaluationRequest
from app.api.schemas.response import EvaluationResponse, QuerySetsResponse
from app.database import get_db
from app.models.evaluation import EvaluationQuery
from app.services.evaluation_service import EvaluationService
from app.models.index import IndexStore

router = APIRouter(tags=["Evaluation"])
logger = logging.getLogger(__name__)


@router.post(
    "/evaluate",
    response_model=EvaluationResponse,
    summary="Run evaluation benchmark",
    description="Evaluate ranking quality against a query set with relevance judgments.",
)
def evaluate(request: EvaluationRequest, db: Session = Depends(get_db)):
    if not IndexStore().is_ready:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "INDEX_NOT_READY",
                    "message": "Inverted index not yet built",
                    "field": None,
                }
            },
        )

    if request.query_set_id is not None:
        # In MVP, query set 1 is the only valid stored query set
        count = db.query(EvaluationQuery).count()
        if request.query_set_id != 1 or count == 0:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "EVALUATION_SET_NOT_FOUND",
                        "message": f"Evaluation query set {request.query_set_id} not found",
                        "field": "query_set_id",
                    }
                },
            )

    try:
        result = EvaluationService.run(request, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(exc),
                    "field": None,
                }
            },
        )

    return result


@router.get(
    "/evaluate/query-sets",
    response_model=QuerySetsResponse,
    summary="List evaluation query sets",
)
def list_query_sets(db: Session = Depends(get_db)):
    """
    List available evaluation query sets stored in the database.
    For MVP: returns a single virtual query set representing all stored EvaluationQuery rows.
    API_SPEC.md §4.4
    """
    count = db.query(EvaluationQuery).count()
    if count == 0:
        return {"query_sets": []}

    # Determine earliest created_at for the virtual query set
    from sqlalchemy import func

    earliest = db.query(func.min(EvaluationQuery.created_at)).scalar()

    return {
        "query_sets": [
            {
                "id": 1,
                "name": "General Search Benchmark",
                "query_count": count,
                "created_at": earliest,
            }
        ]
    }
