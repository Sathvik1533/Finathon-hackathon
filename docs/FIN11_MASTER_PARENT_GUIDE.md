# FIN-11 LedgerSense | Master Parent Pitch & Architecture Guide

> **Audience:** Core Engineering, Product, and Pitch Team  
> **Mission:** The definitive single-source-of-truth document for pitching LedgerSense, understanding the architecture, explaining the 7-stage engine with concrete examples, and highlighting the Nova API integration as our most valuable real-world core asset.

---

## 1. Executive Summary & Problem Statement (The 30-Second Elevator Pitch)

In modern digital commerce, when a customer purchases something online, money does not instantly move from the customer to the merchant. Instead, a single payment generates multiple financial events scattered across completely disconnected systems:
1. **Merchant ERP / Order System:** Records the initial order (e.g. Order #1001 for ₹1,000.00).
2. **Payment Gateway (e.g., Razorpay/Stripe):** Captures the payment under a completely different ID (`pay_H93kx`), deducting an MDR transaction fee (e.g., 2% + 18% GST).
3. **Settlement Clearing System:** Batches dozens or hundreds of separate payments together into a single lumped payout (`set_91002`).
4. **Merchant Bank Statement:** Receives a single lumped NEFT/RTGS credit with a messy, unstructured narration string (e.g., `CMS/NODAL/set_91002/CITIN0981/NET_PAYOUT`), net of all gateway fees and customer refund deductions.

Because these 4 systems speak different languages, use different IDs, deduct hidden fees, and settle on different days (T+2 lag), **merchants lose millions of dollars every year to silent fee overcharges, dropped settlements, and unreflected refunds**.

**LedgerSense** solves this by reconstructing the entire financial lifecycle across all 4 sources using a **deterministic 7-stage reconciliation engine**, surfacing discrepancies ranked by **Amount at Risk**, and integrating real-world financial ingestion via the **Aczen Nova API**.

---

## 2. The Core Jewel: Real-World Ingestion via Aczen Nova API

### Why Nova API is of Far Greater Value than Synthetic Add-ons
Most hackathon projects demonstrate reconciliation on toy mock arrays where IDs match perfectly. That is not how the real world works.
In real banking:
- Gateway fees have rounding nuances and GST taxes.
- Bank statements have messy unstructured narrations without clean foreign keys.
- Gateway settlements lump hundreds of payments together net of refunds.

**LedgerSense integrates directly with the Aczen Nova API** (`https://www.aczen.in/nova-api/v1`) to ingest **real read-only accounting and settlement data in INR with Indian GST**.
- **Real Transactions & Settlement Advices:** We pull live gateway transactions, bank credits, and settlement advices directly into raw audit tables (`nova_imports` and `nova_records`).
- **Data Integrity & Honesty:** We never claim artificial 100% accuracy on Nova batches because real-world accounting has no synthetic ground truth. Instead, LedgerSense computes the exact **observed exception rate** and calculates the true **Amount at Risk**.
- **The Benchmark Anchor:** Nova data serves as our gold-standard calibration baseline for our Synthetic Lab (using the J.P. Morgan 7-step method), ensuring our simulated datasets mirror real enterprise distribution dynamics.

---

## 3. The 7 Implementation Modules (Walkthrough with Concrete Numbers)

To pitch LedgerSense effortlessly, walk through this exact transaction story:

### Example Transaction:
Customer buys sneakers for **₹1,000.00** (`100,000 paise`).

### Stage 1: Transaction-ID Matching
- **Concept:** Reconciles internal order records against gateway capture records where primary transaction identifiers or checkout references match exactly 1-to-1.
- **Example:** Internal order `ORD_1001` matches Gateway record `pay_91001` with `order_ref = ORD_1001`.
- **Outcome:** Matched with 100% confidence.

### Stage 2: Reference Matching & Bank Narration Parsing
- **Concept:** Banks do not record gateway IDs. They record unstructured strings like `CMS/NODAL/set_91002/UTR981726/NET_PAYOUT`. Stage 2 uses normalized regex patterns to extract the settlement ID `set_91002` and the bank UTR `UTR981726`.
- **Outcome:** Links the bank credit to the gateway settlement advice without requiring manual data entry.

### Stage 3: Partial & Fuzzy Matching
- **Concept:** Identifies transactions where amounts match within configurable tolerance (e.g. ₹1.00 / 100 paise) and date timestamps fall within a configurable temporal window (e.g. $\pm 3$ days), assigning a weighted confidence score.
- **Outcome:** Recovers matches where small rounding discrepancies or date boundary cutoffs would otherwise cause false negatives.

### Stage 4: Fee Schedule & GST Verification
- **Concept:** Payment gateways charge a Merchant Discount Rate (MDR) plus 18% GST.
  - Contract MDR: 2.00%
  - Gross Amount: ₹1,000.00 (`100,000 paise`)
  - Expected MDR Fee: ₹20.00 (`2,000 paise`)
  - Expected 18% GST on Fee: ₹3.60 (`360 paise`)
  - Expected Total Deduction: ₹23.60 (`2,360 paise`)
  - Expected Net Payout: ₹976.40 (`97,640 paise`)
- **Discrepancy Injected:** Gateway silently deducts ₹25.96 (`2,596 paise`) due to an incorrect tier classification.
- **Engine Action:** Flags an immediate `FEE_MISMATCH` exception with **Amount at Risk: ₹2.36** (`236 paise`).

### Stage 5: Refund Netting & Chargeback Reversals
- **Concept:** When a customer returns goods, the refund is netted against the merchant's next settlement payout, along with a partial reversal of gateway fees.
- **Engine Action:** Nets active refunds against payout credits. If a refund was debited from the merchant but never reached the customer, flags `PARTIAL_REFUND_NOT_REFLECTED`.

### Stage 6: One-to-Many Settlement Grouping & Timing Lag
- **Concept:** A single bank credit of ₹4,882.00 actually represents **5 separate customer payments** of ₹1,000.00 minus fees.
- **Engine Action:** Groups child gateway payments by `settlement_id`, sums their net amounts, and verifies that the sum exactly equals the bank credit.
- **Timing Lag:** If a payment was captured on Sept 29th, the batch cut is Sept 30th, and the bank lag is 2 days ($T+2$), the payment is legally in-flight. The engine categorizes it as `TIMING_LAG` (Low Severity) rather than a panic error.

### Stage 7: Exception Classification & Amount at Risk Ranking
- **Concept:** Every unmatched record or financial leak is classified into a strict categorization table and prioritized by **Amount at Risk** (e.g., high severity missing bank credits are reviewed before low severity timing lags).

---

## 4. The Human-in-the-Loop & Audit Governance

### Why Financial Software Cannot Have Autonomous AI Approvals
In accounting, if an AI agent hallucinates and auto-approves a ₹10,000,000 discrepancy, it creates illegal financial misstatements.
**LedgerSense Golden Rules:**
1. **Deterministic First, AI Second:** Matching and calculations are 100% deterministic code.
2. **AI Only Explains, Cites, and Summarizes:** The AI drafts explanations, cites governance policies (e.g., `POL_FEE_TOLERANCE`), and summarizes runs.
3. **Only a Human Makes Decisions:** An authorized reviewer must click `APPROVE`, `REJECT`, or `ESCALATE` with a mandatory rationale.
4. **Append-Only Audit Log:** Every human action is recorded in an immutable PostgreSQL audit log guarded by a database trigger that rejects any update or deletion.
5. **Optimistic Locking (OCC):** If two reviewers review the same case simultaneously, the second write receives an HTTP 409 Conflict, preventing double-decision races.

---

## 5. Synthetic Lab (J.P. Morgan 7-Step Method)
- Evaluates synthetic reconciliation datasets against real Nova benchmarks across 8 core statistical metrics:
  1. Fee ratio
  2. Settlement lag days
  3. Refund rate
  4. Amount quantiles (P25, P50, P75, P90)
  5. Payments per settlement payout
  6. Failed payment share
  7. Chargeback rate
  8. Narration reference extraction rate
- Uses two-sample **Kolmogorov-Smirnov (KS) tests** to grade simulation fidelity (`PASS` / `WARN` / `FAIL`).

---

## 6. How Teammates Pitch This to Evaluators
1. **Hook:** "Digital payments look instant to users, but behind the scenes, merchants juggle 4 separate financial records for every single payment—and lose billions to hidden discrepancies."
2. **Solution:** "We built LedgerSense: a deterministic 7-stage reconciliation engine that reconstructs the full financial lifecycle from ERP orders to messy bank UTR statements."
3. **Real-World Value:** "Unlike typical projects that run on synthetic mocks, our primary asset is live ingestion from the Aczen Nova API, reconciling real INR transactions with Indian GST and MDR schedules."
4. **Governance & AI:** "We combine strict integer-paise math and immutable audit trails with guarded AI assistants that cite accounting policies without ever hallucinating financial decisions."
