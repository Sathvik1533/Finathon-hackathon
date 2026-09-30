# FIN-11 Master Parent Guide

## 1. What Is This Document?
This document is the master plain English guide for LedgerSense, our FIN-11 solution. It explains our technology choices, architectural decisions, and the user journey without using any complex jargon, making it easy for non-technical team members to read aloud and understand exactly how our system works end-to-end.

## 2. The Problem We Are Solving
The 4-way reconciliation nightmare happens when one single customer payment exists across four completely disconnected records: the merchant's internal order, the payment gateway's capture, the bank's transaction statement, and the final bulk settlement payout. When these systems don't perfectly align—due to missing fees, timing lags, or missing records—the CFO cannot verify payout accuracy, and the company silently loses money.

## 3. Frontend — What Users See
- What we chose: React with Vite, TypeScript, Tailwind CSS. Being rebuilt from the current prototype as a proper modular app.
- Why React for finance: fast updates without page reload, type safety prevents bugs with money data, easy to add new screens.
- The 7 screens: 
  - Login: Secures access to the system.
  - Dashboard: A top-level view of all payment health metrics.
  - Timeline: Tracks individual payment lifecycles.
  - Nova Explorer: Connects live to Aczen Nova's financial feeds.
  - Exceptions Queue: Lists problem transactions needing human review.
  - Settlement Matcher: Confirms payout bundles.
  - Recon Report: Shows the complete health check of all modules.
- Where Nova API shows up in the frontend: the Nova Explorer screen calls Aczen Nova's 4 endpoints live.
- What happens if Nova API is missing from frontend: the explorer shows only static synthetic data, no real-world fee structures.

## 4. Backend — The Engine Behind the Scenes
- What we chose: Node.js, Express, TypeScript.
- Why for finance: handles integer paise (no floating-point rounding errors), fast enough to process thousands of transactions in under 120ms, TypeScript catches type errors before they touch money data.
- All 12 endpoints:
  - POST /api/auth/login — JWT login (admin/admin123, reviewer/reviewer123)
  - GET /api/health — system health + Redis mode + DB status
  - GET /api/nova/sync — fetch all 4 Aczen Nova data streams
  - POST /api/reconcile/run — trigger 7-stage reconciliation engine
  - GET /api/cases — list all exception cases
  - POST /api/cases/:id/decision — approve/reject/escalate a case
  - GET /api/settlements — list settlement batches
  - GET /api/audit-logs — full immutable audit trail
  - GET /api/report — Module 11 full reconciliation report (JSON)
  - GET /api/report?format=csv — download CSV export
  - GET /api/db/status — database health + record counts
  - GET /api/deployment/status — deployment info
- The 7-stage engine:
  - Stage 1: Transaction-ID Match — exact order_ref equality (Confidence: 1.0)
  - Stage 2: Reference Match — normalized string + UTR regex from bank narrations (Confidence: 0.98)
  - Stage 3: Partial Match — weighted score (amount 50% + date 20% + reference 30%, threshold ≥ 0.90)
  - Stage 4: Fee Calculation — recomputes MDR (2%) + GST (18%); flags FEE_MISMATCH if variance > ₹1
  - Stage 5: Refund/Reversal — links refund IDs to parent captures; flags TIMING_LAG vs MISSING_BANK_CREDIT
  - Stage 6: Settlement Match — groups 1:N gateway transactions into settlement bundles; verifies bank credit
  - Stage 7: Risk Ranking — sorts all exceptions strictly by rupee exposure (highest first)
- Redis explained in plain English: prevents two people from running reconciliation simultaneously (mutex lock); caches the last result so the page loads instantly.
- Where Nova API is used in backend: the /api/nova/sync endpoint calls Aczen Nova's 4 feeds to get the real financial data before running the engine.

