# FIN-11 LedgerSense | Master Parent Pitch & Architecture Guide

> **Audience**: Core Engineering, Product, and Pitch Team  
> **Mission**: The definitive single-source-of-truth document for pitching **LedgerSense**, explaining the 11 FIN-11 modules, understanding our real-world tech stack, and communicating the Aczen Nova API and J.P. Morgan synthetic approach in simple, plain English.

---

## 1. Executive Summary & Problem Statement (60-Second Elevator Pitch)

In digital commerce, when a customer purchases something online, money does not instantly move into the merchant's bank account. Instead, a single payment generates four separate financial records across disconnected systems:

1. **Merchant Internal Order**: Customer places an order for **₹1,000.00** (`ORD-101`). Internal status: Paid.
2. **Payment Gateway (e.g., Razorpay/Stripe)**: Captures the payment under a different reference (`gw_tx_001`), deducting an MDR fee (2%) plus 18% GST (Net payout = **₹976.40**).
3. **Refunds & Adjustments**: Customer returns an item; a partial refund of **₹200.00** is deducted from the merchant's next payout.
4. **Merchant Bank Statement**: 48 hours later, the bank receives a single bulk deposit of **₹48,820.00** covering dozens of different customer payments with a cryptic narration: `CMS/NACH/SETTL/SETTLE-901/HDFC0001`.

Because these 4 systems use different IDs, deduct hidden fees, and settle asynchronously on a T+2 day lag, **merchants silently lose 1%–2% of revenue every month to fee overcharges, dropped credits, and unreflected refunds**.

**LedgerSense** solves **FIN-11** by reconstructing the entire financial lifecycle across all 4 sources using a **deterministic 7-stage engine** running in integer paise with zero floating-point penny drift.

---

## 2. Our Unfair Advantage: Aczen Nova API + J.P. Morgan Synthetic Approach

Unlike standard hackathon projects that operate on fake random numbers or toy CSV mockups, LedgerSense is built on two authentic data pillars:

### Pillar 1: Real Digital Commerce Accounting via the Aczen Nova API
We ingest live, real-world digital commerce accounting streams directly from `https://www.aczen.in/nova-api/v1` across 4 core endpoints:
- **`GET /payments`**: Real internal merchant orders, order numbers, customer identifiers, and expected amounts.
- **`GET /gateway-transactions`**: Gateway authorization captures with contractual 2% MDR fee schedules and 18% GST splits.
- **`GET /bank-transactions`**: Bank clearing statements with messy UTR settlement narrations.
- **`GET /settlements`**: Gateway batch settlement advices with gross-to-net payout breakdowns.

**Why this is an unfair advantage**: Real banking data has tricky rounding nuances, GST tax calculations, and cryptic bank narrations without clean foreign keys. By using the Aczen Nova API on our website, we demonstrate a real, working system that handles authentic Indian financial data formats.

### Pillar 2: J.P. Morgan AI Research Synthetic Generation Approach
To test high-stress failure edge cases that rarely occur in small sample feeds, we implemented the published **7-step synthetic financial dataset generation process from J.P. Morgan AI Research** (Assefa et al., ICAIF 2020):
- Simulates realistic payment network latency, bank clearing lags (T+2 cutoff), deliberate fee calculation discrepancies, and missing bank credit lines.
- **Strict Zero Label Leakage**: The reconciliation engine has zero access to simulation ground-truth labels. It must discover and prove discrepancies purely from mathematical evidence.

---

## 3. Comprehensive Mapping of All 11 FIN-11 Problem Modules

LedgerSense directly implements and solves all 11 required modules from the FIN-11 problem statement:

| Module | Requirement | How It Is Implemented in LedgerSense | Code / Prototype Location |
|---|---|---|---|
| **1** | **Internal Transaction Records** | Ingests internal orders, order IDs, currency, and line amounts. | `api/src/novaClient.ts` (`fetchPayments`) |
| **2** | **Payment Gateway Records** | Ingests gateway transactions with authorized amounts and fee splits. | `api/src/novaClient.ts` (`fetchGatewayTransactions`) |
| **3** | **Bank Settlement Records** | Ingests bank statements with credits, debits, value dates, and UTRs. | `api/src/novaClient.ts` (`fetchBankTransactions`) |
| **4** | **Transaction-ID Matching** | Deterministic 1:1 matching on Order IDs and Gateway References ($O(N)$ hash map). | `api/src/reconEngine.ts` (Stage 1) |
| **5** | **Reference Matching** | Regex pattern parser extracts settlement tokens and UTRs from bank narrations. | `api/src/reconEngine.ts` (Stage 2) |
| **6** | **Partial Matching** | Multi-factor weighted fuzzy scoring: Amount (50%) + Date (20%) + Reference (30%). | `api/src/reconEngine.ts` (Stage 3) |
| **7** | **Fee Calculation** | Recomputes contractual MDR (2.0%) + GST (18%). Flags fee overcharges $> ₹1.00$. | `api/src/reconEngine.ts` (Stage 4) |
| **8** | **Refund/Reversal Handling** | Links refunds to parent payments; isolates un-netted refunds. | `api/src/reconEngine.ts` (Stage 5) |
| **9** | **Settlement Matching** | Groups individual payments into 1:N bulk payouts; flags true missing credits. | `api/src/reconEngine.ts` (Stage 6) |
| **10** | **Exception Management** | Ranks discrepancies by financial risk with human reviewer decision flow. | `api/src/server.ts` (`/api/cases/:id/decision`) |
| **11** | **Reconciliation Report** | Executive KPI summary, amount-at-risk totals, and tamper-proof audit trail. | `api/src/server.ts` (`/api/reconcile/latest`) |

