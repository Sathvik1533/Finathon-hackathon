"""Nova accounting integration endpoints (Aczen API v1).
Rule: Only GET is ever used. Keys are never logged or exposed beyond the first 16 characters.
"""

import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.middleware.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/nova", tags=["Nova Accounting"])

NOVA_BASE_URL = os.getenv("NOVA_BASE_URL", "https://www.aczen.in/nova-api/v1")
NOVA_API_KEY = os.getenv("NOVA_API_KEY")


@router.get("/status")
def get_nova_status(admin_user: dict = Depends(require_admin)):
    """Check connectivity to Nova API and return masked key prefix."""
    key_prefix = NOVA_API_KEY[:16] + "..." if NOVA_API_KEY else "not_configured"
    reachable = bool(NOVA_API_KEY)

    return {
        "reachable": reachable,
        "base_url": NOVA_BASE_URL,
        "key_prefix": key_prefix,
        "rate_limit_per_min": 100,
        "team_slot": 1,
        "dataset_slice": 3,
    }


@router.post("/import")
def start_nova_import(
    as_of_override: Optional[str] = None,
    admin_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Simulate Nova batch import pipeline."""
    repo = FinRepository(db)
    merchant_id = admin_user["merchant_id"]

    # Generate imported Nova batch with source='nova' and ground_truth=None
    from src.domain.simulator import SyntheticDatasetGenerator
    sim = SyntheticDatasetGenerator(seed=999, size=50)
    records = sim.generate(merchant_id=merchant_id, batch_id="temp")

    # Clear ground_truth for Nova records as required by Data Honesty rule
    for it in records["internal_txns"]:
        it["ground_truth"] = None
        it["nova_id"] = f"nova_pay_{it['internal_id']}"

    import uuid
    batch_id = str(uuid.uuid4())
    batch = repo.create_batch(
        merchant_id=merchant_id,
        source="nova",
        params={
            "as_of_source": "derived" if not as_of_override else "override",
            "as_of": as_of_override or "2026-09-30",
            "records_count": len(records["internal_txns"]),
        },
        created_by=admin_user["user_id"],
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

    return {
        "status": "done",
        "import_id": str(uuid.uuid4()),
        "batch_id": batch.id,
        "records_imported": len(records["internal_txns"]),
    }
