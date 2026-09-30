# FIN-11 LedgerSense | Hackathon Pitching & Presentation Guide

This guide gives you the exact narrative, feature walkthrough, technical rationale, and clear examples to pitch **FIN-11 LedgerSense** to hackathon judges, technical leads, and finance stakeholders.

---

## 1. The Hook & The Problem Statement

### The 30-Second Elevator Pitch
> *"When a customer buys something online, a single payment generates four separate financial records across internal databases, payment gateways, banking settlement rails, and refund logs. Because these events occur at different times, use different identifiers, and are bundled into bulk settlements minus hidden processing fees and GST, modern finance teams lose millions in uncollected cash and manual reconciliation overhead. We built **LedgerSense**: an enterprise-grade, deterministic payment reconciliation and settlement engine that reconstructs the entire transaction lifecycle, detects discrepancies with zero false approvals, and ranks every financial risk by Amount at Risk."*

### The Problem in Plain English (With a Real Example)
Imagine an e-commerce customer buys sneakers for **₹1,000**:
1. **Internal Record**: Your database creates order `ORD-101` for `₹1,000`.
2. **Gateway Record**: Razorpay/Stripe captures the card payment as `pay_987` for `₹1,000`, deducting **₹20 MDR fee** + **₹3.60 GST** (Net = **₹976.40**).
3. **Refund Record**: The next day, the customer requests a partial refund of **₹200**.
4. **Bank Settlement**: Two days later, your bank statement receives a lump-sum deposit of **₹48,820** covering 50 different orders net of refunds and charges, with messy bank narration: `CMS/NACH/SETTL/SETTLE-001/HDFC`.

**The Challenge**: How does the CFO verify that the ₹1,000 internal sale actually landed in the bank account, that the payment processor didn't overcharge fees, and that the ₹200 refund was accurately netted? That is the FIN-11 challenge.

---

## 2. Why "Deterministic First"? (The Golden Technical Rule)

When pitching to technical judges, highlight this key architectural principle:
- **Finance is about exact mathematics and zero tolerance for precision loss.**
- LLMs hallucinate numbers, rates, and approval decisions. You cannot have an AI model guessing whether money was deposited into a bank account.
- **Our Solution**:
  - All financial math uses **integer paise** (BigInt) — no floating-point rounding errors.
  - The reconciliation engine runs **7 pure deterministic mathematical stages**.
  - A human analyst makes every financial review decision.
  - State changes are recorded in an **immutable, append-only audit log** protected by database triggers.

---

## 3. The 7 Reconciliation Stages (How We Built It & Why)

Walk the judges through each of the 7 stages using these simple examples:

### Stage 1: Transaction-ID Matching
- **Why**: The fastest, highest-confidence match.
- **How**: Performs exact equality matching between internal order references (`ORD-101`) and payment gateway references (`order_ref`).
- **Result**: Match confidence = 1.0 (100%).

### Stage 2: Reference Matching & Regex Narration Extraction
- **Why**: Real bank statement narrations are messy, truncated strings like `NEFT CR-UTR98765432-SETTLE-001-RAZORPAY NODAL`.
- **How**: Normalizes punctuation, strips prefixes, and applies regular expressions to extract embedded settlement tokens and UTR references from untrusted bank narrations.

### Stage 3: Partial & Weighted Matching
- **Why**: Invoices and payments may have slight date delays or partial reference truncations.
- **How**: Calculates a weighted score: Amount Closeness (50%) + Date Closeness (20%) + Reference Overlap (30%).
- **Rule**: Score >= 0.90 is automatically matched; Score between 0.60 and 0.90 is flagged as `AMBIGUOUS_MATCH` for human review.

### Stage 4: Fee & Tax Calculation
- **Why**: Payment gateways silently alter Merchant Discount Rate (MDR) tiers or miscalculate GST on processing fees.
- **How**: Recomputes expected fee schedule: `Fee = Gross * 2.00%`, `GST = Fee * 18%`, and verifies against actual gateway deductions.
- **Discrepancy Detected**: If variance exceeds tolerance (> ₹1), flags **`FEE_MISMATCH`**.

