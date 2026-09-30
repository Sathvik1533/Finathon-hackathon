"""Synthetic Lab endpoints (J.P. Morgan 7-step method).
Computes metric profiles for batches, calibrates generator parameters, and compares real vs synthetic profiles.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.models.schemas import CreateProfileRequest, CompareProfilesRequest
from src.middleware.auth import get_current_user, require_admin
from src.domain.metrics import compute_metric_catalogue
from src.domain.comparator import MetricComparator

router = APIRouter(prefix="/api/lab", tags=["Synthetic Lab"])


@router.post("/profiles")
def create_profile(
    req: CreateProfileRequest,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = admin_user["merchant_id"]

    batch = repo.get_batch(req.batch_id, merchant_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.source == "upload":
        raise HTTPException(status_code=422, detail="Upload batches cannot be profiled in Synthetic Lab")

    records = repo.get_batch_records(req.batch_id, merchant_id)
    metrics = compute_metric_catalogue(
        records["internal_txns"],
        records["gateway_txns"],
        records["bank_credits"],
        records["refunds"],
    )

    kind = "real" if batch.source == "nova" else "synthetic"
    profile = repo.save_metric_profile(
        merchant_id=merchant_id,
        batch_id=batch.id,
        kind=kind,
        metrics=metrics,
        seed=batch.params.get("seed"),
        created_by=admin_user["user_id"],
    )

    return {
        "id": profile.id,
        "batch_id": profile.batch_id,
        "kind": profile.kind,
        "metrics": profile.metrics,
        "created_at": profile.created_at.isoformat(),
    }


@router.post("/calibrate/{profile_id}")
def calibrate_generator(
    profile_id: str,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = admin_user["merchant_id"]

    profile = repo.get_metric_profile(profile_id, merchant_id)
    if not profile or profile.kind != "real":
        raise HTTPException(status_code=404, detail="Real metric profile not found for calibration")

    metrics = profile.metrics
    calibrated_params = {
        "fee_bps": metrics.get("fee_ratio_bps", 200),
        "settlement_lag_days": int(metrics.get("settlement_lag_days", {}).get("p50", 2)),
        "gst_bps": 1800,
        "calibrated_from_profile_id": profile_id,
    }

    profile.generator_params = calibrated_params
    db.commit()

    return {
        "profile_id": profile.id,
        "generator_params": calibrated_params,
    }


@router.post("/compare")
def compare_profiles(
    req: CompareProfilesRequest,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = admin_user["merchant_id"]

    real_prof = repo.get_metric_profile(req.real_profile_id, merchant_id)
    synth_prof = repo.get_metric_profile(req.synthetic_profile_id, merchant_id)

    if not real_prof or not synth_prof:
        raise HTTPException(status_code=404, detail="One or both metric profiles not found")

    cfg = repo.get_latest_config(merchant_id)
    lab_cfg = cfg.values.get("lab", {}) if cfg else {}

    comparator = MetricComparator(
        tol_pass=lab_cfg.get("tol_pass", 0.10),
        tol_warn=lab_cfg.get("tol_warn", 0.25),
        ks_pass=lab_cfg.get("ks_pass", 0.10),
        ks_warn=lab_cfg.get("ks_warn", 0.20),
    )

    comparison_result = comparator.compare(real_prof.metrics, synth_prof.metrics)

    lab_comp = repo.save_lab_comparison(
        merchant_id=merchant_id,
        real_profile_id=real_prof.id,
        synth_profile_id=synth_prof.id,
        result=comparison_result,
        config_version=cfg.version if cfg else 1,
        created_by=admin_user["user_id"],
    )

    return {
        "id": lab_comp.id,
        "real_profile_id": real_prof.id,
        "synthetic_profile_id": synth_prof.id,
        "result": comparison_result,
        "created_at": lab_comp.created_at.isoformat(),
    }
