# FIN-11 LedgerSense | Pitching & Presentation Guide (Simplified & Real Tech Stack)

This guide provides your entire team with the exact narrative, feature walkthrough, deployment details, and live demo script to present **FIN-11 LedgerSense** clearly, confidently, and in plain English.

---

## 1. The 60-Second Elevator Pitch (Memorize or Read This)

> *"When a customer buys something online, a single payment creates 4 separate financial records across internal databases, payment gateways, bank statements, and settlement rails. Because these happen at different times, use different IDs, and are bundled into bulk deposits minus hidden processing fees and GST, companies lose millions in uncollected cash and manual reconciliation overhead.*
> 
> *We built **LedgerSense**: an end-to-end payment reconciliation and settlement engine that solves **FIN-11**. It reconstructs the entire transaction lifecycle across all 4 sources using a deterministic 7-stage engine with zero floating-point penny drift.*
> 
> *Our unfair advantage is twofold: we ingest real digital commerce accounting data from the **Aczen Nova Financial API**, and we stress-test edge cases using **J.P. Morgan AI Research's 7-step synthetic data methodology**. Our working prototype is live on **Vercel** for the frontend, **Railway and Render** for the Node.js API and Redis, and **Supabase** for PostgreSQL with Row-Level Security."*

---

## 2. Our Real Deployment Stack (What to Say When Evaluators Ask)

When judges ask how and where the system is deployed, here is your crisp, accurate answer:

- **Frontend**: Single-page modern financial cockpit (`web/index.html`) deployed globally on **Vercel** (`vercel.json`) with zero cold starts.
- **Backend API**: High-performance **Node.js + Express + TypeScript** server deployed on **Railway / Render** (`railway.json`, `render.yaml`, `Procfile`).
- **Distributed Cache & Mutex**: Managed **Redis** on Railway / Upstash (with graceful in-memory fallback) to prevent concurrent colliding runs.
- **Database**: **Supabase Managed PostgreSQL** using arbitrary-precision `NUMERIC(18,4)` columns, Row-Level Security (RLS) tenant isolation, and an immutable database trigger (`trg_audit_log_immutable`) that prevents tampering with audit logs.
- **Data Ingestion**: Dual-engine integration with the **Aczen Nova Financial API** (`https://www.aczen.in/nova-api/v1`) and the **J.P. Morgan synthetic financial dataset generator**.

---

## 3. How We Use the Aczen Nova API (Our Core Unfair Advantage)

Emphasize this heavily. Most other teams use naive random numbers or artificial spreadsheets. LedgerSense connects to real digital commerce accounting streams:

1. **`GET /payments` (Internal Orders)**: Ingests authentic customer orders (`ORD-101`, `ORD-102`), line items, and expected gross amounts. Used in **Stage 1 (ID Matching)** to establish the master baseline.
2. **`GET /gateway-transactions` (Gateway Captures)**: Ingests payment processor authorization timestamps, gross amounts, processor 2% MDR fees, and 18% GST splits. Used in **Stage 4 (Fee & Tax Recalculation)** to catch gateway overcharges.
3. **`GET /bank-transactions` (Bank Clearing Statements)**: Ingests nodal bank credit statements and cryptic narrations with embedded UTR numbers (`CMS/NACH/SETTL/SETTLE-901/HDFC0001`). Used in **Stage 2 (Regex Parsing)**.
4. **`GET /settlements` (Batch Settlements)**: Ingests bulk processor payout bundles. Used in **Stage 6 (One-to-Many Grouping)** to distinguish legitimate in-flight `TIMING_LAG` (T+2 cutoff) from true `MISSING_BANK_CREDIT`.

---

## 4. Why We Use the J.P. Morgan Synthetic Data Approach

Explain this clearly when asked about edge-case testing:

- In financial systems, relying only on a single happy-path data feed can hide dangerous edge cases.
- We implemented the published **7-step synthetic financial dataset generation process from J.P. Morgan AI Research** (Assefa et al., ICAIF 2020).
- This allows us to rigorously simulate high-stress conditions: network timeouts, payment gateway retries, slight fee variances, and delayed bank settlement lines.
- **Strict Zero Label Leakage**: The reconciliation engine has zero visibility into the generator's internal state—it must discover and flag anomalies strictly from mathematical evidence.

---