## 5. Database — Where Everything Is Saved
- What we chose: Supabase PostgreSQL.
- Why for finance: exact decimal precision (NUMERIC(18,4) — no penny rounding errors), access control per user role, tamper-proof audit log.
- The 3 tables in plain English:
  - finathon_runs: stores each time someone runs a reconciliation (when, how many records, how many problems found)
  - finathon_exceptions: stores each individual discrepancy (what type, how much money is at risk, what decision the reviewer made)
  - finathon_audit_log: stores every action permanently (who approved/rejected what and when — this CANNOT be deleted or changed, ever)
- The immutable rule: once a decision is logged, the database trigger blocks any update or delete. Like a financial ledger.

## 6. The Nova API — Our Unfair Advantage
- What it is: a real financial data API from Aczen.in that provides actual merchant payment records.
- The 4 data streams:
  - /payments: internal merchant orders with customer IDs and expected amounts
  - /gateway-transactions: payment processor records with real 2% MDR fee schedules and 18% GST
  - /bank-transactions: bank clearing statements with real UTR codes and settlement narrations
  - /settlements: lump-sum payout bundles grouping multiple orders
- Why it is an unfair advantage: most hackathon teams use random fake numbers. We use real-world financial structures — actual MDR fee schedules, real T+2 settlement windows, authentic bank narration formats. This makes our discrepancy detection realistic.
- What happens without it: the engine still runs on J.P. Morgan synthetic data, but fee mismatches and UTR patterns won't reflect real Indian payment gateway behavior.

## 7. All 11 FIN-11 Implementation Modules
| # | Module Name | What It Does Simply | Where to See It |
|---|---|---|---|
| M1 | Internal Transaction Records | Tracks internal merchant orders | Nova Explorer & Timeline |
| M2 | Payment Gateway Records | Tracks gateway captures and fees | Nova Explorer & Timeline |
| M3 | Bank Settlement Records | Tracks actual bank deposits | Nova Explorer & Timeline |
| M4 | Transaction-ID Matching | Exact matching on unique IDs | Engine Stage 1 |
| M5 | Reference Matching | Matching using normalized UTR codes | Engine Stage 2 |
| M6 | Partial Matching | Weighted fuzzy matching | Engine Stage 3 |
| M7 | Fee Calculation | Validates charged vs expected fees | Engine Stage 4 & Exceptions |
| M8 | Refund/Reversal Handling | Tracks refunds to original orders | Engine Stage 5 |
| M9 | Settlement Matching | Groups transactions to bulk payouts | Engine Stage 6 & Settlement Matcher |
| M10 | Exception Management | Workflow for manual human review | Exceptions Queue |
| M11 | Reconciliation Report | Generates health and export data | Recon Report Tab |

## 8. End-to-End User Journey
Priya, a finance operations officer at Acme Retail India, is on her first day on the job.
Step 1: Opens the app — sees login screen.
Step 2: Logs in with admin/admin123 — JWT token is created, she lands on Dashboard.
Step 3: Goes to Nova Explorer, clicks Sync Nova Feeds — app calls Aczen Nova's 4 endpoints, tables fill up with real payment data.
Step 4: Goes to Dashboard, clicks Trigger Reconciliation — the 7-stage engine runs, she watches stages complete in real time.
Step 5: Dashboard shows 2 exceptions flagged. She clicks to the Exceptions Queue tab.
Step 6: She clicks on the FEE_MISMATCH exception on ORD-103 — a panel opens showing: expected fee ₹23.60, actual fee charged ₹40.00, difference ₹16.40. She reads the policy note.
Step 7: She clicks Approve and types a short note — the app calls the API, the decision is saved.
Step 8: She clicks Audit Trail — sees her own decision logged with timestamp, username, and note. She cannot delete it.
Step 9: She clicks Recon Report — sees all 11 module coverage badges green, clicks Export CSV — a spreadsheet downloads.

## 9. Future Roadmap
- AI anomaly detection.
- Razorpay AI payment insights.
- AWS ECS/RDS for production scale.
- Real-time webhook ingestion.
