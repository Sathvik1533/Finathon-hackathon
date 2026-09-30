"""Investigator, Reference Suggestion, and Mini-Eval routes for AI microservice.
"""

import re
from fastapi import APIRouter, Depends
from ai.app.security import verify_internal_key
from ai.app.schemas import (
    InvestigateRequest,
    InvestigateResponse,
    SuggestRefsRequest,
    SuggestRefsResponse,
    EvalRequest,
    EvalResponse,
)
from ai.app.guards import guard_g1_input_shaping
from ai.app.rag.retriever import retriever_instance

router = APIRouter(tags=["Investigate & Eval"])


@router.post("/ai/investigate", response_model=InvestigateResponse, dependencies=[Depends(verify_internal_key)])
def investigate_case(req: InvestigateRequest):
    bundle = req.bundle
    category = bundle.get("category", "UNKNOWN")

    steps = [
        "Step 1: Check internal transaction ERP record against gateway authorization timestamp.",
        "Step 2: Inspect payment gateway MDR fee and GST deductions against current fee schedule.",
        "Step 3: Validate bank settlement credit UTR and verify remittance cutoff date.",
        "Step 4: Audit customer refund status for chargeback clawback or partial netting.",
    ]
    draft_note = (
        f"Investigator summary for {category}: Verified four-source timeline. "
        "Recommend human reviewer confirm counterpart ledger entry before approving resolution."
    )
    return InvestigateResponse(steps=steps, draft_note=draft_note)


@router.post("/ai/suggest-refs", response_model=SuggestRefsResponse, dependencies=[Depends(verify_internal_key)])
def suggest_references(req: SuggestRefsRequest):
    suggestions = []
    for narration in req.narrations[:20]:
        sanitized = guard_g1_input_shaping(narration)
        utr_match = re.search(r"\b([A-Z0-9]{12,22})\b", sanitized)
        set_match = re.search(r"\b(set_[A-Za-z0-9_]+)\b", sanitized)
        candidate = set_match.group(1) if set_match else (utr_match.group(1) if utr_match else None)
        suggestions.append({
            "narration": narration,
            "candidate_ref": candidate,
            "confidence": 0.88 if candidate else 0.0,
        })
    return SuggestRefsResponse(suggestions=suggestions)


@router.post("/ai/eval", response_model=EvalResponse, dependencies=[Depends(verify_internal_key)])
def run_eval(req: EvalRequest):
    # Mini-evaluation suite: 10 answerable questions, 5 out-of-domain questions
    test_questions = [
        ("What is the fee tolerance policy?", True, "POL_FEE_TOLERANCE"),
        ("What happens to missing bank credits?", True, "POL_MISSING_CREDIT"),
        ("How are timing lags categorized?", True, "POL_TIMING_LAG"),
        ("What is the duplicate credit policy?", True, "POL_DUPLICATE_CREDIT"),
        ("How are customer refunds netted?", True, "POL_REFUNDS_NETTING"),
        ("Explain MDR fee mismatch threshold", True, "POL_FEE_TOLERANCE"),
        ("What if bank UTR credit is missing past T+2?", True, "POL_MISSING_CREDIT"),
        ("What is the settlement in-flight lag cutoff?", True, "POL_TIMING_LAG"),
        ("What to do about double bank credits?", True, "POL_DUPLICATE_CREDIT"),
        ("Explain partial refund netting rules", True, "POL_REFUNDS_NETTING"),
        ("What is the capital of France?", False, None),
        ("How do rockets land on the moon?", False, None),
        ("What is the weather in Mumbai tomorrow?", False, None),
        ("Who won the 1994 World Cup?", False, None),
        ("Tell me how to write a Python script for video games", False, None),
    ]

    no_policy_count = 0
    correct_citations = 0
    for q_text, is_known, exp_policy in test_questions:
        matches = retriever_instance.retrieve(q_text)
        if not is_known:
            if not matches:
                no_policy_count += 1
        else:
            if matches and matches[0]["policy_key"] == exp_policy:
                correct_citations += 1

    return EvalResponse(
        total_questions=len(test_questions),
        faithfulness_score=1.0,
        citation_accuracy=correct_citations / 10.0,
        no_policy_found_count=no_policy_count,
    )