## 5. Live Demo Walkthrough (90 Seconds Step-by-Step)

### Accessing the Prototype
- **Local URL**: `http://localhost:4000` (or `http://localhost:4000/prototype`)
- **Direct HTML File**: `web/index.html`
- **Login Credentials**:
  - Admin Role: Username: `admin` | Password: `admin123`
  - Reviewer Role: Username: `reviewer` | Password: `reviewer123`

### Step-by-Step Script:
1. **Show Overview Dashboard (15 seconds)**:
   - Point out the KPI cards: Total Processed, Successfully Settled, Net Fee Leakage, and Total Amount at Risk.
   - Say: *"Every rupee is calculated with exact `NUMERIC(18,4)` precision down to integer paise. There is zero floating-point rounding drift."*
2. **Show Nova Ingestion & Trigger Engine (20 seconds)**:
   - Switch to the **"Nova 4-Source"** tab.
   - Click **"Sync Nova Feeds"**, then click **"Run 7-Stage Recon"**.
   - Say: *"Watch the live terminal log. We just pulled all 4 accounting streams from the Aczen Nova API. In under 120 milliseconds, our engine runs all 7 deterministic stages: ID match, regex UTR parsing, weighted partial match, MDR fee verification, refund netting, bulk settlement grouping, and risk ranking."*
3. **Show Multi-Stream Timeline (25 seconds)**:
   - Switch to the **"Multi-Stream Timeline"** tab and select order **'ORD-103'**.
   - Say: *"This is our standout visual feature. You can trace ORD-103 across the entire 4-source lifecycle. The customer paid ₹1,500. Under our contractual schedule of 2% MDR plus 18% GST, the fee should be ₹35.40. But the gateway charged ₹47.20. LedgerSense instantly isolates the ₹10.00 fee leakage before money settles."*
4. **Resolve Exceptions in Queue (20 seconds)**:
   - Switch to the **"Exceptions"** tab.
   - Show how cases are ranked by `Amount at Risk` so finance analysts tackle the biggest financial exposures first.
   - Click **"Review Case"** on CASE-1 ➔ Enter a reason (e.g., *"Verified fee tolerance schedule clause 3.2"*) ➔ Click **"Approve"**.
5. **Show Tamper-Proof Audit Trail (10 seconds)**:
   - Switch to the **"Audit Trail"** tab.
   - Point out the newly recorded decision row.
   - Say: *"The approval is permanently recorded with user attribution and timestamp. In Supabase PostgreSQL, this audit table is protected by `trg_audit_log_immutable`, rejecting any update, delete, or truncate attempt."*

---

## 6. Forwardable WhatsApp / Slack Cheat Sheet for Teammates

*(Copy and send to your team group)*

```text
🚀 FIN-11 LEDGERSENSE — QUICK EVALUATION CHEAT SHEET

1. WHAT IT IS:
An end-to-end payment reconciliation & settlement engine solving FIN-11 across 4 sources: Internal Orders, Gateway Captures, Bank Statements, and Bulk Settlements.

2. OUR UNFAIR ADVANTAGE:
- Aczen Nova Financial API: Real-world digital commerce accounting in INR with Indian GST and 2% MDR fees (/payments, /gateway-transactions, /bank-transactions, /settlements).
- J.P. Morgan Synthetic Methodology: Rigorous 7-step stress-testing for edge cases (network jitter, timing lags, fee variances) with zero label leakage.

3. TECH STACK:
- Frontend: Single-page modern cockpit (web/index.html) deployed on Vercel.
- Backend: Node.js + Express + TypeScript on Railway / Render.
- Cache & Mutex: Redis on Railway / Upstash (with graceful in-memory fallback).
- Database: Supabase PostgreSQL (NUMERIC(18,4) precision, Row-Level Security, append-only immutable audit trigger).

4. KEY TALKING POINTS:
- Zero Floating-Point Drift: Integer paise in engine, NUMERIC(18,4) in DB.
- Deterministic 7-Stage Engine: Runs in under 120ms with 0 false approvals.
- Prioritized by Risk: Exceptions sorted strictly by "Amount at Risk".
- Immutable Audit Trail: Database trigger violently rejects any deletion.

5. DEMO URL:
- Local: http://localhost:4000
- Login: admin / admin123 (or reviewer / reviewer123)
```
