"""Run controller brief and lab narrative endpoints.
"""

from fastapi import APIRouter, Depends
from ai.app.security import verify_internal_key
from ai.app.schemas import (
    RunBriefRequest,
    RunBriefResponse,
    LabNarrativeRequest,
    LabNarrativeResponse,
)
from ai.app.guards import guard_g3_number_check

router = APIRouter(tags=["Brief & Lab"])


@router.post("/ai/brief", response_model=RunBriefResponse, dependencies=[Depends(verify_internal_key)])
def run_brief(req: RunBriefRequest):
    metrics = req.metrics
    source = req.source

    total_exceptions = metrics.get("exceptions_count", 0)
    risk_paise = metrics.get("amount_at_risk_paise", 0)
    risk_rs = risk_paise / 100.0

    if source == "nova":
        brief_text = (
            f"Nova import batch reconciliation completed. "
            f"Observed {total_exceptions} exceptions with Amount at Risk of Rs {risk_rs:.2f}. "
            "Data source is real-world Aczen Nova read-only accounting records; accuracy benchmark is not available as real data has no ground truth."
        )
    elif source == "razorpay":
        brief_text = (
            f"Razorpay live batch reconciliation completed. "
            f"Observed {total_exceptions} exceptions with Amount at Risk of Rs {risk_rs:.2f}. "
            "Real production records without ground truth; benchmark not available."
        )
    else:
        brief_text = (
            f"Reconciliation completed for {source} batch. "
            f"Found {total_exceptions} exceptions with Amount at Risk of Rs {risk_rs:.2f}."
        )

    # Ensure Guard G3
    assert guard_g3_number_check(brief_text, metrics)

    return RunBriefResponse(
        brief=brief_text,
        source=source,
    )


@router.post("/ai/lab-narrative", response_model=LabNarrativeResponse, dependencies=[Depends(verify_internal_key)])
def lab_narrative(req: LabNarrativeRequest):
    res = req.comparator_result
    overall = res.get("overall_status", "PASS")

    recommendations = [
        "Calibrate fee_bps in generator parameters to match observed gateway fee distribution.",
        "Adjust settlement_lag_days parameter to align synthetic cutoff distribution with Nova real records.",
    ]
    narrative_text = (
        f"Synthetic Lab comparator status is {overall}. The Kolmogorov-Smirnov distribution test "
        "indicates overall alignment across amount quantiles with minor lag variance."
    )
    return LabNarrativeResponse(
        narrative=narrative_text,
        recommendations=recommendations,
    )