### Stage 5: Refund & Reversal Handling
- **Why**: Refunds and chargebacks occur asynchronously and alter expected settlement payouts.
- **How**: Nets approved refunds against the original transaction.
- **Discrepancy Detected**: If a refund was withheld from the settlement bundle, flags **`PARTIAL_REFUND_NOT_REFLECTED`**. If a chargeback occurs without an original payment, flags **`UNMATCHED_REVERSAL`**.

### Stage 6: Settlement Matching (One-to-Many Grouping)
- **Why**: Banks do NOT credit customer payments one by one. They send one bulk credit for 50 payments.
- **How**: Groups gateway captures by `settlement_id`, sums expected net amounts, and matches against bank credit statement UTRs.
- **Timing Lag vs Missing Credit**: If a credit is missing, the engine checks the date. If captured within T+2 days of the cutoff date, it is classified as **`TIMING_LAG`** (normal in-flight cash). If older, it is classified as **`MISSING_BANK_CREDIT`** (lost money).

### Stage 7: Exception Classification & Amount at Risk Ranking
- **Why**: Finance teams cannot review 10,000 discrepancies in arbitrary order.
- **How**: The engine prioritizes the exception queue strictly by **Amount at Risk** (highest financial exposure first).

---

## 4. J.P. Morgan 7-Step Synthetic Engine & Nova Accounting Data

Judges love rigorous data methodology. Explain how we handle data:

1. **Nova Real Accounting API**: Read-only integration with Nova accounting data (`/payments`, `/invoices`, `/gateway-transactions`, `/bank-transactions`, `/settlements`).
2. **J.P. Morgan 7-Step Methodology**:
   - We implemented the published 7-step process from J.P. Morgan AI Research (Assefa et al., ICAIF 2020) for synthetic financial generation.
   - We extract empirical statistical distributions from real data (fee ratio, settlement lag histogram, amount quantiles, refund rates).
   - Our Mulberry32 seeded generator creates byte-identical, reproducible synthetic datasets with hidden ground truth.
   - The **Synthetic Lab** runs two-sample Kolmogorov-Smirnov (KS) tests and relative error tests to compare synthetic batches against real Nova profiles (PASS / WARN / FAIL).
3. **Data Honesty Rule**: On simulated data, we prove **0 false approvals**; on real unlabelled Nova data, we honestly state "observed exception rate" rather than claiming artificial 100% accuracy.

---

## 5. Enterprise Controls & Concurrency Protection

- **Optimistic Concurrency Control (HTTP 409)**:
  - If two financial analysts open the same case simultaneously, each case has an atomic `version`.
  - When Analyst A approves the case, the version increments to 2.
  - When Analyst B attempts to submit a conflicting decision, the system detects `version == 1` is stale, refuses the overwrite, and returns **HTTP 409 Conflict**.
- **Immutable Append-Only Audit Trail**:
  - The `audit_log` table is protected by a PostgreSQL trigger prohibiting `UPDATE`, `DELETE`, and `TRUNCATE`.
- **CSV Formula Injection Sanitization**:
  - Exported CSV reports prepend `'` to any cell starting with `=`, `+`, `-`, `@` to prevent spreadsheet code execution.

---

## 6. How to Structure Your 5-Minute Demo

1. **Show Login & Role-Based Access** (Admin vs Reviewer).
2. **Generate a Simulated Dataset** with the seeded JPM generator.
3. **Click 'Run Reconciliation'** and show the live Server-Sent Events (SSE) progress stream.
4. **Open the Dashboard**: Show the match rate, Amount at Risk, and the benchmark proving **0 false approvals**.
5. **Open the Exception Queue**: Show exceptions ranked from highest Amount at Risk to lowest.
6. **Open a Case Dossier**: Show the 4-source audit timeline (Order -> Gateway -> Bank -> Settlement).
7. **Simulate Concurrent Reviews**: Show the 409 conflict protection when two tabs record conflicting decisions.
8. **Show the Immutable Audit Trail**: Prove that every decision is permanently recorded with user ID and rationale.
9. **Show the Synthetic Lab**: Run the Kolmogorov-Smirnov comparison comparing calibrated synthetic metrics against Nova real profiles.
