"""Case dossier, exceptions queue, and human decision recording endpoints.
Enforces optimistic locking (HTTP 409 Conflict) and immutable append-only audit logging.
"""

from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.models.schemas import DecisionRequest, ExceptionResponse
from src.middleware.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Cases & Exceptions"])


def format_dt(dt) -> str:
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


@router.get("/exceptions", response_model=List[ExceptionResponse])
def list_exceptions(
    run_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    repo = FinRepository(db)
    records = repo.list_exceptions(
        merchant_id=current_user["merchant_id"],
        run_id=run_id,
        status=status,
        category=category,
        limit=limit,
    )
    return [
        ExceptionResponse(
            id=r.id,
            run_id=r.run_id,
            merchant_id=r.merchant_id,
            category=r.category,
            severity=r.severity,
            amount_at_risk_paise=r.amount_at_risk_paise,
            status=r.status,
            version=r.version,
            evidence=r.evidence,
            ai_suggestion=getattr(r, "ai_suggestion", None),
            created_at=format_dt(r.created_at),
        )
        for r in records
    ]


@router.get("/cases/{case_id}", response_model=ExceptionResponse)
def get_case_dossier(
    case_id: str,
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    repo = FinRepository(db)
    exc = repo.get_exception(case_id, merchant_id=current_user["merchant_id"])
    if not exc:
        raise HTTPException(status_code=404, detail="Case not found")

    return ExceptionResponse(
        id=exc.id,
        run_id=exc.run_id,
        merchant_id=exc.merchant_id,
        category=exc.category,
        severity=exc.severity,
        amount_at_risk_paise=exc.amount_at_risk_paise,
        status=exc.status,
        version=exc.version,
        evidence=exc.evidence,
        ai_suggestion=getattr(exc, "ai_suggestion", None),
        created_at=format_dt(exc.created_at),
    )


@router.post("/cases/{case_id}/decision", response_model=ExceptionResponse)
def record_decision(
    case_id: str,
    req: DecisionRequest,
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]

    success, exc = repo.record_decision(
        exception_id=case_id,
        merchant_id=merchant_id,
        actor_id=current_user["user_id"],
        action=req.action,
        rationale=req.rationale.strip(),
        expected_version=req.expected_version,
    )

    if not exc:
        raise HTTPException(status_code=404, detail="Case not found")

    if not success:
        # Optimistic concurrency conflict detected!
        raise HTTPException(
            status_code=409,
            detail={
                "error": "Conflict: Case was already modified by another analyst.",
                "current_version": exc.version,
                "current_status": exc.status,
            },
        )

    return ExceptionResponse(
        id=exc.id,
        run_id=exc.run_id,
        merchant_id=exc.merchant_id,
        category=exc.category,
        severity=exc.severity,
        amount_at_risk_paise=exc.amount_at_risk_paise,
        status=exc.status,
        version=exc.version,
        evidence=exc.evidence,
        ai_suggestion=getattr(exc, "ai_suggestion", None),
        created_at=format_dt(exc.created_at),
    )


@router.get("/audit")
def list_audit_trail(
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    repo = FinRepository(db)
    logs = repo.list_audit_logs(merchant_id=current_user["merchant_id"], limit=limit)
    return [
        {
            "id": l.id,
            "merchant_id": l.merchant_id,
            "exception_id": l.exception_id,
            "actor_id": l.actor_id,
            "action": l.action,
            "previous_state": l.previous_state,
            "new_state": l.new_state,
            "rationale": l.rationale,
            "ai_suggestion_shown": l.ai_suggestion_shown,
            "created_at": format_dt(l.created_at),
        }
        for l in logs
    ]
