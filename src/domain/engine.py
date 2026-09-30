"""Pure Deterministic 7-Stage Reconciliation Engine.
Rule: Zero dependency on AI models. The engine is strictly deterministic and mathematically provable.
It never approves exceptions (creates only status='OPEN').
It never reads `ground_truth` or Nova link fields.
All thresholds, tolerances, and stage toggles come from the snapshot config.
"""

from datetime import datetime, timezone
import re
import uuid
from typing import Dict, Any, List, Optional
from src.domain.money import calculate_fee_and_gst


class ReconciliationEngine:
    def __init__(self, config_snapshot: Dict[str, Any], as_of: datetime):
        self.config = config_snapshot
        self.as_of = as_of

        # Config parameters
        self.tolerance = self.config.get("tolerance", {"amount_paise": 100, "date_window_days": 3})
        self.fees = self.config.get("fees", {"fee_bps": 200, "gst_bps": 1800, "rounding": "half_up"})
        self.settlement_cfg = self.config.get("settlement", {"tolerance_paise": 100, "lag_days": 2})
        self.confidence_cfg = self.config.get("confidence", {
            "auto_match_min": 0.90,
            "review_min": 0.60,
            "weights": {"amount": 0.5, "date": 0.2, "reference": 0.3}
        })
        self.categories_cfg = self.config.get("categories", {})

        # Stage toggles
        stages_list = self.config.get("stages", [])
        self.stages_enabled = {s["key"]: s.get("enabled", True) for s in stages_list}

    def execute(
        self,
        merchant_id: str,
        run_id: str,
        internal_txns: List[Dict[str, Any]],
        gateway_txns: List[Dict[str, Any]],
        bank_credits: List[Dict[str, Any]],
        refunds: List[Dict[str, Any]],
        source_settlements: Optional[List[Dict[str, Any]]] = None,
        progress_callback: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Execute all active reconciliation stages in pure sequence."""
        source_settlements = source_settlements or []

        matches: List[Dict[str, Any]] = []
        match_items: List[Dict[str, Any]] = []
        exceptions: List[Dict[str, Any]] = []
        run_outcomes: List[Dict[str, Any]] = []

        # Tracking state
        matched_internal_ids = set()
        matched_gateway_ids = set()
        matched_refund_ids = set()
        internal_to_gateway: Dict[str, str] = {}
        gateway_to_internal: Dict[str, str] = {}
        order_to_gateways: Dict[str, List[Dict[str, Any]]] = {}

        for gw in gateway_txns:
            oref = gw.get("order_ref")
            if oref:
                order_to_gateways.setdefault(oref, []).append(gw)

        total_records = len(internal_txns) + len(gateway_txns) + len(bank_credits) + len(refunds)

        # ----------------------------------------------------
        # STAGE 1: Transaction-ID Match (Exact order_ref)
        # ----------------------------------------------------
        if self.stages_enabled.get("txn_id_match", True):
            if progress_callback:
                progress_callback("txn_id_match", 1, 7, len(matches), len(exceptions))

            gw_by_order_ref = {}
            for gw in gateway_txns:
                oref = gw.get("order_ref")
                if oref and oref not in gw_by_order_ref:
                    gw_by_order_ref[oref] = gw

            for internal in internal_txns:
                oref = internal.get("order_ref")
                if oref and oref in gw_by_order_ref:
                    gw = gw_by_order_ref[oref]
                    # Check for exact duplicate order_ref payments in gateway
                    gw_candidates = order_to_gateways.get(oref, [])
                    if len(gw_candidates) > 1:
                        # Will be handled in duplicate check or stage 6
                        continue

                    # Exact match
                    m_id = str(uuid.uuid4())
                    matches.append({
                        "id": m_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "stage": "txn_id_match",
                        "confidence": 1.0,
                        "explanation": f"Exact order_ref equality between internal {internal.get('internal_id')} and gateway {gw.get('gateway_payment_id')}",
                    })
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "internal", "source_id": internal["id"]})
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "gateway", "source_id": gw["id"]})

                    matched_internal_ids.add(internal["id"])
                    matched_gateway_ids.add(gw["id"])
                    internal_to_gateway[internal["id"]] = gw["id"]
                    gateway_to_internal[gw["id"]] = internal["id"]

        # ----------------------------------------------------
        # STAGE 2: Reference Match (Normalized strings & messy narrations)
        # ----------------------------------------------------
        if self.stages_enabled.get("reference_match", True):
            if progress_callback:
                progress_callback("reference_match", 2, 7, len(matches), len(exceptions))

            def normalize_ref(ref_str: Optional[str]) -> str:
                if not ref_str:
                    return ""
                # Strip non-alphanumeric, convert to uppercase
                return re.sub(r"[^A-Za-z0-9]", "", ref_str).upper()

            unmatched_internals = [t for t in internal_txns if t["id"] not in matched_internal_ids]
            unmatched_gateways = [g for g in gateway_txns if g["id"] not in matched_gateway_ids]

            norm_gw_map = {normalize_ref(g.get("order_ref")): g for g in unmatched_gateways if g.get("order_ref")}

            for internal in unmatched_internals:
                norm_ref = normalize_ref(internal.get("order_ref"))
                if norm_ref and norm_ref in norm_gw_map:
                    gw = norm_gw_map[norm_ref]
                    m_id = str(uuid.uuid4())
                    matches.append({
                        "id": m_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "stage": "reference_match",
                        "confidence": 0.98,
                        "explanation": f"Normalized reference match between order_ref '{internal.get('order_ref')}' and gateway ref '{gw.get('order_ref')}'",
                    })
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "internal", "source_id": internal["id"]})
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "gateway", "source_id": gw["id"]})

                    matched_internal_ids.add(internal["id"])
                    matched_gateway_ids.add(gw["id"])
                    internal_to_gateway[internal["id"]] = gw["id"]
                    gateway_to_internal[gw["id"]] = internal["id"]

        # ----------------------------------------------------
        # STAGE 3: Partial Match (Weighted scoring on amount, date, ref)
        # ----------------------------------------------------
        if self.stages_enabled.get("partial_match", True):
            if progress_callback:
                progress_callback("partial_match", 3, 7, len(matches), len(exceptions))

            unmatched_internals = [t for t in internal_txns if t["id"] not in matched_internal_ids]
            unmatched_gateways = [g for g in gateway_txns if g["id"] not in matched_gateway_ids]

            auto_min = self.confidence_cfg.get("auto_match_min", 0.90)
            rev_min = self.confidence_cfg.get("review_min", 0.60)
            w_amt = self.confidence_cfg.get("weights", {}).get("amount", 0.5)
            w_date = self.confidence_cfg.get("weights", {}).get("date", 0.2)
            w_ref = self.confidence_cfg.get("weights", {}).get("reference", 0.3)

            for internal in unmatched_internals:
                best_score = 0.0
                best_gw = None
                int_amt = internal.get("amount_paise", 0)
                int_created = datetime.fromisoformat(internal["created_at"].replace("Z", "+00:00"))

                for gw in unmatched_gateways:
                    gw_amt = gw.get("amount_paise", 0)
                    gw_cap = datetime.fromisoformat(gw["captured_at"].replace("Z", "+00:00")) if gw.get("captured_at") else int_created

                    # Amount similarity
                    amt_diff = abs(int_amt - gw_amt)
                    amt_sim = max(0.0, 1.0 - (amt_diff / max(int_amt, 1)))

                    # Date similarity (within window days)
                    days_diff = abs((gw_cap.date() - int_created.date()).days)
                    max_days = max(1, self.tolerance.get("date_window_days", 3))
                    date_sim = max(0.0, 1.0 - (days_diff / max_days))

                    # Reference similarity (substring or partial overlap)
                    ref_sim = 0.0
                    r1 = (internal.get("order_ref") or "").lower()
                    r2 = (gw.get("order_ref") or "").lower()
                    if r1 and r2 and (r1 in r2 or r2 in r1):
                        ref_sim = 0.85
                    elif r1 and r2 and r1[:6] == r2[:6]:
                        ref_sim = 0.60

                    total_score = (w_amt * amt_sim) + (w_date * date_sim) + (w_ref * ref_sim)
                    if total_score > best_score:
                        best_score = total_score
                        best_gw = gw

                if best_gw and best_score >= auto_min:
                    m_id = str(uuid.uuid4())
                    matches.append({
                        "id": m_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "stage": "partial_match",
                        "confidence": round(best_score, 4),
                        "explanation": f"Partial weighted match (score {best_score:.2f}) on amount, date, and reference overlap",
                    })
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "internal", "source_id": internal["id"]})
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "gateway", "source_id": best_gw["id"]})

                    matched_internal_ids.add(internal["id"])
                    matched_gateway_ids.add(best_gw["id"])
                    internal_to_gateway[internal["id"]] = best_gw["id"]
                    gateway_to_internal[best_gw["id"]] = internal["id"]
                elif best_gw and best_score >= rev_min:
                    # Ambiguous match exception
                    exc_id = str(uuid.uuid4())
                    exceptions.append({
                        "id": exc_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "category": "AMBIGUOUS_MATCH",
                        "severity": "low",
                        "amount_at_risk_paise": internal.get("amount_paise", 0) // 2,
                        "status": "OPEN",
                        "version": 1,
                        "evidence": {
                            "internal_txn_id": internal["id"],
                            "internal_order_ref": internal.get("order_ref"),
                            "candidate_gateway_id": best_gw["id"],
                            "candidate_gateway_ref": best_gw.get("order_ref"),
                            "match_score": round(best_score, 4),
                        },
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                    run_outcomes.append({
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "internal_txn_id": internal["id"],
                        "predicted_status": "EXCEPTION",
                        "predicted_category": "AMBIGUOUS_MATCH",
                        "settlement_match_id": None,
                        "exception_id": exc_id,
                    })

        # ----------------------------------------------------
        # STAGE 4: Fee Calculation & Verification
        # ----------------------------------------------------
        gw_map_by_id = {g["id"]: g for g in gateway_txns}
        fee_mismatched_internal_ids = set()

        if self.stages_enabled.get("fee_calculation", True):
            if progress_callback:
                progress_callback("fee_calculation", 4, 7, len(matches), len(exceptions))

            fee_bps = self.fees.get("fee_bps", 200)
            gst_bps = self.fees.get("gst_bps", 1800)
            tol_paise = self.tolerance.get("amount_paise", 100)

            for internal in internal_txns:
                int_id = internal["id"]
                if int_id not in internal_to_gateway:
                    continue
                gw = gw_map_by_id[internal_to_gateway[int_id]]

                gross = internal.get("amount_paise", 0)
                gw_amt = gw.get("amount_paise", 0)

                # Check Gross Amount Mismatch
                if abs(gross - gw_amt) > tol_paise:
                    exc_id = str(uuid.uuid4())
                    diff = abs(gross - gw_amt)
                    exceptions.append({
                        "id": exc_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "category": "AMOUNT_MISMATCH",
                        "severity": "high",
                        "amount_at_risk_paise": diff,
                        "status": "OPEN",
                        "version": 1,
                        "evidence": {
                            "internal_txn_id": int_id,
                            "order_ref": internal.get("order_ref"),
                            "internal_amount_paise": gross,
                            "gateway_amount_paise": gw_amt,
                            "discrepancy_paise": diff,
                        },
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                    run_outcomes.append({
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "internal_txn_id": int_id,
                        "predicted_status": "EXCEPTION",
                        "predicted_category": "AMOUNT_MISMATCH",
                        "settlement_match_id": None,
                        "exception_id": exc_id,
                    })
                    fee_mismatched_internal_ids.add(int_id)
                    continue

                # Check Fee & Tax Mismatch
                exp_fee, exp_tax, exp_net = calculate_fee_and_gst(gross, fee_bps, gst_bps)
                act_fee = gw.get("fee_paise", 0)
                act_tax = gw.get("tax_paise", 0)

                fee_diff = abs((exp_fee + exp_tax) - (act_fee + act_tax))
                if fee_diff > tol_paise:
                    exc_id = str(uuid.uuid4())
                    exceptions.append({
                        "id": exc_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "category": "FEE_MISMATCH",
                        "severity": "medium",
                        "amount_at_risk_paise": fee_diff,
                        "status": "OPEN",
                        "version": 1,
                        "evidence": {
                            "internal_txn_id": int_id,
                            "gateway_payment_id": gw.get("gateway_payment_id"),
                            "gross_amount_paise": gross,
                            "expected_fee_paise": exp_fee,
                            "expected_tax_paise": exp_tax,
                            "actual_fee_paise": act_fee,
                            "actual_tax_paise": act_tax,
                            "fee_difference_paise": fee_diff,
                        },
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                    run_outcomes.append({
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "internal_txn_id": int_id,
                        "predicted_status": "EXCEPTION",
                        "predicted_category": "FEE_MISMATCH",
                        "settlement_match_id": None,
                        "exception_id": exc_id,
                    })
                    fee_mismatched_internal_ids.add(int_id)

        # ----------------------------------------------------
        # STAGE 5: Refund & Reversal Handling
        # ----------------------------------------------------
        refunds_by_gateway_pay_id: Dict[str, List[Dict[str, Any]]] = {}
        for r in refunds:
            gw_p_id = r.get("gateway_payment_id")
            if gw_p_id:
                refunds_by_gateway_pay_id.setdefault(gw_p_id, []).append(r)

        gw_by_payment_id = {g.get("gateway_payment_id"): g for g in gateway_txns if g.get("gateway_payment_id")}

        # Check for Unmatched Reversals (refund without valid capture)
        for r in refunds:
            gw_p_id = r.get("gateway_payment_id")
            if not gw_p_id or gw_p_id not in gw_by_payment_id:
                exc_id = str(uuid.uuid4())
                exceptions.append({
                    "id": exc_id,
                    "run_id": run_id,
                    "merchant_id": merchant_id,
                    "category": "UNMATCHED_REVERSAL",
                    "severity": "medium",
                    "amount_at_risk_paise": r.get("amount_paise", 0),
                    "status": "OPEN",
                    "version": 1,
                    "evidence": {
                        "refund_id": r.get("refund_id"),
                        "gateway_payment_id": gw_p_id,
                        "kind": r.get("kind", "refund"),
                        "amount_paise": r.get("amount_paise", 0),
                        "reason": "Refund or chargeback reference does not correspond to any valid gateway capture",
                    },
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

        # ----------------------------------------------------
        # STAGE 6: Settlement Matching (One-to-Many Grouping)
        # ----------------------------------------------------
        if self.stages_enabled.get("settlement_match", True):
            if progress_callback:
                progress_callback("settlement_match", 6, 7, len(matches), len(exceptions))

            # Group gateway transactions by settlement_id
            settlement_groups: Dict[str, List[Dict[str, Any]]] = {}
            for gw in gateway_txns:
                s_id = gw.get("settlement_id")
                if s_id:
                    settlement_groups.setdefault(s_id, []).append(gw)
                else:
                    # Missing settlement ID on gateway capture
                    int_id = gateway_to_internal.get(gw["id"])
                    if int_id and int_id not in fee_mismatched_internal_ids:
                        exc_id = str(uuid.uuid4())
                        exceptions.append({
                            "id": exc_id,
                            "run_id": run_id,
                            "merchant_id": merchant_id,
                            "category": "MISSING_SETTLEMENT",
                            "severity": "high",
                            "amount_at_risk_paise": gw.get("amount_paise", 0),
                            "status": "OPEN",
                            "version": 1,
                            "evidence": {
                                "gateway_payment_id": gw.get("gateway_payment_id"),
                                "order_ref": gw.get("order_ref"),
                                "amount_paise": gw.get("amount_paise", 0),
                                "reason": "Payment captured by gateway but never grouped into any settlement cycle",
                            },
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        })
                        run_outcomes.append({
                            "run_id": run_id,
                            "merchant_id": merchant_id,
                            "internal_txn_id": int_id,
                            "predicted_status": "EXCEPTION",
                            "predicted_category": "MISSING_SETTLEMENT",
                            "settlement_match_id": None,
                            "exception_id": exc_id,
                        })

            # Check for Duplicate Payments (two gateway captures for same internal order)
            for oref, gws in order_to_gateways.items():
                if len(gws) > 1:
                    matching_int = next((t for t in internal_txns if t.get("order_ref") == oref), None)
                    if matching_int:
                        exc_id = str(uuid.uuid4())
                        exceptions.append({
                            "id": exc_id,
                            "run_id": run_id,
                            "merchant_id": merchant_id,
                            "category": "DUPLICATE_PAYMENT",
                            "severity": "medium",
                            "amount_at_risk_paise": sum(g.get("amount_paise", 0) for g in gws[1:]),
                            "status": "OPEN",
                            "version": 1,
                            "evidence": {
                                "order_ref": oref,
                                "gateway_payment_ids": [g.get("gateway_payment_id") for g in gws],
                                "total_captured_paise": sum(g.get("amount_paise", 0) for g in gws),
                                "reason": "Multiple distinct gateway captures recorded for the same customer order reference",
                            },
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        })
                        run_outcomes.append({
                            "run_id": run_id,
                            "merchant_id": merchant_id,
                            "internal_txn_id": matching_int["id"],
                            "predicted_status": "EXCEPTION",
                            "predicted_category": "DUPLICATE_PAYMENT",
                            "settlement_match_id": None,
                            "exception_id": exc_id,
                        })

            # Match bank credits to settlement groups
            bank_by_settlement: Dict[str, List[Dict[str, Any]]] = {}
            for b in bank_credits:
                s_ref = b.get("settlement_ref")
                if s_ref:
                    bank_by_settlement.setdefault(s_ref, []).append(b)

            settlement_tolerance = self.settlement_cfg.get("tolerance_paise", 100)
            lag_days = self.settlement_cfg.get("lag_days", 2)

            for s_id, gw_items in settlement_groups.items():
                # Compute expected net for the settlement bundle
                expected_bundle_net = 0
                for gw in gw_items:
                    gross = gw.get("amount_paise", 0)
                    fee = gw.get("fee_paise", 0)
                    tax = gw.get("tax_paise", 0)
                    net = gross - fee - tax

                    # Deduct refunds
                    gw_rfnds = refunds_by_gateway_pay_id.get(gw.get("gateway_payment_id", ""), [])
                    for rf in gw_rfnds:
                        net -= rf.get("amount_paise", 0)

                    expected_bundle_net += net

                bank_candidates = bank_by_settlement.get(s_id, [])

                # Check Duplicate Bank Credit
                if len(bank_candidates) > 1:
                    exc_id = str(uuid.uuid4())
                    exceptions.append({
                        "id": exc_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "category": "DUPLICATE_BANK_CREDIT",
                        "severity": "high",
                        "amount_at_risk_paise": sum(b.get("amount_paise", 0) for b in bank_candidates[1:]),
                        "status": "OPEN",
                        "version": 1,
                        "evidence": {
                            "settlement_id": s_id,
                            "utrs": [b.get("utr") for b in bank_candidates],
                            "total_credited_paise": sum(b.get("amount_paise", 0) for b in bank_candidates),
                            "reason": "Multiple bank credits received for the same settlement identifier",
                        },
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                    continue

                if not bank_candidates:
                    # No bank credit found: check if TIMING_LAG or MISSING_BANK_CREDIT
                    # Find latest capture date in this bundle
                    latest_cap = self.as_of
                    for gw in gw_items:
                        if gw.get("captured_at"):
                            c_dt = datetime.fromisoformat(gw["captured_at"].replace("Z", "+00:00"))
                            if c_dt > latest_cap or latest_cap == self.as_of:
                                latest_cap = c_dt

                    # If captured within T+lag window from as_of, it is TIMING_LAG
                    is_in_flight = (latest_cap.date() + datetime.resolution * lag_days >= self.as_of.date()) or (latest_cap >= self.as_of)
                    cat = "TIMING_LAG" if is_in_flight else "MISSING_BANK_CREDIT"
                    sev = "low" if cat == "TIMING_LAG" else "high"

                    for gw in gw_items:
                        int_id = gateway_to_internal.get(gw["id"])
                        if int_id and int_id not in fee_mismatched_internal_ids:
                            exc_id = str(uuid.uuid4())
                            exceptions.append({
                                "id": exc_id,
                                "run_id": run_id,
                                "merchant_id": merchant_id,
                                "category": cat,
                                "severity": sev,
                                "amount_at_risk_paise": gw.get("amount_paise", 0),
                                "status": "OPEN",
                                "version": 1,
                                "evidence": {
                                    "internal_txn_id": int_id,
                                    "gateway_payment_id": gw.get("gateway_payment_id"),
                                    "settlement_id": s_id,
                                    "captured_at": gw.get("captured_at"),
                                    "as_of": self.as_of.isoformat(),
                                    "reason": "Bank credit in-flight within settlement cycle" if cat == "TIMING_LAG" else "Bank credit missing beyond settlement cycle window",
                                },
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            })
                            run_outcomes.append({
                                "run_id": run_id,
                                "merchant_id": merchant_id,
                                "internal_txn_id": int_id,
                                "predicted_status": "EXCEPTION",
                                "predicted_category": cat,
                                "settlement_match_id": None,
                                "exception_id": exc_id,
                            })
                    continue

                # Bank credit exists: compare expected net vs actual bank credit
                bank_credit = bank_candidates[0]
                actual_credit_paise = bank_credit.get("amount_paise", 0)
                diff_paise = abs(expected_bundle_net - actual_credit_paise)

                if diff_paise <= settlement_tolerance:
                    # Successful One-to-Many Settlement Match!
                    m_id = str(uuid.uuid4())
                    matches.append({
                        "id": m_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "stage": "settlement_match",
                        "confidence": 1.0,
                        "explanation": f"1-to-{len(gw_items)} settlement match: net expected ₹{expected_bundle_net/100:.2f} matches bank UTR {bank_credit.get('utr')} (₹{actual_credit_paise/100:.2f})",
                    })
                    match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "bank", "source_id": bank_credit["id"]})

                    for gw in gw_items:
                        match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "gateway", "source_id": gw["id"]})
                        int_id = gateway_to_internal.get(gw["id"])
                        if int_id:
                            match_items.append({"match_id": m_id, "merchant_id": merchant_id, "source_type": "internal", "source_id": int_id})
                            # If no prior exception on this internal transaction, mark SETTLED!
                            if int_id not in fee_mismatched_internal_ids and not any(o["internal_txn_id"] == int_id for o in run_outcomes):
                                run_outcomes.append({
                                    "run_id": run_id,
                                    "merchant_id": merchant_id,
                                    "internal_txn_id": int_id,
                                    "predicted_status": "SETTLED",
                                    "predicted_category": None,
                                    "settlement_match_id": m_id,
                                    "exception_id": None,
                                })
                else:
                    # Settlement Net Discrepancy (e.g. PARTIAL_REFUND_NOT_REFLECTED)
                    has_refunds = any(refunds_by_gateway_pay_id.get(g.get("gateway_payment_id", "")) for g in gw_items)
                    cat = "PARTIAL_REFUND_NOT_REFLECTED" if has_refunds else "AMOUNT_MISMATCH"

                    for gw in gw_items:
                        int_id = gateway_to_internal.get(gw["id"])
                        if int_id and not any(o["internal_txn_id"] == int_id for o in run_outcomes):
                            exc_id = str(uuid.uuid4())
                            exceptions.append({
                                "id": exc_id,
                                "run_id": run_id,
                                "merchant_id": merchant_id,
                                "category": cat,
                                "severity": "high",
                                "amount_at_risk_paise": diff_paise // max(1, len(gw_items)),
                                "status": "OPEN",
                                "version": 1,
                                "evidence": {
                                    "settlement_id": s_id,
                                    "utr": bank_credit.get("utr"),
                                    "expected_bundle_net_paise": expected_bundle_net,
                                    "actual_bank_credit_paise": actual_credit_paise,
                                    "variance_paise": diff_paise,
                                },
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            })
                            run_outcomes.append({
                                "run_id": run_id,
                                "merchant_id": merchant_id,
                                "internal_txn_id": int_id,
                                "predicted_status": "EXCEPTION",
                                "predicted_category": cat,
                                "settlement_match_id": None,
                                "exception_id": exc_id,
                            })

        # ----------------------------------------------------
        # STAGE 7: Classification & Amount at Risk Ranking
        # ----------------------------------------------------
        if self.stages_enabled.get("classification", True):
            if progress_callback:
                progress_callback("classification", 7, 7, len(matches), len(exceptions))

            # Mark any remaining unmatched internal transactions
            resolved_int_ids = {o["internal_txn_id"] for o in run_outcomes}
            for internal in internal_txns:
                int_id = internal["id"]
                if int_id not in resolved_int_ids:
                    exc_id = str(uuid.uuid4())
                    exceptions.append({
                        "id": exc_id,
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "category": "MISSING_SETTLEMENT",
                        "severity": "high",
                        "amount_at_risk_paise": internal.get("amount_paise", 0),
                        "status": "OPEN",
                        "version": 1,
                        "evidence": {
                            "internal_txn_id": int_id,
                            "order_ref": internal.get("order_ref"),
                            "reason": "Internal transaction without matching gateway capture or bank settlement",
                        },
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                    run_outcomes.append({
                        "run_id": run_id,
                        "merchant_id": merchant_id,
                        "internal_txn_id": int_id,
                        "predicted_status": "UNMATCHED",
                        "predicted_category": "MISSING_SETTLEMENT",
                        "settlement_match_id": None,
                        "exception_id": exc_id,
                    })

            # Sort exceptions strictly by amount_at_risk_paise descending, with category secondary
            exceptions.sort(key=lambda x: (x.get("amount_at_risk_paise", 0), x.get("category", "")), reverse=True)

        return {
            "matches": matches,
            "match_items": match_items,
            "exceptions": exceptions,
            "run_outcomes": run_outcomes,
        }
