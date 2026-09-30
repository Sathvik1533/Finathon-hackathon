"""Batch ingestion endpoints: J.P. Morgan synthetic generator and file uploads.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.models.schemas import SimulateBatchRequest, BatchResponse
from src.middleware.auth import get_current_user
from src.domain.simulator import SyntheticDatasetGenerator
import json
import csv
import io
import uuid

router = APIRouter(prefix="/api/batches", tags=["Batches"])


@router.post("/simulate", response_model=BatchResponse)
def simulate_batch(
    req: SimulateBatchRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]
    batch_id = str(uuid.uuid4())

    profile_params = None
    if req.profile_id:
        prof = repo.get_metric_profile(req.profile_id, merchant_id)
        if prof and prof.generator_params:
            profile_params = prof.generator_params

    # Run JPM 7-step simulator
    sim = SyntheticDatasetGenerator(
        seed=req.seed,
        size=req.size,
        fee_bps=req.fee_bps,
        gst_bps=req.gst_bps,
        settlement_lag_days=req.settlement_lag_days,
        exception_rates=req.exception_rates,
        profile_params=profile_params,
    )
    records = sim.generate(merchant_id=merchant_id, batch_id=batch_id)

    # Persist batch metadata and records
    batch = repo.create_batch(
        merchant_id=merchant_id,
        source="simulated",
        params={
            "size": req.size,
            "seed": req.seed,
            "fee_bps": req.fee_bps,
            "gst_bps": req.gst_bps,
            "settlement_lag_days": req.settlement_lag_days,
            "profile_id": req.profile_id,
            "records_count": len(records["internal_txns"]),
        },
        created_by=current_user["user_id"],
        batch_id=batch_id,
    )

    repo.save_batch_records(
        merchant_id=merchant_id,
        batch_id=batch_id,
        internal_txns=records["internal_txns"],
        gateway_txns=records["gateway_txns"],
        bank_credits=records["bank_credits"],
        refunds=records["refunds"],
        source_settlements=records["source_settlements"],
    )

    return BatchResponse(
        id=batch.id,
        merchant_id=batch.merchant_id,
        source=batch.source,
        params=batch.params,
        created_at=batch.created_at.isoformat(),
    )


@router.post("/upload", response_model=BatchResponse)
async def upload_batch(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]
    batch_id = str(uuid.uuid4())

    filename = file.filename or ""
    content = await file.read()

    internal_txns = []
    gateway_txns = []
    bank_credits = []
    refunds = []

    try:
        if filename.endswith(".json"):
            data = json.loads(content.decode("utf-8"))
            internal_txns = data.get("internal_txns", [])
            gateway_txns = data.get("gateway_txns", [])
            bank_credits = data.get("bank_credits", [])
            refunds = data.get("refunds", [])
        elif filename.endswith(".csv"):
            reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
            for row in reader:
                # Basic mapping for uploaded rows
                internal_txns.append({
                    "id": str(uuid.uuid4()),
                    "internal_id": row.get("internal_id", f"TXN-{uuid.uuid4().hex[:6]}"),
                    "order_ref": row.get("order_ref"),
                    "amount_paise": int(float(row.get("amount", 100)) * 100),
                    "created_at": row.get("created_at", "2026-09-30T10:00:00Z"),
                    "ground_truth": None,  # Uploads have no ground truth
                })
        else:
            raise HTTPException(status_code=422, detail="Only .csv and .json file uploads are supported")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse uploaded batch: {str(e)}")

    batch = repo.create_batch(
        merchant_id=merchant_id,
        source="upload",
        params={"filename": filename, "records_count": len(internal_txns)},
        created_by=current_user["user_id"],
        batch_id=batch_id,
    )

    repo.save_batch_records(
        merchant_id=merchant_id,
        batch_id=batch_id,
        internal_txns=internal_txns,
        gateway_txns=gateway_txns,
        bank_credits=bank_credits,
        refunds=refunds,
    )

    return BatchResponse(
        id=batch.id,
        merchant_id=batch.merchant_id,
        source=batch.source,
        params=batch.params,
        created_at=batch.created_at.isoformat(),
    )


@router.get("", response_model=list[BatchResponse])
def list_batches(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = FinRepository(db)
    batches = repo.list_batches(merchant_id=current_user["merchant_id"])
    return [
        BatchResponse(
            id=b.id,
            merchant_id=b.merchant_id,
            source=b.source,
            params=b.params,
            created_at=b.created_at.isoformat(),
        )
        for b in batches
    ]


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = FinRepository(db)
    batch = repo.get_batch(batch_id, merchant_id=current_user["merchant_id"])
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return BatchResponse(
        id=batch.id,
        merchant_id=batch.merchant_id,
        source=batch.source,
        params=batch.params,
        created_at=batch.created_at.isoformat(),
    )
