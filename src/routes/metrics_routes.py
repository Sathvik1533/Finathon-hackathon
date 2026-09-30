"""Metrics aggregation and reconciliation report endpoints (JSON and CSV).
Enforces CSV formula injection neutralization.
"""

from typing import Dict, Any
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.middleware.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Metrics & Reports"])


def sanitize_csv_cell(value: Any) -> str:
    """Neutralize spreadsheet formula injection characters (=, +, -, @, tab, cr)."""
    s = str(value) if value is not None else ""
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + s
    return s


@router.get("/metrics/{run_id}")
def get_run_metrics(
    run_id: str,
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]
    run = repo.get_run(run_id, merchant_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    outcomes = repo._run_outcomes.get(run_id, [])
    exceptions = repo.list_exceptions(merchant_id=merchant_id, run_id=run_id, limit=500)

    total = len(outcomes)
    settled = sum(1 for o in outcomes if o.get("predicted_status") == "SETTLED")
    exc_count = sum(1 for o in outcomes if o.get("predicted_status") in ("EXCEPTION", "UNMATCHED"))
    match_rate = round((settled / total * 100.0), 2) if total > 0 else 0.0

    # Exceptions by category
    by_category: Dict[str, Dict[str, Any]] = {}
    for e in exceptions:
        cat = e.category
        if cat not in by_category:
            by_category[cat] = {"count": 0, "amount_at_risk_paise": 0, "severity": e.severity}
        by_category[cat]["count"] += 1
        by_category[cat]["amount_at_risk_paise"] += e.amount_at_risk_paise

    total_risk_paise = sum(e.amount_at_risk_paise for e in exceptions)

    # Benchmark calculation if ground truth is present (simulated batches)
    benchmark = None
    batch = repo.get_batch(run.batch_id, merchant_id)
    if batch and batch.source == "simulated":
        records = repo.get_batch_records(run.batch_id, merchant_id)
        internals = records.get("internal_txns", [])
        truth_map = {i["id"]: i.get("ground_truth") for i in internals if i.get("ground_truth")}

        if truth_map:
            true_positives = 0
            false_approvals = 0  # CRITICAL: target is 0
            category_correct = 0
            truth_settled = 0
            truth_exceptions = 0

            for o in outcomes:
                gt = truth_map.get(o.get("internal_txn_id"))
                if not gt:
                    continue
                exp_status = gt.get("expected_status")
                exp_cat = gt.get("expected_category")

                if exp_status == "SETTLED":
                    truth_settled += 1
                elif exp_status == "EXCEPTION":
                    truth_exceptions += 1

                if o.get("predicted_status") == "SETTLED":
                    if exp_status == "SETTLED":
                        true_positives += 1
                    else:
                        false_approvals += 1

                if o.get("predicted_status") == "EXCEPTION" and exp_status == "EXCEPTION":
                    if o.get("predicted_category") == exp_cat:
                        category_correct += 1

            precision = round(true_positives / max(1, settled), 4)
            recall = round(true_positives / max(1, truth_settled), 4)
            cat_accuracy = round(category_correct / max(1, truth_exceptions), 4)

            benchmark = {
                "precision": precision,
                "recall": recall,
                "false_approvals": false_approvals,
                "category_accuracy": cat_accuracy,
                "true_positives": true_positives,
                "truth_settled": truth_settled,
                "truth_exceptions": truth_exceptions,
            }

    return {
        "run_id": run.id,
        "batch_id": run.batch_id,
        "batch_source": batch.source if batch else "simulated",
        "total_transactions": total,
        "settled_count": settled,
        "exception_count": exc_count,
        "match_rate_pct": match_rate,
        "total_amount_at_risk_paise": total_risk_paise,
        "exceptions_by_category": by_category,
        "benchmark": benchmark,  # Null for Nova or Upload batches as required by Data Honesty rule
    }


@router.get("/reports/{run_id}")
def export_reconciliation_report(
    run_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db),
):
    repo = FinRepository(db)
    merchant_id = current_user["merchant_id"]
    run = repo.get_run(run_id, merchant_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    outcomes = repo._run_outcomes.get(run_id, [])
    exceptions = repo.list_exceptions(merchant_id=merchant_id, run_id=run_id, limit=500)
    exc_map = {e.id: e for e in exceptions}

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Run ID",
            "Internal Txn ID",
            "Predicted Status",
            "Discrepancy Category",
            "Severity",
            "Amount at Risk (INR)",
            "Review Status",
        ])

        for o in outcomes:
            exc = exc_map.get(o.get("exception_id"))
            writer.writerow([
                sanitize_csv_cell(run.id),
                sanitize_csv_cell(o.get("internal_txn_id")),
                sanitize_csv_cell(o.get("predicted_status")),
                sanitize_csv_cell(o.get("predicted_category") or "None"),
                sanitize_csv_cell(exc.severity if exc else "None"),
                sanitize_csv_cell(f"{exc.amount_at_risk_paise / 100:.2f}" if exc else "0.00"),
                sanitize_csv_cell(exc.status if exc else "SETTLED"),
            ])

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=recon_report_{run_id}.csv"},
        )

    return {
        "run_id": run.id,
        "merchant_id": merchant_id,
        "outcomes": outcomes,
        "exceptions_count": len(exceptions),
    }
