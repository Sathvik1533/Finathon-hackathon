"""J.P. Morgan 7-step metric catalogue computation for real and synthetic datasets.
Shared by both Synthetic Lab and Batch Profiling to ensure identical scoring logic.
"""

from typing import Dict, Any, List
import re
from datetime import datetime


def compute_quantiles(values: List[int | float]) -> Dict[str, float]:
    """Compute p10, p50, p90, p99, and mean of values."""
    if not values:
        return {"p10": 0.0, "p50": 0.0, "p90": 0.0, "p99": 0.0, "mean": 0.0}
    sorted_vals = sorted(values)
    n = len(sorted_vals)

    def percentile(p: float) -> float:
        idx = int(p * (n - 1))
        return float(sorted_vals[idx])

    return {
        "p10": percentile(0.10),
        "p50": percentile(0.50),
        "p90": percentile(0.90),
        "p99": percentile(0.99),
        "mean": float(sum(sorted_vals) / n),
    }


def compute_metric_catalogue(
    internal_txns: List[Dict[str, Any]],
    gateway_txns: List[Dict[str, Any]],
    bank_credits: List[Dict[str, Any]],
    refunds: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Compute the full 8-metric J.P. Morgan catalogue from batch records."""
    # 1. Fee Ratio BPS
    captures = [g for g in gateway_txns if g.get("status") == "captured"]
    total_gross = sum(g.get("amount_paise", 0) for g in captures)
    total_fee = sum(g.get("fee_paise", 0) for g in captures)
    fee_ratio_bps = int((total_fee * 10000) / total_gross) if total_gross > 0 else 0

    # 2. Amount Quantiles (captures, in paise)
    capture_amounts = [g.get("amount_paise", 0) for g in captures]
    amount_quantiles = compute_quantiles(capture_amounts)

    # 3. Refund Rate BPS
    total_captures_count = max(1, len(captures))
    refund_rate_bps = int((len(refunds) * 10000) / total_captures_count)

    # 4. Chargeback Rate BPS
    chargebacks = [r for r in refunds if r.get("kind") in ("chargeback", "chargeback_reversal")]
    chargeback_rate_bps = int((len(chargebacks) * 10000) / total_captures_count)

    # 5. Failed Share BPS
    failed_txns = [g for g in gateway_txns if g.get("status") != "captured"]
    total_gw = max(1, len(gateway_txns))
    failed_share_bps = int((len(failed_txns) * 10000) / total_gw)

    # 6. Narration Reference Rate BPS
    ref_pattern = re.compile(r"(?:SETTL[/-]|CR-|SETTLEMENT[/-]|REF-|ORD-|CMS/)([A-Za-z0-9_\-]+)", re.IGNORECASE)
    narration_with_ref = 0
    for b in bank_credits:
        narration = b.get("narration") or ""
        if ref_pattern.search(narration) or b.get("settlement_ref"):
            narration_with_ref += 1
    total_bank = max(1, len(bank_credits))
    narration_ref_rate_bps = int((narration_with_ref * 10000) / total_bank)

    # 7. Settlement Lag Days distribution
    # Match gateway capture date with bank credit date
    gw_by_settlement: Dict[str, List[datetime]] = {}
    for g in captures:
        s_id = g.get("settlement_id")
        cap_at = g.get("captured_at")
        if s_id and cap_at:
            dt = datetime.fromisoformat(cap_at.replace("Z", "+00:00"))
            gw_by_settlement.setdefault(s_id, []).append(dt)

    lags: List[int] = []
    payments_per_settle: List[int] = []
    for b in bank_credits:
        s_ref = b.get("settlement_ref")
        cred_at = b.get("credited_at")
        if s_ref and cred_at and s_ref in gw_by_settlement:
            b_dt = datetime.fromisoformat(cred_at.replace("Z", "+00:00"))
            caps = gw_by_settlement[s_ref]
            payments_per_settle.append(len(caps))
            for c_dt in caps:
                lag = max(0, (b_dt.date() - c_dt.date()).days)
                lags.append(lag)

    settlement_lag = compute_quantiles(lags if lags else [2])
    payments_per_settlement = compute_quantiles(payments_per_settle if payments_per_settle else [5])

    return {
        "fee_ratio_bps": fee_ratio_bps,
        "refund_rate_bps": refund_rate_bps,
        "chargeback_rate_bps": chargeback_rate_bps,
        "failed_share_bps": failed_share_bps,
        "narration_ref_rate_bps": narration_ref_rate_bps,
        "settlement_lag_days": settlement_lag,
        "amount_quantiles": amount_quantiles,
        "payments_per_settlement": payments_per_settlement,
        "sample_size": len(internal_txns),
    }
