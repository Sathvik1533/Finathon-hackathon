"""Configuration API endpoints.
Rule: Updates insert a new row with version N+1. Configuration is strictly immutable.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.models.schemas import UpdateConfigRequest
from src.middleware.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/config", tags=["Configuration"])

DEFAULT_CONFIG_VALUES = {
    "stages": [
        {"key": "txn_id_match", "enabled": True},
        {"key": "reference_match", "enabled": True},
        {"key": "partial_match", "enabled": True},
        {"key": "fee_calculation", "enabled": True},
        {"key": "refund_handling", "enabled": True},
        {"key": "settlement_match", "enabled": True},
        {"key": "classification", "enabled": True},
    ],
    "tolerance": {"amount_paise": 100, "date_window_days": 3},
    "fees": {"fee_bps": 200, "gst_bps": 1800, "rounding": "half_up"},
    "settlement": {"tolerance_paise": 100, "lag_days": 2},
    "confidence": {"auto_match_min": 0.90, "review_min": 0.60, "weights": {"amount": 0.5, "date": 0.2, "reference": 0.3}},
    "categories": {
        "FEE_MISMATCH": {"severity": "medium", "basis": "difference", "weight_bps": 10000},
        "MISSING_BANK_CREDIT": {"severity": "high", "basis": "net", "weight_bps": 10000},
        "TIMING_LAG": {"severity": "low", "basis": "net", "weight_bps": 2000},
        "AMOUNT_MISMATCH": {"severity": "high", "basis": "difference", "weight_bps": 10000},
        "PARTIAL_REFUND_NOT_REFLECTED": {"severity": "high", "basis": "difference", "weight_bps": 10000},
        "UNMATCHED_REVERSAL": {"severity": "medium", "basis": "net", "weight_bps": 8000},
        "MISSING_SETTLEMENT": {"severity": "high", "basis": "net", "weight_bps": 10000},
        "DUPLICATE_BANK_CREDIT": {"severity": "high", "basis": "net", "weight_bps": 10000},
        "DUPLICATE_PAYMENT": {"severity": "medium", "basis": "gross", "weight_bps": 10000},
        "AMBIGUOUS_MATCH": {"severity": "low", "basis": "gross", "weight_bps": 5000},
    },
    "nova": {"max_reject_pct": 2, "rate_limit_per_min": 100, "as_of_override": None},
    "lab": {
        "tol_pass": 0.10,
        "tol_warn": 0.25,
        "ks_pass": 0.10,
        "ks_warn": 0.20,
        "max_iterations": 5,
        "amount_model": "empirical_quantiles",
    },
    "razorpay": {"max_reject_pct": 2, "rate_limit_per_min": 60, "page_size": 100, "default_lookback_days": 30},
    "reference_metrics": {"fee_bps": 200, "settlement_lag_days": 2, "refund_rate_bps": 150},
}


@router.get("")
def get_config(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]
    cfg = repo.get_latest_config(merchant_id)
    if not cfg:
        cfg = repo.create_config_version(merchant_id, DEFAULT_CONFIG_VALUES, current_user["user_id"])

    return {
        "version": cfg.version,
        "values": cfg.values,
        "updated_by": cfg.updated_by,
        "change_note": cfg.change_note,
        "created_at": cfg.created_at.isoformat(),
    }


@router.put("")
def update_config(
    req: UpdateConfigRequest,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = admin_user["merchant_id"]

    # Validate ranges
    fees = req.values.get("fees", {})
    if "fee_bps" in fees and not (0 <= fees["fee_bps"] <= 10000):
        raise HTTPException(status_code=422, detail="fee_bps must be between 0 and 10000")

    cfg = repo.create_config_version(
        merchant_id=merchant_id,
        values=req.values,
        updated_by=admin_user["user_id"],
        change_note=req.change_note or "Updated by administrator",
    )

    return {
        "status": "updated",
        "new_version": cfg.version,
        "values": cfg.values,
        "change_note": cfg.change_note,
        "created_at": cfg.created_at.isoformat(),
    }
