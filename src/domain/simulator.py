"""J.P. Morgan 7-Step Synthetic Financial Data Generator.
Generates four linked financial sources:
1. Internal Transaction Records (Order Management / ERP)
2. Payment Gateway Records (Captures, Fees, Taxes, Settlements)
3. Bank Settlement Records (Statement credits, UTR, messy narrations)
4. Refunds and Reversals (Refunds, Chargebacks)
Features:
- Seeded PRNG (Mulberry32) for byte-identical reproducibility
- One-to-many settlement grouping (one bank credit covers many payments net of fee, GST, and refunds)
- Realistic messy bank narrations embedding references
- Injected financial discrepancies with hidden ground truth
"""

from datetime import datetime, timedelta, timezone
import uuid
from typing import Dict, Any, List, Optional
from src.domain.prng import Mulberry32
from src.domain.money import calculate_fee_and_gst


class SyntheticDatasetGenerator:
    def __init__(
        self,
        seed: int = 42,
        size: int = 100,
        fee_bps: int = 200,
        gst_bps: int = 1800,
        settlement_lag_days: int = 2,
        as_of: Optional[datetime] = None,
        exception_rates: Optional[Dict[str, float]] = None,
        profile_params: Optional[Dict[str, Any]] = None,
    ):
        self.seed = seed
        self.size = max(5, size)
        self.prng = Mulberry32(seed)
        self.as_of = as_of or datetime(2026, 9, 30, 18, 0, 0, tzinfo=timezone.utc)

        # Apply profile calibration if provided
        if profile_params:
            self.fee_bps = int(profile_params.get("fee_bps", fee_bps))
            self.gst_bps = int(profile_params.get("gst_bps", gst_bps))
            self.settlement_lag_days = int(profile_params.get("settlement_lag_days", settlement_lag_days))
        else:
            self.fee_bps = fee_bps
            self.gst_bps = gst_bps
            self.settlement_lag_days = settlement_lag_days

        # Default exception injection probabilities
        self.exception_rates = {
            "FEE_MISMATCH": 0.05,
            "MISSING_BANK_CREDIT": 0.04,
            "TIMING_LAG": 0.05,
            "AMOUNT_MISMATCH": 0.03,
            "PARTIAL_REFUND_NOT_REFLECTED": 0.03,
            "UNMATCHED_REVERSAL": 0.02,
            "DUPLICATE_BANK_CREDIT": 0.02,
            "DUPLICATE_PAYMENT": 0.02,
            "AMBIGUOUS_MATCH": 0.02,
        }
        if exception_rates:
            self.exception_rates.update(exception_rates)

    def generate(self, merchant_id: str, batch_id: str) -> Dict[str, Any]:
        """Generate all four linked datasets with hidden ground truth."""
        internal_txns: List[Dict[str, Any]] = []
        gateway_txns: List[Dict[str, Any]] = []
        bank_credits: List[Dict[str, Any]] = []
        refunds: List[Dict[str, Any]] = []
        source_settlements: List[Dict[str, Any]] = []

        # Start 7 days prior to as_of date
        base_start = self.as_of - timedelta(days=7)

        # Cluster payments into settlements (avg 4-8 payments per settlement)
        settlements_count = max(1, self.size // 6)
        settlement_buckets: Dict[str, List[Dict[str, Any]]] = {}
        for s_idx in range(settlements_count):
            s_ref = f"SETTLE-{self.seed}-{s_idx+1:04d}"
            settlement_buckets[s_ref] = []

        settlement_refs = list(settlement_buckets.keys())

        # Determine exception quota for this batch
        exception_choices = list(self.exception_rates.keys())
        exception_weights = [self.exception_rates[k] for k in exception_choices]

        for i in range(self.size):
            txn_id = str(uuid.uuid4())
            internal_num = f"TXN-{self.seed}-{i+1:05d}"
            order_ref = f"ORD-{self.seed}-{i+1:05d}"
            gateway_pay_id = f"pay_{self.seed}_{i+1:05d}"

            # Amount distribution (100 INR to 25,000 INR, in paise)
            # Use multi-modal distribution typical of retail payments
            tier = self.prng.random()
            if tier < 0.60:
                amount_inr = self.prng.randint(150, 2500)
            elif tier < 0.90:
                amount_inr = self.prng.randint(2500, 10000)
            else:
                amount_inr = self.prng.randint(10000, 35000)
            amount_paise = amount_inr * 100

            # Transaction created at random offset between base_start and as_of
            day_offset = self.prng.randint(0, 5)
            hour_offset = self.prng.randint(0, 23)
            minute_offset = self.prng.randint(0, 59)
            created_at = base_start + timedelta(days=day_offset, hours=hour_offset, minutes=minute_offset)

            # Assign to settlement
            s_ref = settlement_refs[i % len(settlement_refs)]

            # Decide whether to inject an exception
            inject = self.prng.random() < sum(exception_weights)
            injected_category = None
            if inject:
                injected_category = self.prng.sample_distribution(exception_choices, exception_weights)

            # Calculate normal fee and GST
            fee_paise, tax_paise, expected_net = calculate_fee_and_gst(amount_paise, self.fee_bps, self.gst_bps)

            gw_amount = amount_paise
            gw_fee = fee_paise
            gw_tax = tax_paise
            gw_status = "captured"
            gw_order_ref = order_ref
            captured_at = created_at + timedelta(minutes=self.prng.randint(1, 20))

            expected_status = "SETTLED"
            expected_cat = None

            # Handle discrepancy injection
            if injected_category == "FEE_MISMATCH":
                # Gateway charged 3.5% instead of 2.0%
                gw_fee = int(gw_fee * 1.75) + 250
                expected_status = "EXCEPTION"
                expected_cat = "FEE_MISMATCH"

            elif injected_category == "AMOUNT_MISMATCH":
                # Order and Gateway capture amount differ by 500 paise (5 INR)
                gw_amount = amount_paise - 500
                expected_status = "EXCEPTION"
                expected_cat = "AMOUNT_MISMATCH"

            elif injected_category == "AMBIGUOUS_MATCH":
                # Order ref altered slightly, e.g. prefix stripped
                gw_order_ref = order_ref.replace("ORD-", "REF-")
                expected_status = "EXCEPTION"
                expected_cat = "AMBIGUOUS_MATCH"

            elif injected_category == "TIMING_LAG":
                # Captured right before as_of, bank credit has not arrived yet within T+lag window
                captured_at = self.as_of - timedelta(hours=12)
                expected_status = "EXCEPTION"
                expected_cat = "TIMING_LAG"

            elif injected_category == "MISSING_BANK_CREDIT":
                # Old transaction captured long ago, bank settlement never arrived
                captured_at = self.as_of - timedelta(days=6)
                expected_status = "EXCEPTION"
                expected_cat = "MISSING_BANK_CREDIT"

            elif injected_category == "DUPLICATE_PAYMENT":
                # Customer double clicked, two captures exist for same internal order
                expected_status = "EXCEPTION"
                expected_cat = "DUPLICATE_PAYMENT"

            elif injected_category == "PARTIAL_REFUND_NOT_REFLECTED":
                expected_status = "EXCEPTION"
                expected_cat = "PARTIAL_REFUND_NOT_REFLECTED"

            elif injected_category == "UNMATCHED_REVERSAL":
                expected_status = "EXCEPTION"
                expected_cat = "UNMATCHED_REVERSAL"

            # Create internal record
            internal_row = {
                "id": txn_id,
                "batch_id": batch_id,
                "merchant_id": merchant_id,
                "internal_id": internal_num,
                "order_ref": order_ref,
                "amount_paise": amount_paise,
                "currency": "INR",
                "created_at": created_at.isoformat(),
                "ground_truth": {
                    "expected_status": expected_status,
                    "expected_category": expected_cat,
                    "settlement_group": s_ref,
                },
            }
            internal_txns.append(internal_row)

            # Create gateway record
            gw_id = str(uuid.uuid4())
            gateway_row = {
                "id": gw_id,
                "batch_id": batch_id,
                "merchant_id": merchant_id,
                "gateway_payment_id": gateway_pay_id,
                "order_ref": gw_order_ref,
                "amount_paise": gw_amount,
                "fee_paise": gw_fee,
                "tax_paise": gw_tax,
                "status": gw_status,
                "captured_at": captured_at.isoformat(),
                "settlement_id": s_ref if injected_category != "MISSING_SETTLEMENT" else None,
            }
            gateway_txns.append(gateway_row)

            # If duplicate payment, add a second gateway capture
            if injected_category == "DUPLICATE_PAYMENT":
                dup_gw_id = str(uuid.uuid4())
                gateway_txns.append({
                    "id": dup_gw_id,
                    "batch_id": batch_id,
                    "merchant_id": merchant_id,
                    "gateway_payment_id": f"pay_{self.seed}_{i+1:05d}_dup",
                    "order_ref": order_ref,
                    "amount_paise": gw_amount,
                    "fee_paise": gw_fee,
                    "tax_paise": gw_tax,
                    "status": "captured",
                    "captured_at": (captured_at + timedelta(seconds=15)).isoformat(),
                    "settlement_id": s_ref,
                })

            # Record in settlement bucket if not missing credit / timing lag
            if injected_category not in ("MISSING_BANK_CREDIT", "TIMING_LAG", "MISSING_SETTLEMENT"):
                settlement_buckets[s_ref].append({
                    "net_paise": gw_amount - gw_fee - gw_tax,
                    "payment_id": gateway_pay_id,
                    "order_ref": order_ref,
                    "captured_at": captured_at,
                })

            # Check if this transaction triggers a refund
            if injected_category == "PARTIAL_REFUND_NOT_REFLECTED" or (self.prng.random() < 0.05 and injected_category is None):
                rfnd_paise = amount_paise // 2
                rfnd_id = str(uuid.uuid4())
                refunds.append({
                    "id": rfnd_id,
                    "batch_id": batch_id,
                    "merchant_id": merchant_id,
                    "refund_id": f"rfnd_{self.seed}_{i+1:04d}",
                    "gateway_payment_id": gateway_pay_id,
                    "amount_paise": rfnd_paise,
                    "status": "processed",
                    "kind": "refund",
                    "created_at": (captured_at + timedelta(days=1)).isoformat(),
                })
                # If PARTIAL_REFUND_NOT_REFLECTED, bank credit will not subtract the refund!
                if injected_category != "PARTIAL_REFUND_NOT_REFLECTED":
                    # Deduct from settlement bucket
                    settlement_buckets[s_ref].append({
                        "net_paise": -rfnd_paise,
                        "payment_id": gateway_pay_id,
                        "order_ref": order_ref,
                        "captured_at": captured_at + timedelta(days=1),
                    })

        # Inject an UNMATCHED_REVERSAL (refund row pointing to non-existent gateway payment)
        orphan_rfnd_id = str(uuid.uuid4())
        refunds.append({
            "id": orphan_rfnd_id,
            "batch_id": batch_id,
            "merchant_id": merchant_id,
            "refund_id": f"rfnd_{self.seed}_orphan_9999",
            "gateway_payment_id": f"pay_{self.seed}_nonexistent",
            "amount_paise": 250000,
            "status": "processed",
            "kind": "chargeback",
            "created_at": self.as_of.isoformat(),
        })

        # Process Settlement Buckets into Bank Credits and Source Settlements (One-to-Many grouping)
        for s_idx, (s_ref, items) in enumerate(settlement_buckets.items()):
            if not items:
                continue

            net_sum_paise = sum(item["net_paise"] for item in items)
            if net_sum_paise <= 0:
                continue

            settlement_date = base_start + timedelta(days=s_idx + self.settlement_lag_days)
            utr = f"UTR{self.seed}{s_idx+1:08d}"

            # Create realistic messy bank narration embedding reference or UTR
            narration_styles = [
                f"CMS/NACH/SETTL/{s_ref}/PAYOUT/HDFC",
                f"NEFT CR-{utr}-{s_ref}-RAZORPAY NODAL",
                f"ACH CR/ACME MERCH/{s_ref}/SBI",
                f"IMPS/P2A/{utr}/SETTLEMENT",
            ]
            narration = self.prng.choice(narration_styles)

            # Bank Credit
            bank_id = str(uuid.uuid4())
            bank_row = {
                "id": bank_id,
                "batch_id": batch_id,
                "merchant_id": merchant_id,
                "utr": utr,
                "amount_paise": net_sum_paise,
                "credited_at": settlement_date.isoformat(),
                "narration": narration,
                "settlement_ref": s_ref,
            }
            bank_credits.append(bank_row)

            # If duplicate bank credit injected, duplicate the bank statement entry
            if s_idx == 0 and any(t["ground_truth"]["expected_category"] == "DUPLICATE_BANK_CREDIT" for t in internal_txns):
                bank_credits.append({
                    "id": str(uuid.uuid4()),
                    "batch_id": batch_id,
                    "merchant_id": merchant_id,
                    "utr": f"{utr}_DUP",
                    "amount_paise": net_sum_paise,
                    "credited_at": (settlement_date + timedelta(hours=2)).isoformat(),
                    "narration": f"DUPL CMS/{s_ref}",
                    "settlement_ref": s_ref,
                })

            # Source Settlement record (expected payout audit)
            source_settlements.append({
                "id": str(uuid.uuid4()),
                "batch_id": batch_id,
                "merchant_id": merchant_id,
                "settlement_ref": s_ref,
                "settlement_date": settlement_date.date().isoformat(),
                "period_start": (settlement_date - timedelta(days=2)).date().isoformat(),
                "period_end": settlement_date.date().isoformat(),
                "status": "settled",
                "net_amount_paise": net_sum_paise,
                "adjustments_paise": 0,
                "payout_account_id": f"acc_{self.seed}_nodal",
            })

        return {
            "internal_txns": internal_txns,
            "gateway_txns": gateway_txns,
            "bank_credits": bank_credits,
            "refunds": refunds,
            "source_settlements": source_settlements,
        }