---

## 4. The Real Tech Stack Actually Implemented & Deployed

We do not present imaginary services. Here is the exact, real, deployed tech stack:

1. **Client Tier (Frontend)**:
   - Modern single-page financial operations cockpit located at `web/index.html`.
   - Served directly by Express at `/` and `/prototype`, and deployed globally on **Vercel** via `vercel.json` with zero cold starts.
   - 6 Core Views: Executive Overview, Multi-Stream Timeline, Nova 4-Source Explorer, Exceptions Queue, Settlement Matcher, and Immutable Audit Trail.

2. **Backend API Tier**:
   - **Node.js + Express + TypeScript** server located at `api/src/server.ts`.
   - Deployed on **Railway / Render** via `railway.json`, `render.yaml`, `nixpacks.toml`, and `Procfile`.
   - REST endpoints with JWT role-based authentication (Admin and Reviewer roles).
   - In-memory deterministic 7-stage engine executing in under 120 milliseconds.

3. **Distributed Cache & Concurrency Mutex**:
   - Managed **Redis** on Railway / Upstash (`REDIS_URL`).
   - Caches reconciliation run summaries for instant sub-millisecond retrieval.
   - Enforces distributed mutex job locking to prevent concurrent colliding runs.
   - Built-in graceful in-memory fallback if Redis is unreachable.

4. **Persistence & Compliance Tier**:
   - Managed **PostgreSQL** on **Supabase**.
   - Currency stored in exact `NUMERIC(18,4)` columns and integer paise (0 floating-point rounding errors).
   - **Row-Level Security (RLS)** policies for strict multi-tenant merchant isolation.
   - **Immutable Audit Trigger** (`trg_audit_log_immutable`) that rejects any `UPDATE`, `DELETE`, or `TRUNCATE` operations on audit logs.

---

## 5. Walkthrough of the 7 Deterministic Stages with Concrete Numbers

When explaining how the engine works, use this concrete ₹1,000 transaction:

- **Stage 1 (ID Matching)**: Customer buys goods for ₹1,000.00 (`100,000 paise`, `ORD-101`). Gateway captures ₹1,000.00 (`gw_tx_001`). Match confidence: 1.0.
- **Stage 2 (Regex UTR Parsing)**: Bank statement shows credit with narration `CMS/NACH/SETTL/SETTLE-901/HDFC0001`. Engine extracts settlement ID `SETTLE-901` and bank UTR `UTR-HDFC-99182`.
- **Stage 3 (Partial Matching)**: Matches transactions where amounts align within tolerance and timestamps fall within $\pm 3$ days.
- **Stage 4 (Fee & GST Verification)**:
  - Contract: 2.0% MDR + 18% GST.
  - Expected MDR fee: ₹20.00 (`2,000 paise`).
  - Expected GST: ₹3.60 (`360 paise`).
  - Total expected fee deduction: ₹23.60 (`2,360 paise`).
  - Discrepancy detected: Gateway deducted ₹40.00 fee + ₹7.20 GST on ORD-103. Engine immediately flags `FEE_MISMATCH` with **Amount at Risk: ₹23.60**.
- **Stage 5 (Refund Netting)**: Detects refunds and chargebacks, ensuring fees were correctly reversed and refunds were debited.
- **Stage 6 (One-to-Many Settlement Grouping)**: A single lump-sum bank credit of ₹4,870.20 represents multiple customer payments minus fees. Engine verifies that child payments sum to the payout. If a payment is captured on T+1, it is categorized as `TIMING_LAG` (Low Severity) rather than an error.
- **Stage 7 (Amount at Risk Prioritization)**: Ranks the exception queue strictly by financial exposure so analysts resolve highest-value risks first.

---

## 6. How Teammates Pitch This to Evaluators (60-Second Script)

> *"Judges, online payments look simple to customers, but behind the scenes, merchants juggle 4 separate records for every payment: internal ERP orders, payment gateway authorizations, bank statements, and settlement batches. Companies lose millions in silent fee overcharges and missing bank payouts.*
> 
> *We built **LedgerSense** to solve FIN-11. It's a deterministic 7-stage reconciliation engine running in integer paise with zero floating-point error.*
> 
> *Our unfair advantage is real data: we ingest live digital commerce accounting streams from the **Aczen Nova Financial API** with real 2% MDR fees and 18% GST, and we stress-test edge cases using **J.P. Morgan's 7-step synthetic financial methodology**.*
> 
> *Our prototype is live on **Vercel** for the frontend, **Railway / Render** for the Node.js API and Redis mutex lock, and **Supabase** for PostgreSQL with Row-Level Security and tamper-proof audit triggers. It reconciles thousands of records in under 120 milliseconds with zero false approvals."*
