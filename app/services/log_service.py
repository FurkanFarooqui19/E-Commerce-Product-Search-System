"""
app/services/log_service.py — Best-effort search request logging.

Writes one row to the ``search_logs`` table after every successful
:meth:`SearchService.search` call.  All exceptions are caught and logged
at WARNING level so the search response is **never blocked or delayed**
by a logging failure.

DEVELOPMENT_PLAN.md §4.3
DATABASE.md §3.6
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.evaluation import SearchLog

logger = logging.getLogger(__name__)


class SearchLogService:
    """
    Persists search request analytics to the ``search_logs`` table.

    Usage::

        SearchLogService.log(
            db=db,
            query_text=q,
            mode=mode,
            category=used_category,
            min_price=eff_min,
            max_price=eff_max,
            result_count=total_candidates,
            latency_ms=latency_ms,
            fallback=fallback_applied,
        )
    """

    @staticmethod
    def log(
        *,
        db: Session,
        query_text: str,
        mode: str,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float],
        result_count: int,
        latency_ms: float,
        fallback: bool,
    ) -> None:
        """
        Persist a single search log entry.

        Parameters
        ----------
        db:
            Active SQLAlchemy session.  The caller is responsible for
            managing the session lifecycle; this method will commit only
            its own write.
        query_text:
            The raw (un-preprocessed) query string.
        mode:
            Ranking mode used (``"keyword"``, ``"tfidf"``, ``"bm25"``,
            ``"hybrid"``).
        category:
            Effective category filter applied (after NL extraction +
            explicit param resolution), or ``None``.
        min_price / max_price:
            Effective price bounds applied, or ``None``.
        result_count:
            Total number of candidates returned (before pagination).
        latency_ms:
            End-to-end search latency in milliseconds.
        fallback:
            ``True`` if the fallback cascade was triggered.

        Raises
        ------
        Never raises — all exceptions are swallowed and logged as warnings.
        """
        try:
            entry = SearchLog(
                query_text=query_text,
                mode=mode,
                category=category,
                min_price=min_price,
                max_price=max_price,
                result_count=result_count,
                latency_ms=round(latency_ms, 2),
                fallback=fallback,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            db.add(entry)
            db.commit()
            logger.debug(
                "Search logged: mode=%s q=%r results=%d latency=%.2fms",
                mode,
                query_text,
                result_count,
                latency_ms,
            )
        except Exception as exc:  # pragma: no cover
            # Best-effort: never let a logging failure bubble up to the user.
            db.rollback()
            logger.warning("Failed to persist search log: %s", exc)

    @staticmethod
    def list_logs(
        db: Session,
        *,
        mode: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """
        Return a paginated list of search log entries.

        Parameters
        ----------
        db:
            Active SQLAlchemy session.
        mode:
            Optional filter: only return logs with this mode value.
        page:
            1-indexed page number.
        page_size:
            Number of rows per page (max 200).

        Returns
        -------
        dict with keys: ``logs``, ``pagination``.
        """
        page_size = min(max(page_size, 1), 200)
        page = max(page, 1)
        offset = (page - 1) * page_size

        query = db.query(SearchLog)
        if mode:
            query = query.filter(SearchLog.mode == mode)

        total = query.count()
        rows = (
            query.order_by(SearchLog.created_at.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        total_pages = max(1, -(-total // page_size)) if total else 0
        return {
            "logs": [
                {
                    "id": r.id,
                    "query_text": r.query_text,
                    "mode": r.mode,
                    "category": r.category,
                    "min_price": r.min_price,
                    "max_price": r.max_price,
                    "result_count": r.result_count,
                    "latency_ms": r.latency_ms,
                    "fallback": r.fallback,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_results": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }
