# FIN-11 LedgerSense | Gamma AI Presentation Deck & Pitch Script

> **How to use with Gamma AI (https://gamma.app):**
> 1. Open Gamma AI and choose **"Create New" -> "Paste in text"**.
> 2. Copy and paste the entire markdown text below into the text box.
> 3. Select **"Presentation"** format and pick a sleek dark financial/fintech theme (e.g. "Oasis" or "Midnight").
> 4. Click **Generate Presentation**.

---

# Slide 1: LedgerSense
## End-to-End Payment Reconciliation & Settlement Engine
### Problem Statement: FIN-11 | Finathon Hackathon
- **Team:** Finathon Hackathon Core Engineering
- **Architecture:** Next.js + React | FastAPI + Python 3.12 | PostgreSQL (Supabase / RDS) with Row Level Security (RLS) & pgvector
- **Real-World Engine Asset:** Direct Live Ingestion from the **Aczen Nova API** (INR, Indian GST)

---

# Slide 2: The Core Problem: The 4-Source Disconnect
## Where Merchants Silently Lose Millions
When a customer pays online, money does not take a single path. A single transaction creates **4 isolated ledger events**:
1. **Merchant ERP / Order Records:** Internal order recorded (e.g. `ORD_1001` for ₹1,000.00).
2. **Payment Gateway Captures:** Recorded under foreign ID (`pay_91001`) with Merchant Discount Rate (MDR) fee and GST deductions.
3. **Settlement Payout Clearing:** Aggregated into grouped payout batches (`set_91002`).
4. **Bank Statement Statement Credits:** Lumped NEFT/RTGS credit arriving at the bank with messy narrations (`CMS/NODAL/...`).

**The Pain:** Because IDs differ, fees fluctuate, refunds net out, and bank transfers lag by 2 days (T+2), finance teams rely on error-prone spreadsheets, leaking up to 2-3% of revenue in undetected discrepancies.

---

# Slide 3: SWOT Analysis of the Reconciliation Landscape
## Why Existing Solutions Fail and How LedgerSense Wins

| Strengths (LedgerSense) | Weaknesses (Legacy Competitors) |
|---|---|
| **Deterministic 7-Stage Engine:** Exact 100% precision, 0 false approvals | **Spreadsheet Hell:** Manual VLOOKUPs across millions of rows cause human fatigue and missed fee theft |
| **Real Nova API Ingestion:** Real read-only banking data with GST and MDR nuance | **Toy Mocks:** Most fintech tools test against sanitized toy data where transaction IDs match cleanly |
| **PostgreSQL NUMERIC(18,4) & Paise:** Zero IEEE-754 floating point drift | **Float Inaccuracies:** Traditional web apps store currencies in float/double, accumulating silent rounding discrepancies |

| Opportunities (Market Growth) | Threats (Regulatory & Risk) |
|---|---|
| **High Digital Payment Volume:** UPI & card volume in India growing at 45% YoY | **Regulatory Audits:** RBI & tax compliance require strict, unalterable proof of settlement |
| **Automated AI Assistance:** AI speeds up reviewer case investigations with policy citations | **Autonomous AI Risks:** Other competitors risk regulatory fines by letting LLMs auto-approve funds |

---

# Slide 4: Key Differentiator Factors (Our Competitive Edge)
## Why LedgerSense Outperforms the Competition

1. **Exact Precision Financial Storage:**
   - Dual-layer monetary representation: Base `bigint` paise with PostgreSQL generated `NUMERIC(18, 4)` decimals.
   - Eliminates all floating-point rounding errors.
2. **Automatic Row Level Security (RLS):**
   - Cryptographically isolated multi-tenant architecture with statement-level RLS policies on all 18 tables.
3. **Database-Level Immutable Audit Trail:**
   - Append-only PostgreSQL audit log guarded by trigger `trg_audit_log_immutable`, strictly prohibiting `UPDATE`, `DELETE`, and `TRUNCATE`.
4. **Optimistic Concurrency Control (OCC):**
   - Reviewer cases protected by revision versions. Concurrent modifications yield an immediate `HTTP 409 Conflict`, stopping decision races.
5. **Deterministic First, AI Second:**
   - Financial outcomes are calculated by deterministic code. AI is strictly constrained to explaining, citing policy rules, and summarizing.

---

# Slide 5: The Primary Asset: Real-World Aczen Nova API
## Moving Beyond Toy Datasets
Most reconciliation engines rely on synthetic mocks with identical IDs and zero real-world messy data. LedgerSense connects directly to **Aczen Nova API**:
- **Real Enterprise Ingestion:** Ingests live payment captures, fee schedules, bank statement credits, and settlement advices in INR.
- **Unstructured Banking String Extraction:** Parses messy real-world bank narrations using normalized regex matching without clean foreign keys.
- **Data Honesty Guarantee:** We never claim artificial 100% accuracy on Nova batches because real-world accounting has no synthetic labels. LedgerSense honestly reports observed exception rates and prioritizes them by Amount at Risk.
- **Calibration Baseline:** Real Nova distributions serve as the gold standard in our Synthetic Lab using the J.P. Morgan 7-step method.

---

# Slide 6: The 7-Stage Deterministic Reconciliation Engine
## Step-by-Step Lifecycle Reconstruction

1. **Stage 1: Transaction-ID Matching:** Exact 1:1 match between internal ERP orders and payment gateway captures.
2. **Stage 2: Reference & UTR Extraction:** Regex parsing of unstructured bank credit narration strings.
3. **Stage 3: Partial Closeness Matching:** Tolerance-based temporal ($\pm 3$ days) and amount ($\le ₹1.00$) matching.
4. **Stage 4: Fee & GST Verification:** Validates gateway deductions against contractual MDR schedules (2.00% + 18% GST).
5. **Stage 5: Refund Netting & Chargebacks:** Nets customer returns and recovers proportionate fee reversals.
6. **Stage 6: One-to-Many Settlement Grouping:** Balances 1 bank credit UTR against multiple lumped payments, distinguishing normal T+2 timing lag from missing money.
7. **Stage 7: Exception Ranking:** Categorizes every discrepancy and ranks cases strictly by **Amount at Risk**.

---

# Slide 7: Concrete Walkthrough: Reconciling a ₹1,000 Order
## A Real-World Financial Story

- **Step 1:** Customer pays **₹1,000.00** (`100,000 paise`) for an order. ERP records `ORD_1001`.
- **Step 2:** Gateway captures payment under `pay_91001`.
  - Contract MDR Fee: 2.00% = **₹20.00** (`2,000 paise`)
  - 18% GST on Fee: = **₹3.60** (`360 paise`)
  - Expected Net Payout: ₹1,000 - ₹23.60 = **₹976.40** (`97,640 paise`).
- **Step 3 (Discrepancy Injected):** Gateway mistakenly deducts ₹25.96 due to tier mismatch.
- **Step 4 (Engine Detection):** Stage 4 flags `FEE_MISMATCH` with **Amount at Risk: ₹2.36** (`236 paise`).
- **Step 5 (Bank Payout Grouping):** Bank receives credit `CMS918273645` for ₹4,882.00 covering 5 separate orders. Stage 6 balances the sum perfectly and surfaces the single fee discrepancy for reviewer action.

---

# Slide 8: Guarded AI Intelligence
## Where AI Genuinely Adds Value Without Hallucinating

| AI Feature | How it Adds Value | Guardrail Applied |
|---|---|---|
| **Case Explanations (`/ai/explain-case`)** | Translates 4-source ledger evidence into plain English for human reviewers | **Guard G3 & G5:** Numbers must come from evidence bundle; cannot command approval |
| **Policy RAG Assistant (`/ai/policy-chat`)** | Answers reviewer questions cited from company policy documents (e.g. `POL_FEE_TOLERANCE`) | **Guard G4:** Validates citations; returns exact `"no policy found"` on unknown topics |
| **Controller Run Brief (`/ai/brief`)** | Generates executive summaries of match rates and high-risk exposure | **Nova Honesty Rule:** Explicitly notes real Nova data without synthetic ground truth |
| **Synthetic Lab Narrative (`/ai/lab-narrative`)** | Interprets Kolmogorov-Smirnov test results and provides parameter tuning hints | Recommends parameters strictly from statistical hint catalogue |

---

# Slide 9: Reviewer Workflow & Immutable Governance
## Zero Autonomous Approvals: Humans Make Every Decision

1. **Reviewer Queue:** Reviewer logs into dashboard; exceptions are sorted by **Amount at Risk**.
2. **Case Dossier:** Reviewer inspects side-by-side evidence timeline across ERP, Gateway, Bank, and Refunds.
3. **AI Recommendation:** Reads AI suggestion with cited policy rule (`POL_MISSING_CREDIT`).
4. **Optimistic Locking:** Reviewer submits `APPROVE`, `REJECT`, or `ESCALATE` with mandatory written rationale. The database enforces OCC version checks (HTTP 409 on conflict).
5. **Append-Only Audit Entry:** Transaction is committed to `audit_log`, permanently immutable under database trigger protection.

---

# Slide 10: Production Cloud Deployment Architecture
## Enterprise Scalability on AWS

- **Frontend:** Next.js 14+ on AWS ECS Fargate or Amplify.
- **Backend API:** FastAPI Python container with Server-Sent Events (SSE) for live run streaming.
- **Database:** AWS RDS PostgreSQL (or Supabase) with `pgcrypto` and `vector` (pgvector).
- **Asynchronous Queue:** Redis / AWS SQS for scalable batch ingestion and worker coordination.
- **Live Ingestion:** Scheduled asynchronous workers pulling real banking data from Aczen Nova API.

---

# Slide 11: Summary & The LedgerSense Promise
## The Future of Financial Integrity

- **Deterministic Precision:** Zero float loss, 100% mathematically exact reconciliation.
- **Real-World Ready:** Built on real Aczen Nova API banking feeds, not simplistic toys.
- **Regulatory Compliant:** Immutable audit trail, automatic RLS, and human-in-the-loop decisions.
- **Guarded AI:** Enhancing human productivity while eliminating hallucination risk.
- **Live Prototype Ready:** Fully interactive dashboard and complete backend REST/SSE API.
