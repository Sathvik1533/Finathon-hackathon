"""Unit tests for the J.P. Morgan 7-step Synthetic Lab metric computation and comparator.
"""

from src.domain.metrics import compute_metric_catalogue
from src.domain.comparator import MetricComparator
from src.domain.simulator import SyntheticDatasetGenerator


def test_metric_catalogue_computation():
    sim = SyntheticDatasetGenerator(seed=888, size=40)
    data = sim.generate("m1", "b1")

    metrics = compute_metric_catalogue(
        data["internal_txns"],
        data["gateway_txns"],
        data["bank_credits"],
        data["refunds"],
    )

    assert "fee_ratio_bps" in metrics
    assert "settlement_lag_days" in metrics
    assert "amount_quantiles" in metrics
    assert "payments_per_settlement" in metrics
    assert metrics["sample_size"] == len(data["internal_txns"])


def test_metric_comparator_identical_profiles():
    sim = SyntheticDatasetGenerator(seed=101, size=30)
    data = sim.generate("m1", "b1")

    metrics1 = compute_metric_catalogue(data["internal_txns"], data["gateway_txns"], data["bank_credits"], data["refunds"])
    metrics2 = compute_metric_catalogue(data["internal_txns"], data["gateway_txns"], data["bank_credits"], data["refunds"])

    comparator = MetricComparator()
    comparison = comparator.compare(metrics1, metrics2)

    assert comparison["summary"]["overall_verdict"] == "PASS"
    assert comparison["summary"]["fail_count"] == 0
    for m in comparison["metrics"].values():
        assert m["verdict"] == "PASS"
        assert m["error"] == 0.0


def test_metric_comparator_detects_deliberate_discrepancy():
    comparator = MetricComparator(tol_pass=0.10, tol_warn=0.25)
    # 200 bps vs 350 bps -> 75% error -> must FAIL and return hint
    real = {"fee_ratio_bps": 200, "refund_rate_bps": 100, "chargeback_rate_bps": 10, "failed_share_bps": 50, "narration_ref_rate_bps": 8000, "settlement_lag_days": {"p50": 2, "mean": 2}, "amount_quantiles": {"p50": 1000, "mean": 1000}, "payments_per_settlement": {"p50": 5, "mean": 5}}
    synth = {"fee_ratio_bps": 350, "refund_rate_bps": 100, "chargeback_rate_bps": 10, "failed_share_bps": 50, "narration_ref_rate_bps": 8000, "settlement_lag_days": {"p50": 2, "mean": 2}, "amount_quantiles": {"p50": 1000, "mean": 1000}, "payments_per_settlement": {"p50": 5, "mean": 5}}

    comp = comparator.compare(real, synth)
    assert comp["metrics"]["fee_ratio_bps"]["verdict"] == "FAIL"
    assert comp["metrics"]["fee_ratio_bps"]["parameter_hint"] is not None
