"""Case explanation endpoint for AI microservice.
"""

from fastapi import APIRouter, Depends
from ai.app.security import verify_internal_key
from ai.app.schemas import ExplainCaseRequest, ExplainCaseResponse
from ai.app.guards import (
    guard_g1_input_shaping,
    guard_g3_number_check,
    guard_g4_citation_check,
    guard_g5_refusal_of_decisions,
)
from ai.app.rag.retriever import retriever_instance

router = APIRouter(tags=["Explain"])


@router.post("/ai/explain-case", response_model=ExplainCaseResponse, dependencies=[Depends(verify_internal_key)])
def explain_case(req: ExplainCaseRequest):
    bundle = req.bundle
    category = bundle.get("category", "UNKNOWN")
    raw_narration = bundle.get("raw_narration", "")
    amount_at_risk_rs = bundle.get("amount_at_risk_paise", 0) / 100.0

    # Guard G1: Shape untrusted inputs
    _ = guard_g1_input_shaping(raw_narration)

    valid_policy_ids = {c["policy_key"] for c in retriever_instance._chunks}
    cited_ids = []
    explanation = ""
    suggested_action = ""

    if category == "FEE_MISMATCH":
        cited_ids = ["POL_FEE_TOLERANCE"]
        exp_fee = bundle.get("expected_fee_paise", 0) / 100.0
        act_fee = bundle.get("actual_fee_paise", 0) / 100.0
        diff = bundle.get("fee_discrepancy_paise", 0) / 100.0
        explanation = (
            f"Gateway deducted fee of Rs {act_fee:.2f} instead of expected schedule fee Rs {exp_fee:.2f}, "
            f"generating discrepancy of Rs {diff:.2f}."
        )
        suggested_action = "Verify tier schedule discount agreement under POL_FEE_TOLERANCE."

    elif category == "MISSING_BANK_CREDIT":
        cited_ids = ["POL_MISSING_CREDIT"]
        captured_amt = bundle.get("captured_amount_paise", 0) / 100.0
        explanation = f"Gateway captured payment of Rs {captured_amt:.2f}, but no bank credit arrived within cutoff."
        suggested_action = "Under POL_MISSING_CREDIT, escalate to treasury for suspense account tracing."

    elif category == "TIMING_LAG":
        cited_ids = ["POL_TIMING_LAG"]
        explanation = f"Transaction amount Rs {amount_at_risk_rs:.2f} is in-flight within settlement window."
        suggested_action = "Allow transaction to settle in subsequent cycle under POL_TIMING_LAG."

    else:
        explanation = f"Discrepancy in category {category} with Amount at Risk Rs {amount_at_risk_rs:.2f}."
        suggested_action = "Review ledger sources before decision."

    # Guard G4
    clean_citations = guard_g4_citation_check(cited_ids, valid_policy_ids)
    # Guard G5
    safe_action = guard_g5_refusal_of_decisions(suggested_action)

    return ExplainCaseResponse(
        explanation=explanation,
        suggestedAction=safe_action,
        citedPolicyIds=clean_citations,
        confidence=0.94,
    )
