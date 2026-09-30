"""Reconciliation run execution and SSE live progress streaming endpoints.
"""

from datetime import datetime, timezone
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from src.db.connection import get_db, SessionLocal
from src.db.repository import FinRepository
from src.models.schemas import CreateRunRequest, RunResponse
from src.middleware.auth import get_current_user
from src.domain.engine import ReconciliationEngine

router = APIRouter(prefix="/api/runs", tags=["Runs"])


def execute_recon_job(run_id: str, merchant_id: str, batch_id: str, as_of: datetime, config_snapshot: dict):
    """Execute reconciliation engine synchronously or in threadpool."""
    db = SessionLocal()
    try:
        repo = FinRepository(db)
        repo.update_run_status(run_id, "running", {"stage": "starting", "percent": 5})

        records = repo.get_batch_records(batch_id, merchant_id)
        engine = ReconciliationEngine(config_snapshot=config_snapshot, as_of=as_of)

        def progress_cb(stage: str, stage_idx: int, total_stages: int, matches_cnt: int, exc_cnt: int):
            pct = int((stage_idx / total_stages) * 90)
            repo.update_run_status(
                run_id,
                "running",
                {
                    "stage": stage,
                    "stage_index": stage_idx,
                    "total_stages": total_stages,
                    "percent": pct,
                    "matches_found": matches_cnt,
                    "exceptions_found": exc_cnt,
                },
            )

        results = engine.execute(
            merchant_id=merchant_id,
            run_id=run_id,
            internal_txns=records["internal_txns"],
            gateway_txns=records["gateway_txns"],
            bank_credits=records["bank_credits"],
            refunds=records["refunds"],
            source_settlements=records["source_settlements"],
            progress_callback=progress_cb,
        )

        repo.save_run_outcomes(
            run_id=run_id,
            merchant_id=merchant_id,
            matches=results["matches"],
            match_items=results["match_items"],
            exceptions=results["exceptions"],
            outcomes=results["run_outcomes"],
        )

        repo.update_run_status(
            run_id,
            "done",
            {
                "stage": "completed",
                "percent": 100,
                "matches_count": len(results["matches"]),
                "exceptions_count": len(results["exceptions"]),
                "outcomes_count": len(results["run_outcomes"]),
            },
        )
    except Exception as e:
        repo = FinRepository(db)
        repo.update_run_status(run_id, "failed", error=str(e))
    finally:
        db.close()


@router.post("", response_model=RunResponse)
def start_run(
    req: CreateRunRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]

    batch = repo.get_batch(req.batch_id, merchant_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Snapshot current configuration version
    cfg = repo.get_latest_config(merchant_id)
    if not cfg:
        # Create baseline config v1
        from src.routes.config_routes import DEFAULT_CONFIG_VALUES
        cfg = repo.create_config_version(merchant_id, DEFAULT_CONFIG_VALUES, current_user["user_id"])

    as_of = (
        datetime.fromisoformat(req.as_of.replace("Z", "+00:00"))
        if req.as_of
        else datetime.now(timezone.utc)
    )

    run = repo.create_run(
        merchant_id=merchant_id,
        batch_id=req.batch_id,
        config_version=cfg.version,
        config_snapshot=cfg.values,
        as_of=as_of,
        seed=req.seed,
        created_by=current_user["user_id"],
    )

    # Run the reconciliation engine
    execute_recon_job(run.id, merchant_id, req.batch_id, as_of, cfg.values)
    db.refresh(run)

    return RunResponse(
        id=run.id,
        batch_id=run.batch_id,
        merchant_id=run.merchant_id,
        config_version=run.config_version,
        status=run.status,
        progress=run.progress,
        created_at=run.created_at.isoformat(),
    )


@router.get("/{run_id}", response_model=RunResponse)
def get_run(run_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = FinRepository(db)
    run = repo.get_run(run_id, merchant_id=current_user["merchant_id"])
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunResponse(
        id=run.id,
        batch_id=run.batch_id,
        merchant_id=run.merchant_id,
        config_version=run.config_version,
        status=run.status,
        progress=run.progress,
        created_at=run.created_at.isoformat(),
    )


@router.get("/{run_id}/stream")
async def stream_run_progress(
    run_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Server-Sent Events (SSE) stream for live progress tracking."""
    repo = FinRepository(db)
    run = repo.get_run(run_id, merchant_id=current_user["merchant_id"])
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            # Poll run progress from DB
            s_db = SessionLocal()
            try:
                s_repo = FinRepository(s_db)
                current_run = s_repo.get_run(run_id, merchant_id=current_user["merchant_id"])
                if current_run:
                    payload = {
                        "run_id": current_run.id,
                        "status": current_run.status,
                        "progress": current_run.progress,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                    if current_run.status in ("done", "failed"):
                        break
            finally:
                s_db.close()

            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
