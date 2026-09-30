"""Unit tests for Mulberry32 PRNG and J.P. Morgan 7-step synthetic financial generator.
"""

from src.domain.prng import Mulberry32
from src.domain.money import to_paise, from_paise, calculate_fee_and_gst
from src.domain.simulator import SyntheticDatasetGenerator


def test_money_helpers():
    assert to_paise(0) == 0
    assert to_paise(0.01) == 1
    assert to_paise(0.1) == 10
    assert to_paise(0.29) == 29
    assert to_paise("1234567.89") == 123456789
    assert from_paise(123456789) == 1234567.89

    fee, tax, net = calculate_fee_and_gst(100000, 200, 1800)  # 1,000 INR
    assert fee == 2000  # 2% = 20 INR
    assert tax == 360   # 18% of 20 = 3.60 INR -> 360 paise
    assert net == 100000 - 2000 - 360  # 976.40 INR


def test_prng_determinism():
    p1 = Mulberry32(12345)
    seq1 = [p1.random() for _ in range(50)]

    p2 = Mulberry32(12345)
    seq2 = [p2.random() for _ in range(50)]

    assert seq1 == seq2


def test_synthetic_generator_byte_identical_reproducibility():
    sim1 = SyntheticDatasetGenerator(seed=42, size=30)
    data1 = sim1.generate("m_test", "b_test")

    sim2 = SyntheticDatasetGenerator(seed=42, size=30)
    data2 = sim2.generate("m_test", "b_test")

    # Identical internal record count and amounts
    assert len(data1["internal_txns"]) == len(data2["internal_txns"])
    for i in range(len(data1["internal_txns"])):
        assert data1["internal_txns"][i]["amount_paise"] == data2["internal_txns"][i]["amount_paise"]
        assert data1["internal_txns"][i]["order_ref"] == data2["internal_txns"][i]["order_ref"]

    # Verify hidden ground truth is present on every internal row
    for row in data1["internal_txns"]:
        gt = row.get("ground_truth")
        assert gt is not None
        assert gt["expected_status"] in ("SETTLED", "EXCEPTION")


def test_one_to_many_settlement_grouping():
    sim = SyntheticDatasetGenerator(seed=999, size=60)
    data = sim.generate("m_test", "b_test")

    # Bank credits must represent one-to-many aggregations
    assert len(data["bank_credits"]) > 0
    assert len(data["gateway_txns"]) > len(data["bank_credits"])
    assert len(data["source_settlements"]) > 0
