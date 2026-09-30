Note at top: paste into Gamma App (https://gamma.app) → New from text → choose Light Theme (Oasis/Polar/Minimal Clean)

Slide 1 — Title:
- Product: LedgerSense
- Tagline: End-to-End Payment Reconciliation & Settlement Engine
- Problem Code: FIN-11
- One-liner: "A deterministic 7-stage engine that reconstructs every payment's lifecycle across 4 financial systems — in under 120ms, with zero penny rounding errors."
- Tech stack: React + Node.js + Supabase + Redis + Aczen Nova API
- Deployment: Vercel (frontend) + Railway (backend)

Slide 2 — The Problem:
- The 4-way reconciliation nightmare: Internal ERP <-> Payment Gateway (Razorpay) <-> Bank (HDFC) <-> Settlement Bundle
- ORD-101 example: customer pays ₹1,000 → 4 records: internal ERP, payment gateway (Razorpay), bank (HDFC), settlement bundle
- The CFO pain point: how do you verify every rupee was credited, that the gateway didn't overcharge MDR, that refunds were deducted correctly?
- Quote: "A 1% fee overcharge on ₹1 crore of monthly GMV = ₹1 lakh vanishing silently every month."

Slide 3 — Our Unfair Advantage:
- Aczen Nova Financial API: real production-grade data with actual MDR fee schedules, T+2 settlement windows, UTR narration formats
- J.P. Morgan Synthetic Methodology (Assefa et al., ICAIF 2020): stress-tests edge cases — fee variance, timing lags, missing bank credits, refund mismatches
- What most teams do: random CSVs with fake numbers
- What we do: 4 live financial data streams with real-world financial behavior

Slide 4 — All 11 FIN-11 Modules Covered:
| # | FIN-11 Module | How LedgerSense Handles It | Where to See It in the App |
|---|---|---|---|
| M1 | Internal Transaction Records | Fetches & stores raw ERP orders | Nova Explorer & Timeline |
| M2 | Payment Gateway Records | Matches Razorpay/PayU captures | Nova Explorer & Timeline |
| M3 | Bank Settlement Records | Ingests bank statements & UTRs | Nova Explorer & Timeline |
| M4 | Transaction-ID Matching | Exact match engine | Stage 1 Execution |
| M5 | Reference Matching | Normalized UTR text parsing | Stage 2 Execution |
| M6 | Partial Matching | Weighted scoring algorithm | Stage 3 Execution |
| M7 | Fee Calculation | Dynamic GST/MDR recalculation | Exceptions Queue |
| M8 | Refund/Reversal Handling | Parent-child transaction mapping | Stage 5 Execution |
| M9 | Settlement Matching | 1:N batch ID aggregation | Settlement Matcher |
| M10 | Exception Management | Review/Approve/Reject workflow | Exceptions Queue |
| M11 | Reconciliation Report | Complete health & CSV export | Recon Report Tab |

Slide 5 — The 7-Stage Deterministic Engine:
```
Stage 1: Transaction-ID Match   → Exact order_ref match (Confidence: 1.0)
Stage 2: Reference Match        → Normalized string + UTR regex from bank narrations  
Stage 3: Partial Match          → Weighted score: Amount(50%) + Date(20%) + Ref(30%) ≥ 0.90
Stage 4: Fee Calculation        → MDR(2%) + GST(18%) recomputed — flags if variance > ₹1
Stage 5: Refund Handling        → Links refunds to parent; TIMING_LAG vs MISSING_BANK_CREDIT
Stage 6: Settlement Match       → 1:N bundle grouping + bank credit verification
Stage 7: Risk Ranking           → Sorts exceptions by rupee exposure (highest first)
```
Key facts: sub-120ms execution, integer paise, zero false approvals

Slide 6 — Architecture:
| Layer | Technology | Deployed On | What It Does |
|---|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind | Vercel | 7 modular pages, JWT auth, live API calls |
| Backend | Node.js + Express + TypeScript | Railway/Render | 12 REST endpoints, 7-stage engine, JWT verification |
| Cache | Redis | Railway/Upstash | Mutex lock (prevents concurrent runs) + run summary cache |
| Database | Supabase PostgreSQL | Supabase | NUMERIC(18,4) precision, RLS, immutable audit trigger |
| Data Streams | Aczen Nova API + JP Morgan Synthetic | External/Internal | 4 real financial data feeds + edge-case simulation |

Note: AI features and AWS deployment are planned Phase 2 additions.

Slide 7 — System Flowchart (ASCII):
```
[User Browser]
      │ Login → JWT Token
      ▼
[React App — Vercel]
│ Login │ Dashboard │ Nova Explorer │ Exceptions │ Settlement │ Report │
      │ HTTPS + Bearer JWT
      ▼
[Node.js API — Railway/Render]
      ├─► Aczen Nova API (4 streams: /payments /gateway-txns /bank-txns /settlements)
      ├─► 7-Stage Reconciliation Engine (internal, sub-120ms)
      ├─► Redis (mutex lock + summary cache)
      └─► Supabase PostgreSQL
            ├─ finathon_runs
            ├─ finathon_exceptions  
            └─ finathon_audit_log (immutable)
      
      └─► GET /api/report → Module 11: Reconciliation Report (JSON + CSV)
```

Slide 8 — Live Demo Script:
Step 1: Open app → login with admin/admin123
Step 2: Go to Nova Explorer → click Sync Nova Feeds → watch 4 data tables populate with real financial records
Step 3: Go to Dashboard → click Trigger Reconciliation → watch 7 stages complete
Step 4: See exception count — go to Exceptions Queue — open FEE_MISMATCH on ORD-103 — show the ₹16.40 fee overcharge — approve it
Step 5: Go to Recon Report → show all 11 module coverage green → click Export CSV → show downloaded spreadsheet

Slide 9 — Future Roadmap:
- Phase 2A: AI features — LLM anomaly scoring on exceptions, Razorpay AI for payment insights, smart exception classification
- Phase 2B: AWS deployment — ECS containerized API, RDS PostgreSQL, CloudWatch monitoring
- Phase 2C: Real-time webhooks — live payment gateway event ingestion, sub-second reconciliation triggers
- What's complete NOW: full end-to-end workflow — all 11 FIN-11 modules working dynamically
