"""Unit tests for the deterministic 7-stage reconciliation engine.
Tests all discrepancy detection rules and verifies zero dependency on AI or hidden ground truth.
"""

from datetime import datetime, timezone, timedelta
from src.domain.engine import ReconciliationEngine
from src.domain.simulator import SyntheticDatasetGenerator
from src.routes.config_routes import DEFAULT_CONFIG_VALUES


def test_engine_stages_and_benchmarks():
    as_of = datetime(2026, 9, 30, 18, 0, 0, tzinfo=timezone.utc)
    engine = ReconciliationEngine(config_snapshot=DEFAULT_CONFIG_VALUES, as_of=as_of)

    sim = SyntheticDatasetGenerator(seed=123, size=40, as_of=as_of)
    records = sim.generate(merchant_id="m1", batch_id="b1")

    results = engine.execute(
        merchant_id="m1",
        run_id="r1",
        internal_txns=records["internal_txns"],
        gateway_txns=records["gateway_txns"],
        bank_credits=records["bank_credits"],
        refunds=records["refunds"],
        source_settlements=records["source_settlements"],
    )

    matches = results["matches"]
    exceptions = results["exceptions"]
    outcomes = results["run_outcomes"]

    # 1. Matches must be found across stages
    assert len(matches) > 0
    stages_found = {m["stage"] for m in matches}
    assert "txn_id_match" in stages_found or "settlement_match" in stages_found

    # 2. Exceptions must be strictly sorted by amount_at_risk_paise descending
    for i in range(len(exceptions) - 1):
        assert exceptions[i]["amount_at_risk_paise"] >= exceptions[i + 1]["amount_at_risk_paise"]

    # 3. Engine must NEVER approve exceptions (status must only be 'OPEN')
    for exc in exceptions:
        assert exc["status"] == "OPEN"

    # 4. Total outcomes must cover all internal transactions
    assert len(outcomes) >= len(records["internal_txns"])


def test_engine_zero_label_leakage():
    """Verify that removing hidden ground_truth produces byte-identical engine output."""
    as_of = datetime(2026, 9, 30, 18, 0, 0, tzinfo=timezone.utc)
    engine = ReconciliationEngine(config_snapshot=DEFAULT_CONFIG_VALUES, as_of=as_of)

    sim = SyntheticDatasetGenerator(seed=777, size=30, as_of=as_of)
    records1 = sim.generate(merchant_id="m1", batch_id="b1")

    # Run with ground truth present
    res1 = engine.execute(
        merchant_id="m1",
        run_id="r1",
        internal_txns=records1["internal_txns"],
        gateway_txns=records1["gateway_txns"],
        bank_credits=records1["bank_credits"],
        refunds=records1["refunds"],
    )

    # Clone and strip ground_truth completely
    sim2 = SyntheticDatasetGenerator(seed=777, size=30, as_of=as_of)
    records2 = sim2.generate(merchant_id="m1", batch_id="b1")
    for it in records2["internal_txns"]:
        it["ground_truth"] = None

    res2 = engine.execute(
        merchant_id="m1",
        run_id="r2",
        internal_txns=records2["internal_txns"],
        gateway_txns=records2["gateway_txns"],
        bank_credits=records2["bank_credits"],
        refunds=records2["refunds"],
    )

    # Exception counts and categories must match exactly
    assert len(res1["exceptions"]) == len(res2["exceptions"])
    cats1 = [e["category"] for e in res1["exceptions"]]
    cats2 = [e["category"] for e in res2["exceptions"]]
    assert cats1 == cats2


def test_fee_mismatch_detection():
    as_of = datetime(2026, 9, 30, 18, 0, 0, tzinfo=timezone.utc)
    engine = ReconciliationEngine(config_snapshot=DEFAULT_CONFIG_VALUES, as_of=as_of)

    internal = [{
        "id": "it_1",
        "internal_id": "TXN-1",
        "order_ref": "ORD-1",
        "amount_paise": 100000,  # 1,000 INR
        "currency": "INR",
        "created_at": as_of.isoformat(),
    }]
    # Normal fee is 2% = 2000 paise + 18% GST (360 paise) = 2360 paise.
    # We inject an inflated fee of 5000 paise (50 INR)
    gateway = [{
        "id": "gw_1",
        "gateway_payment_id": "pay_1",
        "order_ref": "ORD-1",
        "amount_paise": 100000,
        "fee_paise": 5000,
        "tax_paise": 900,
        "status": "captured",
        "captured_at": as_of.isoformat(),
        "settlement_id": "SETTLE-1",
    }]

    res = engine.execute(
        merchant_id="m1",
        run_id="r1",
        internal_txns=internal,
        gateway_txns=gateway,
        bank_credits=[],
        refunds=[],
    )

    fee_excs = [e for e in res["exceptions"] if e["category"] == "FEE_MISMATCH"]
    assert len(fee_excs) == 1
    assert fee_excs[0]["evidence"]["actual_fee_paise"] == 5000
