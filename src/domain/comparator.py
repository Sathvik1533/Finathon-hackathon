"""Kolmogorov-Smirnov and Relative Error Metrics Comparator for Synthetic Lab.
Implements J.P. Morgan Step 6 (Compare Real vs Calibrated Synthetic Metrics).
"""

from typing import Dict, Any, List


class MetricComparator:
    def __init__(
        self,
        tol_pass: float = 0.10,
        tol_warn: float = 0.25,
        ks_pass: float = 0.10,
        ks_warn: float = 0.20,
    ):
        self.tol_pass = tol_pass
        self.tol_warn = tol_warn
        self.ks_pass = ks_pass
        self.ks_warn = ks_warn

    def compare_scalar(self, real_val: float, synth_val: float, param_hint: str) -> Dict[str, Any]:
        """Compute relative error for scalar metrics."""
        denom = max(abs(real_val), 1.0)
        error = abs(synth_val - real_val) / denom

        if error <= self.tol_pass:
            verdict = "PASS"
        elif error <= self.tol_warn:
            verdict = "WARN"
        else:
            verdict = "FAIL"

        return {
            "real": real_val,
            "synthetic": synth_val,
            "error": round(float(error), 4),
            "verdict": verdict,
            "parameter_hint": param_hint if verdict != "PASS" else None,
        }

    def compare_distribution(
        self, real_dist: Dict[str, float], synth_dist: Dict[str, float], param_hint: str
    ) -> Dict[str, Any]:
        """Compare distribution quantiles (p10, p50, p90, mean) using max relative quantile error."""
        keys = ["p10", "p50", "p90", "mean"]
        errors = []
        for k in keys:
            r = real_dist.get(k, 0.0)
            s = synth_dist.get(k, 0.0)
            denom = max(abs(r), 1.0)
            errors.append(abs(s - r) / denom)

        max_err = max(errors) if errors else 0.0

        if max_err <= self.ks_pass:
            verdict = "PASS"
        elif max_err <= self.ks_warn:
            verdict = "WARN"
        else:
            verdict = "FAIL"

        return {
            "real": real_dist,
            "synthetic": synth_dist,
            "error": round(float(max_err), 4),
            "verdict": verdict,
            "parameter_hint": param_hint if verdict != "PASS" else None,
        }

    def compare(
        self, real_metrics: Dict[str, Any], synth_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compare all metrics in the catalogue."""
        comparisons = {
            "fee_ratio_bps": self.compare_scalar(
                real_metrics.get("fee_ratio_bps", 0),
                synth_metrics.get("fee_ratio_bps", 0),
                "feePercent / fee_bps in simulator config",
            ),
            "refund_rate_bps": self.compare_scalar(
                real_metrics.get("refund_rate_bps", 0),
                synth_metrics.get("refund_rate_bps", 0),
                "exception_rates['PARTIAL_REFUND_NOT_REFLECTED'] or refund probability",
            ),
            "chargeback_rate_bps": self.compare_scalar(
                real_metrics.get("chargeback_rate_bps", 0),
                synth_metrics.get("chargeback_rate_bps", 0),
                "chargeback probability",
            ),
            "failed_share_bps": self.compare_scalar(
                real_metrics.get("failed_share_bps", 0),
                synth_metrics.get("failed_share_bps", 0),
                "gateway failed transaction rate",
            ),
            "narration_ref_rate_bps": self.compare_scalar(
                real_metrics.get("narration_ref_rate_bps", 0),
                synth_metrics.get("narration_ref_rate_bps", 0),
                "bank narration formatting pattern",
            ),
            "settlement_lag_days": self.compare_distribution(
                real_metrics.get("settlement_lag_days", {}),
                synth_metrics.get("settlement_lag_days", {}),
                "settlementLagDays",
            ),
            "amount_quantiles": self.compare_distribution(
                real_metrics.get("amount_quantiles", {}),
                synth_metrics.get("amount_quantiles", {}),
                "amount tier bounds in simulator",
            ),
            "payments_per_settlement": self.compare_distribution(
                real_metrics.get("payments_per_settlement", {}),
                synth_metrics.get("payments_per_settlement", {}),
                "settlements count divisor",
            ),
        }

        # Overall summary
        verdicts = [comp["verdict"] for comp in comparisons.values()]
        pass_count = verdicts.count("PASS")
        warn_count = verdicts.count("WARN")
        fail_count = verdicts.count("FAIL")

        overall = "PASS" if fail_count == 0 else ("WARN" if fail_count <= 2 else "FAIL")

        return {
            "metrics": comparisons,
            "summary": {
                "total_metrics": len(verdicts),
                "pass_count": pass_count,
                "warn_count": warn_count,
                "fail_count": fail_count,
                "overall_verdict": overall,
            },
        }
