# FIN-11 LedgerSense | Gamma AI Presentation Deck (Synced End-to-End Roadmap)

> **How to use with Gamma AI**:
> 1. Copy the entire markdown content below.
> 2. Open [Gamma App](https://gamma.app) and select **New from text / Import**.
> 3. Paste this document and choose **Generate Presentation**.
> 4. Gamma will auto-format cards, diagrams, metrics, and callouts into high-impact visual slides.

---

# Slide 1: Title & Vision
## LedgerSense: End-to-End Payment Reconciliation & Settlement Engine
### Reconstructing Multi-Source Financial Lifecycles with Deterministic Precision

- **Problem Category**: FIN-11 Payment Reconciliation & Settlement Auditing
- **Core Value Proposition**: Reconciling asynchronous financial streams across Internal Orders, Payment Gateways, and Bank Settlements with zero precision loss.
- **The Core Differentiator**: Real-world ingestion powered by the **Aczen Nova Financial API** + Arbitrary-Precision PostgreSQL with Row Level Security.
- **Key Metrics**: 0 False Approvals | 100% Deterministic Mathematical Auditing | Exact Integer Paise / NUMERIC(18,4) Engine

---

# Slide 2: The Problem Statement
## The Multi-Source Financial Chaos
### Why Modern Finance Teams Lose Millions in Unreconciled Payouts

A single customer payment generates 4 separate, asynchronous records with mismatched identifiers:

1. **Internal Order**: Customer buys sneakers for **₹1,000** (`ORD-101`). Internal status: Confirmed.
2. **Gateway Authorization**: Razorpay/Stripe processes **₹1,000** (`pay_987`), deducting **₹20 MDR Fee** + **₹3.60 GST** (Net = **₹976.40**).
3. **Refund / Chargeback**: Next day, customer returns 1 item; partial refund of **₹200** issued (`rfnd_456`).
4. **Bank Settlement**: Two days later, the merchant's bank account receives a lump-sum deposit of **₹48,820** covering 50 different orders with cryptic narration: `CMS/NACH/SETTL/SETTLE-001/HDFC`.

> **The CFO's Dilemma**: How do we verify that the ₹1,000 order actually landed in our bank account, that payment processors didn't silently overcharge fees, and that the refund was correctly deducted?

---

# Slide 3: The Aczen Nova API
## Our Unfair Advantage: Real Financial Data Ingestion

While competitors rely on naive random numbers or artificial mock CSVs, LedgerSense ingests live, multi-source accounting lifecycles using the **Nova API**:

- **Why Nova is the Central Asset**:
  - Provides the authentic schema of digital commerce: Orders, Payment Gateway Events, and Bank Narration Statements.
  - Realistic latency: Captures the true T+1 and T+2 settlement windows.
  - Complex edge cases: Accurately models asynchronous refunds, partial chargebacks, and blended MDR fee tiers.
- **Nova Data Endpoints Integrated**:
  - `GET /payments` — Internal order book and customer checkout intents.
  - `GET /gateway-transactions` — Processor authorization, capture status, fee deductions, and GST splits.
  - `GET /bank-transactions` — Raw bank settlement credits and UTR clearing statements.
  - `GET /settlements` — Processor clearing bundles and batch payout metadata.

---

# Slide 4: Key Differentiators & Technical Moat
## Why LedgerSense Outperforms Generic Competitors

| Dimension | Typical Competitor Submissions | LedgerSense Architecture |
|---|---|---|
| **Data Types** | `FLOAT` / `DOUBLE` / JS `Number` (Accumulates rounding drift) | PostgreSQL `NUMERIC(18,4)` & Integer Paise (Zero math error) |
| **Data Source** | Pure artificial mocks / CSVs | **Aczen Nova API** Real Accounting Feeds |
| **Data Security** | Generic app-level filtering | Database **Row Level Security (RLS)** & Multi-Tenant Isolation |
| **Audit Compliance** | Mutable database records | **Immutable Append-Only Audit Triggers** (Blocks Update/Delete) |
| **Concurrency** | Last-write-wins (Race condition risk) | **Optimistic Concurrency Control (HTTP 409)** with atomic versioning |
| **Decision Logic** | Unregulated AI hallucination | **7-Stage Deterministic Math Engine** (AI is strictly assistive) |

---

# Slide 5: The 7-Stage Deterministic Reconciliation Engine
## Reconstructing the Lifecycle Without Hallucination

LedgerSense executes a pure, mathematical 7-stage pipeline:

1. **Stage 1: Transaction-ID Matching**: Exact match between internal order IDs and gateway references (Confidence = 1.0).
2. **Stage 2: Reference & Regex Narration Parsing**: Extracts cryptic bank statement narrations (`NEFT CR-UTR987654-SETTLE-001`) into structured settlement tokens.
3. **Stage 3: Weighted Partial Matching**: Multi-factor scoring (Amount 50% + Date Closeness 20% + Reference Overlap 30%). Matches $\ge 0.90$; flags $[0.60, 0.90)$ for review.
4. **Stage 4: Fee & GST Verification**: Recomputes expected fees against contractual MDR schedules (`Gross * 2.0% + 18% GST`). Flags `FEE_MISMATCH` if variance $> ₹1.00$.
5. **Stage 5: Refund & Reversal Netting**: Ties partial/full refunds to original transactions; detects withholding omissions.
6. **Stage 6: One-to-Many Settlement Grouping**: Bundles captured payments into bank batch deposits; differentiates legitimate `TIMING_LAG` (in-flight) from `MISSING_BANK_CREDIT`.
7. **Stage 7: Amount at Risk Prioritization**: Ranks the exception queue strictly by financial exposure so analysts resolve highest-value risks first.

---

# Slide 6: Database Architecture & PostgreSQL Differentiators
## Built on Supabase with Enterprise-Grade Integrity

- **Arbitrary Numeric Precision**: Every monetary field uses `NUMERIC(18,4)` to prevent IEEE-754 precision loss.
- **Row Level Security (RLS)**: Enforced directly on PostgreSQL tables (`internal_transactions`, `gateway_records`, `bank_settlements`, `discrepancy_cases`). Merchants can never access competitor ledgers.
- **Immutable Audit Trail**: Database trigger `prevent_audit_log_tamper()` violently rejects any `UPDATE`, `DELETE`, or `TRUNCATE` operations on audit tables.
- **Versioned Migrations**: 10 clean migrations in `supabase/migrations/` synced automatically via Supabase's GitHub integration.

---

# Slide 7: Tech Stack & System Architecture
## Production-Ready Modular Stack

- **Database**: PostgreSQL / Supabase with `NUMERIC(18,4)`, custom ENUMs, and RLS policies.
- **Backend API (`/api`)**: Node.js + Express + TypeScript
  - Clean modular architecture: Routers, Controllers, Services, and `pg` Connection Pool (No heavyweight ORM / No SQLAlchemy).
  - Secure **Authentication**: Username/Password login with JWT tokens and role-based permissions (Reviewer vs Admin); Google OAuth architecture ready.
- **Frontend (`/web`)**: Next.js + React + Tailwind CSS
  - 5 Core Screens: Executive Dashboard, 4-Source Feed Explorer, Exception Management Center, Settlement Matcher, and Audit Trail.
- **Infrastructure**: Dockerized containerization ready for AWS deployment (ECS, RDS, Redis, S3).

---

# Slide 8: The 5 Core Frontend User Screens
## Designed for Professional Finance Operations

1. **Executive Reconciliation Dashboard**: High-level KPIs (Total Processed, Successfully Settled, Net Fee Leakage, Total Amount at Risk).
2. **4-Source Lifecycle Explorer**: Side-by-side transaction timeline showing Internal Order ⇄ Gateway Event ⇄ Refund ⇄ Bank Settlement.
3. **Exception & Discrepancy Management Center**: Amount at Risk prioritized queue with single-click case inspector and human review actions (Approve, Reject, Escalate).
4. **Settlement & Batch Matcher**: Visual one-to-many reconciliation matching lump-sum bank statement credits with individual gateway batches.
5. **Immutable Audit Trail Viewer**: Tamper-proof log tracking every automated run, config update, and reviewer decision with timestamps and user attribution.

---

# Slide 9: Our Strategic Roadmap: From Core to Governed AI
## Pragmatic Engineering Over Gimmicks

### Phase 1: End-to-End Deterministic Foundation (Current)
- Complete PostgreSQL schema with RLS and exact `NUMERIC(18,4)` precision.
- Node.js + Express + TypeScript backend with JWT authentication and Nova API ingestion.
- 7-Stage deterministic reconciliation engine.
- Next.js/React frontend with full 5-screen operational workflow.

### Phase 2: Governed AI Extension (Upcoming)
- **AI Never Makes Decisions**: Only humans can approve, reject, or escalate cases.
- **Grounded Anomaly Explanations**: Generates natural-language summaries of discrepancy root causes strictly using evidence numbers.
- **RAG Policy Assistant**: Answers company reconciliation policy questions with mandatory section citations.
- **Anti-Hallucination Guardrails (G1–G5)**: Prompt injection defense, number checking against raw records, and automatic fallback.

---

# Slide 10: Pitch Summary & Why LedgerSense Wins
## Trust, Exactitude, and Immediate ROI

- **The Problem We Solve**: Transforming fragmented multi-source payment chaos into an airtight, audit-ready financial ledger.
- **Why Our Solution is Superior**:
  - Leverages **real Aczen Nova API data** rather than synthetic guessing.
  - Pure **deterministic mathematics** with zero hallucination risk on money.
  - Enterprise **PostgreSQL RLS security** and **`NUMERIC` precision**.
- **Immediate Business Impact**:
  - Recovers 1–2% of GMV lost in gateway fee overcharges.
  - Reduces monthly financial close time from days to seconds.
  - Delivers **0 false positive approvals** on critical financial reconciliations.
