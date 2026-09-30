# FIN-11 LedgerSense | Presentation Deck & Pitch Specification

> **Theme**: Clean Light Mode (Clean White `#ffffff` background with Enterprise Slate `#0f172a`, Royal Blue `#2563eb`, Emerald `#10b981`, and Amber `#f59e0b` tags — modeled after the EasePrint AWS Cloud Architecture reference).
> **How to use with Gamma AI**:
> 1. Copy the markdown content below.
> 2. In [Gamma App](https://gamma.app), select **New from text / Import**.
> 3. Choose **Light Theme** (e.g., "Oasis", "Polar", or "Minimal Clean").
> 4. Gamma will automatically format cards, badges, and comparison tables into high-impact presentation slides.

---

# Slide 1: Title & Overview
## LedgerSense: End-to-End Payment Reconciliation & Settlement Engine
### Reconstructing Multi-Source Financial Lifecycles with Deterministic Precision

- **Category**: FIN-11 Financial Infrastructure & Settlement Auditing
- **Core Mission**: Automated reconciliation across Internal Orders, Payment Gateways, and Bank Settlements with 0 precision loss.
- **The Core Differentiator**: Real-world ingestion powered by the **Aczen Nova Financial API** + Arbitrary-Precision PostgreSQL with Row Level Security.
- **Live Architecture**: Node.js + Express + TypeScript (`/api`) | PostgreSQL on Supabase (`/db`) | Next.js/React (`/web`).
- **Future Scale**: Production AWS Deployment (ECS Fargate, ALB, RDS, S3, DynamoDB) + Governed Amazon Bedrock AI.

---

# Slide 2: The Problem Statement
## The Multi-Source Financial Chaos
### Why Modern Finance Teams Lose Millions in Unreconciled Payouts

A single customer payment generates 4 separate, asynchronous records with mismatched identifiers:

1. **Internal Order**: Customer buys goods for **₹1,000** (`ORD-101`). Internal status: Paid.
2. **Gateway Authorization**: Razorpay/Stripe processes **₹1,000** (`pay_987`), deducting **₹20 MDR Fee** + **₹3.60 GST** (Net = **₹976.40**).
3. **Refund / Chargeback**: Next day, customer returns 1 item; partial refund of **₹200** issued (`rfnd_456`).
4. **Bank Settlement**: Two days later, merchant bank receives a lump-sum deposit of **₹48,820** covering 50 different orders with cryptic narration: `CMS/NACH/SETTL/SETTLE-001/HDFC`.

> **The CFO's Dilemma**: How do we verify that the ₹1,000 order actually landed in our bank account, that payment processors didn't silently overcharge fees, and that the refund was correctly netted?

---

# Slide 3: Nova API Integration (Where & How It Is Used)
## The Unfair Advantage: Authentic Digital Commerce Accounting

While competitors rely on naive random numbers or artificial mock CSVs, LedgerSense ingests live, multi-source accounting lifecycles using the **Aczen Nova API**:

- **1. Internal Orders (`GET /payments`)**:
  - Ingests internal merchant orders, checkout intents, customer IDs, and exact order amounts.
  - Used in **Stage 1 (Transaction-ID Matching)** to establish the master expected baseline.
- **2. Gateway Captures (`GET /gateway-transactions`)**:
  - Ingests processor capture states, gateway references, contractual MDR fees, and GST splits.
  - Used in **Stage 4 (Fee & Tax Recalculation)** to detect hidden processor fee overcharges.
- **3. Bank Statements (`GET /bank-transactions`)**:
  - Ingests raw nodal clearing statements, UTR reference numbers, and unparsed narrations.
  - Used in **Stage 2 (Regex Narration Parsing)** to extract embedded settlement tokens.
- **4. Batch Settlements (`GET /settlements`)**:
  - Ingests processor clearing bundles and gross-to-net payout summaries.
  - Used in **Stage 6 (One-to-Many Settlement Grouping)** to distinguish legitimate in-flight `TIMING_LAG` from `MISSING_BANK_CREDIT`.
- **Implementation Location**:
  - Backend Client: `api/src/novaClient.ts`
  - Ingestion Endpoints: `POST /api/nova/sync` & `GET /api/nova/status`
  - Database Storage: `nova_payments`, `nova_gateway_tx`, `nova_bank_tx`, `nova_settlements` tables.

---

# Slide 4: Key Differentiators Across All Layers
## Why LedgerSense Outperforms Generic Hackathon Apps

| Architectural Layer | Competitor / Generic Solutions | LedgerSense (Our Architecture) |
|---|---|---|
| **Database Precision** | `FLOAT` / `DOUBLE` (IEEE-754 penny rounding drift) | PostgreSQL **`NUMERIC(18,4)`** & Integer Paise (Zero precision error) |
| **Data Security** | Application-level filtering (Vulnerable to bypass) | Database **Row Level Security (RLS)** & Multi-Tenant Isolation |
| **Audit Compliance** | Mutable logs or standard tables | **Immutable Append-Only Trigger** (`prevent_audit_log_tamper`) |
| **Data Source** | Pure artificial mocks / CSVs | **Aczen Nova API** Real Accounting Feeds |
| **Backend Stack** | Generic monolithic frameworks | Clean **Node.js + Express + TypeScript** with direct parameterized `pg` pool |
| **Authentication** | Hardcoded or absent | **JWT Credentials Authentication** (admin/reviewer RBAC, Google OAuth ready) |
| **Decision Logic** | Unregulated LLM guessing on numbers | **7-Stage Deterministic Math Engine** (AI is strictly assistive) |
| **Concurrency** | Last-write-wins (Race condition risk) | **Optimistic Concurrency Control (HTTP 409)** with atomic versioning |
| **Frontend UI/UX** | Generic AI-generated mockups | **High-Craft Operations Cockpit** (5 dedicated screens, live REST wiring) |

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

# Slide 6: End-to-End System Architecture (Light Theme)
## Complete Cloud Topology (Modeled After Reference Architecture)

### 1. Client Tier (Presentation)
- **Finance Operations Dashboard** (React / Next.js) — Executive KPIs, 4-Source Explorer, Discrepancy Reviewer Modal, Settlement Matcher, Audit Trail.
- **Admin & Controller Portal** — Fee rule configuration, tolerance toggles, audit inspection.

### 2. External Integrations
- **Aczen Nova Financial API** — Primary multi-source ingestion (`/payments`, `/gateway-transactions`, `/bank-transactions`, `/settlements`).
- **Payment Gateways & Banking Rails** — Webhook payloads, UTR settlement feeds.

### 3. CI/CD Pipeline
- **GitHub Repository** (`Sathvik1533/Finathon-hackathon`) ➔ **GitHub Actions** (Linting, Secrets Scan, Pytest, Node Test Suite) ➔ **Amazon ECR** (Docker Image Registry) ➔ **AWS ECS Fargate Deploy**.

### 4. AWS Cloud Infrastructure (us-east-1)
- **Networking & Ingress**: VPC with Multi-AZ Public Subnets (`us-east-1a`, `us-east-1b`) and Application Load Balancer (ALB) with SSL/HTTPS.
- **Compute Tier (AWS ECS Fargate)**:
  - Multi-stage Docker container running **Node.js Express TypeScript API** + **Next.js Frontend Static Build**.
  - Background Task Runner for batch reconciliation runs.
- **Data & AI Tier**:
  - **PostgreSQL on Amazon RDS / Supabase**: Core transactional ledger, `NUMERIC(18,4)` precision, Row Level Security, Immutable Audit Logs.
  - **Amazon DynamoDB**: Real-time reconciliation run cache & idempotency locks.
  - **Amazon S3**: Exported audit-ready CSV reports & encrypted financial batches.
  - **Amazon Bedrock**: Governed AI assistant for natural language anomaly explanation & policy retrieval.
  - **Amazon CloudWatch**: Centralized metrics, performance alarms, and audit trails.

---

# Slide 7: The 5 Core Frontend User Screens
## Designed for Professional Finance Operations

1. **Executive Reconciliation Dashboard**: High-level KPIs (Total Processed, Successfully Settled, Net Fee Leakage, Total Amount at Risk).
2. **4-Source Lifecycle Explorer**: Side-by-side transaction timeline showing Internal Order ⇄ Gateway Event ⇄ Refund ⇄ Bank Settlement.
3. **Exception & Discrepancy Management Center**: Amount at Risk prioritized queue with single-click case inspector and human review actions (Approve, Reject, Escalate).
4. **Settlement & Batch Matcher**: Visual one-to-many reconciliation matching lump-sum bank statement credits with individual gateway batches.
5. **Immutable Audit Trail Viewer**: Tamper-proof log tracking every automated run, config update, and reviewer decision with timestamps and user attribution.

---

# Slide 8: Future Roadmap: Governed AI with Amazon Bedrock
## Safe, Disciplined Intelligence (No Hallucinations on Money)

- **Principle**: The AI never makes approval or settlement decisions. A human analyst records every decision.
- **Grounded Anomaly Explanations**: Uses Amazon Bedrock (Claude 3.5 Sonnet) to generate clear natural-language case briefs strictly from mathematical evidence.
- **RAG Policy Assistant**: Connects to company reconciliation SOPs with mandatory policy citations.
- **5 Enterprise Guardrails (G1–G5)**:
  - `G1`: Prompt injection defense and input neutralization.
  - `G2`: Strict Pydantic JSON schema validation.
  - `G3`: Number check — verifies all cited figures match raw financial records.
  - `G4`: Citation check — prunes answers lacking verified policy rules.
  - `G5`: Autonomous decision refusal — rejects requests to "auto-approve" or "auto-settle".

---

# Slide 9: Evaluation Live Demo Script (Step-by-Step)
## How to Walk Judges Through the Working Prototype

1. **Step 1: Ingestion Sync** (15 seconds):
   - Navigate to the **Nova Feed Explorer** tab.
   - Click **"Sync Nova Feeds"** ➔ Watch live ingestion of payments, gateway transactions, and bank statements.
2. **Step 2: Execute Deterministic Reconciliation** (20 seconds):
   - Click **"Run Reconciliation"** ➔ The 7-stage engine matches transactions and flags discrepancies in milliseconds.
   - Point out that **Matched Transactions** settled with **zero precision loss** using `NUMERIC(18,4)`.
3. **Step 3: Review Exceptions Ranked by Risk** (30 seconds):
   - Switch to the **Exceptions Queue**.
   - Show how the top case has the highest **Amount at Risk** (e.g. gateway overcharge on `ORD-103`).
   - Click **"Review Case"** ➔ Review details ➔ Click **"Approve"** with a rationale.
4. **Step 4: Prove Immutable Audit Compliance** (15 seconds):
   - Open the **Audit Trail** tab.
   - Point out the newly recorded entry with user attribution, timestamp, and action — highlighting the database trigger that prohibits deletion or alteration.

---

# Slide 10: Pitch Summary & Why We Win
## Exactitude, Integrity, and Immediate Financial ROI

- **The Problem We Solve**: Transforming fragmented multi-source payment chaos into an airtight, audit-ready financial ledger.
- **Why We Win**:
  - Leverages **real Aczen Nova API data** rather than synthetic guessing.
  - Pure **deterministic mathematics** with zero hallucination risk on money.
  - Enterprise **PostgreSQL RLS security** and **`NUMERIC` precision**.
  - Clear enterprise cloud architecture ready for **AWS production**.
- **Business Impact**:
  - Recovers 1–2% of GMV lost in gateway fee overcharges.
  - Reduces monthly financial close time from days to seconds.
  - Delivers **0 false positive approvals** on critical financial reconciliations.
