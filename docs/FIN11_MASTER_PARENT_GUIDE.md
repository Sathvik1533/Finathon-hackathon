# LedgerSense — FIN-11 Master Parent Guide

> **Who this is for**: Every teammate, evaluator, or reviewer reading this document.
> **What it is**: One single document that explains everything about LedgerSense — why we built it, what problem it solves, what technology we chose, how we built it, and how to use it. No technical jargon. Plain English only.

> **On the LedgerLens engine**: This project builds on earlier reconciliation research done in the LedgerLens repo (also at `github.com/Sathvik1533/Finathon-hackathon`). A Python/FastAPI reconciliation engine (`/src/domain/engine.py`, 674 lines) was previously built using J.P. Morgan's synthetic payment data methodology (Assefa et al., ICAIF 2020). That work proved the logic works. For FIN-11, we rebuilt the reconciliation engine in **TypeScript/Node.js** (`/api/src/reconEngine.ts`) so it integrates directly with our JWT API, Redis cache, and Supabase database — without Python as a separate service. The Python engine is preserved in the repo as reference. Both implement the same 7-stage matching logic.

---

## Section 1: Why We Chose This Problem Statement

**The problem code is FIN-11: End-to-End Payment Reconciliation & Settlement Engine.**

We chose this problem because it is one of the most painful, high-stakes, and largely unsolved problems in Indian business finance today.

Here is the core issue: every time a customer pays for something online, that one payment creates **four separate records** in four completely different systems:

1. The **merchant's internal system** records the order (example: "ORD-101, ₹1,000")
2. The **payment gateway** (like Razorpay or PayU) records the capture ("captured ₹998.20 after deducting 2% MDR fee + 18% GST")
3. The **bank** records a credit in the merchant's account ("NEFT credit ₹2,460 for 3 orders in one batch")
4. A **settlement report** from the gateway bundles multiple orders into one payout

The problem: **these four records never match perfectly** out of the box. The gateway charges fees. The bank combines multiple orders into one transfer. Refunds get deducted later. Timing is different — a payment captured on Day 1 may only hit the bank on Day 3 (T+2 settlement cycle).

Every month, finance teams in India spend **days manually matching these records in Excel**. A 1% fee error on ₹1 crore of monthly business = ₹1 lakh disappearing silently. Nobody catches it because matching across all four systems manually is exhausting.

**Why we picked this over other problem statements**: Most other problems are software engineering challenges. This one is a real-world financial accuracy problem. Every business that accepts online payments faces this. We can build something that actually gets used.

---

## Section 2: What Solutions We Are Providing

LedgerSense solves the FIN-11 problem by doing **three things no human Excel sheet can do reliably**:

### Solution 1: Automatic 4-Way Record Matching
We pull data from all four sources automatically — internal orders, gateway transactions, bank statements, and settlement bundles. We then run a 7-stage matching engine that finds which records belong together, even when the IDs don't match exactly.

### Solution 2: Intelligent Discrepancy Detection
The engine doesn't just match records — it understands **why they don't match**. It knows the difference between:
- A fee that was overcharged by the gateway (FEE_MISMATCH)
- A bank credit that hasn't arrived yet because it's still in the T+2 window (TIMING_LAG)
- A refund that was deducted from the settlement but not recorded internally (PARTIAL_REFUND_NOT_REFLECTED)
- A payment that was captured twice by the gateway (DUPLICATE_PAYMENT)

### Solution 3: Human Review Workflow
Every discrepancy goes into an **Exceptions Queue**. A finance officer can click on any exception, read exactly what went wrong, and click Approve/Reject/Escalate. Every decision is **permanently recorded** in an immutable audit log that can never be deleted — just like a real financial ledger.

### What We Deliberately Did NOT Build
- No machine learning guessing. Every match is deterministic — the same input always gives the same output.
- No automatic approvals. A human must always review exceptions.
- No AWS or fancy cloud — we use simple, affordable tools that actually work.

---

## Section 3: What Tech Stack We Used

Everything below is written in simple language. Think of it as: "what tool, and why we picked it over alternatives."

### 3.1 Frontend — What Users See and Click

| What | We Used | Why We Chose It |
|---|---|---|
| UI Framework | **React** (with Vite + TypeScript) | Fast updates without page reload. Type safety prevents money calculation bugs. Easy to split into 7 separate pages. |
| Styling | **Tailwind CSS** | Builds clean, consistent designs fast. Every spacing and color follows the same rules. |
| Navigation | **React Router** | Handles the 7-page app (Login, Dashboard, Nova Explorer, etc.) cleanly |
| Font | **Inter** | The standard font for financial dashboards (used by Stripe, Linear, Vercel) |
| Deployment | **Vercel** | One command to deploy. Free tier works. Gives a public URL instantly. |

**Why React over plain HTML for finance?**
React's TypeScript mode means if you try to do math with a text string (like `"₹1000" + 5`), it throws an error before the code even runs. This matters in finance where a silent calculation bug can cause real financial losses.

### 3.1.1 Why We Chose React and NOT Next.js

This is a deliberate decision worth explaining to evaluators and teammates.

**What Next.js adds on top of React:**
Next.js gives you Server-Side Rendering (SSR) — the server builds the HTML page before sending it to the browser. It also gives you file-based routing, API routes built into the frontend, and better SEO because search engines can read server-rendered pages.

**Why those features don't help us in a finance dashboard:**

| Feature | Next.js Gives You | Why We Don't Need It |
|---|---|---|
| Server-Side Rendering | Pages pre-built on server, fast first load | Our pages are behind a login wall — Google never indexes them. SSR is wasted. |
| SEO optimization | Search engines can read the page | A reconciliation dashboard is private. No one should find it on Google. |
| File-based routing | Each file = one route automatically | We have 7 pages. React Router handles this in one file cleanly. |
| Built-in API routes | Frontend can call database directly | We already have a dedicated Node.js API. Mixing API logic into the frontend creates security risks in finance. |
| Edge Functions | Run code at the CDN level | Our reconciliation engine must run close to the database. CDN edge is the wrong place. |

**What React gives us that matters for finance:**
1. **Zero SSR complexity** — Our data is always fetched after login with a JWT token. There is no page that needs to render before the user authenticates. React (client-side) is architecturally correct for this.
2. **Strict separation of concerns** — Frontend (React on Vercel) and backend (Node.js on Railway) are completely separate. In finance, this is important: the backend is the single source of truth. No frontend code can accidentally bypass the backend and write to the database directly.
3. **Faster development for a hackathon** — Next.js adds configuration overhead: `next.config.js`, server actions, `use client` vs `use server` directives. For 11 modules in one prototype, pure React with Vite is faster to ship.
4. **Easier CORS control** — Our backend needs to explicitly allow the frontend origin. With Next.js API routes, this boundary blurs. With separate React + Node.js, every cross-origin request is explicit and auditable.

**One-line answer for the pitch:**
> "We used React because our dashboard is a private authenticated tool, not a public website. Next.js SSR and SEO features are irrelevant here. React gives us type-safe, modular pages that connect cleanly to our dedicated Node.js API without mixing concerns."

**When we would switch to Next.js:**
If we were building a public-facing page (like a customer payment status page that needs SEO), we would use Next.js. For a private finance operations dashboard, React is the right choice.

### 3.2 Backend — The Engine That Does the Work

| What | We Used | Why We Chose It |
|---|---|---|
| Runtime | **Node.js** | Handles thousands of API requests efficiently. Already used by Stripe and Razorpay themselves. |
| Web Framework | **Express** | Lightweight. Perfect for building REST APIs fast. |
| Type Safety | **TypeScript** | Same reason as React — catches calculation errors before they run. |
| Authentication | **JWT (JSON Web Tokens)** | Industry standard for financial APIs. Every request must carry a valid token. No token = no access. |
| Caching & Locking | **Redis** | Prevents two people from running reconciliation at the same time. Also makes repeated page loads instant. |
| Deployment | **Railway / Render** | One-click Node.js deployment. Free tier works. Connects to Supabase DB automatically. |

**Why Node.js over Python for finance?**
We store all money as integer paise (₹1 = 100 paise). Node.js handles integer math perfectly. Python's floating point has subtle rounding issues with decimals like 0.1 + 0.2 = 0.30000000000000004. In a financial system, that kind of invisible rounding error is unacceptable.

### 3.3 Database — Where Everything Is Stored

| What | We Used | Why We Chose It |
|---|---|---|
| Database | **Supabase PostgreSQL** | Free managed database. NUMERIC type stores exact decimals. Row Level Security controls who sees what. |
| Money Precision | **NUMERIC(18,4)** | Stores up to 18 digits with 4 decimal places. Zero rounding errors. |
| Access Control | **Row Level Security (RLS)** | Each merchant can only see their own data. Built into the database itself. |
| Audit | **Append-only trigger** | A database rule that blocks any UPDATE or DELETE on the audit log table. |

**Why PostgreSQL over MongoDB for finance?**
Financial data is relational by nature — an exception record links to a run, which links to a batch, which links to transactions. PostgreSQL handles these relationships natively and enforces data integrity. MongoDB is more flexible but does not enforce the strict schema constraints that financial accuracy requires.

### 3.4 Data Source — The Nova API Advantage

| What | We Used | Why We Chose It |
|---|---|---|
| Financial Data | **Aczen Nova API** | Real-world payment data with actual MDR fees, UTR codes, and settlement structures |
| Stress Testing | **J.P. Morgan Synthetic Methodology** | Research-backed method (Assefa et al., ICAIF 2020) to generate realistic edge-case data |

---

## Section 4: The Nova API — Our Unfair Advantage

The **Aczen Nova Financial API** (from Aczen.in) is the single biggest differentiator in our project.

### What It Is
Nova is a real digital commerce accounting platform. It gives us **4 live financial data streams** that behave exactly like a real Indian payment gateway integration:

| Stream | What It Gives Us |
|---|---|
| `/payments` | Internal merchant orders — order IDs, customer references, amounts in paise, timestamps |
| `/gateway-transactions` | Razorpay-style payment captures — 2% MDR fee, 18% GST, settlement batch IDs, refund references |
| `/bank-transactions` | Bank clearing entries — real UTR codes (e.g. `HDFC/UTR/2024/12345`), narration strings like `CMS/NACH/SETTL/...` |
| `/settlements` | Lump-sum payout bundles — one bank transfer that contains 5 separate order captures |

### Why This Matters
Most hackathon teams make up their own CSV data. Their "fee mismatches" and "UTR codes" are invented strings that don't follow any real format.

Our data from Nova follows real Indian payment gateway behavior:
- MDR is exactly 2% of gross amount
- GST on MDR is exactly 18%
- Bank narrations follow real NEFT/IMPS format
- Settlement batches follow real T+2 timing

This means when our engine flags a fee discrepancy, it is flagging a **real discrepancy** using the same logic a Razorpay compliance team would use.

### What Happens Without Nova
If the `NOVA_API_KEY` environment variable is not set, the system automatically falls back to our J.P. Morgan-methodology synthetic data generator. The reconciliation engine still runs correctly. But the data will be simpler — less realistic fee structures, no real UTR formats.

**For the live demo and pitch: always use Nova API.**

---

## Section 5: What We Acquired Best From J.P. Morgan's Research Paper

A core pillar of our system's credibility is our foundation in peer-reviewed financial research from **J.P. Morgan AI Research**:

> **Reference Paper**: *Assefa, S. A., Dervovic, D., Mahfouz, M., Tilbury, T., et al. "Generating Synthetic Multi-Source Financial Datasets for Reconciliation." ACM International Conference on AI in Finance (ICAIF 2020).*

### Why J.P. Morgan Wrote This Paper
In enterprise banking and global commerce, sharing real customer transaction data to build and test reconciliation tools is strictly prohibited by privacy regulations (PCI-DSS, GDPR, RBI data localization, and bank secrecy laws). Yet, testing reconciliation software on naive, random dummy data fails completely in the real world because simple dummy data does not capture the subtle timing lags, fee truncations, and multi-party handoffs that cause real financial friction.

J.P. Morgan solved this by mathematically formalizing how to generate **multi-source synthetic financial ecosystems** that preserve the exact statistical properties and edge-case failure modes of real banking networks.

### The 4 Best Principles We Acquired From J.P. Morgan's Paper

#### 1. Multi-Source Decoupled Ledger Topology
- **The Concept**: In traditional software, an order is a single database record. In J.P. Morgan's model, a financial transaction is an **event cascade across decoupled systems** that never share a clock or database.
- **How We Used It**: We built our data architecture around 4 independent ledgers: (1) Internal Merchant Order System, (2) Payment Gateway Processor (Razorpay/PayU), (3) Core Banking Clearing (HDFC NEFT/IMPS), and (4) Merchant Payout Settlement Registry. Each system maintains its own identifiers and lifecycle states.

#### 2. Realistic Temporal Latency Distribution (Settlement Lag Modeling)
- **The Concept**: Transactions do not settle instantly or at uniform intervals. In real commerce, UPI settles near real-time (T+0), credit cards capture at T+1, and aggregate net settlements clear at T+2.
- **How We Used It**: Our engine explicitly models settlement windows. When our Stage 5 engine sees a captured transaction without a corresponding bank credit, it does not prematurely scream "fraud" or "missing money"; it measures the timestamp against the T+2 window. If within the window, it flags `TIMING_LAG` (informational). If past the window, it escalates to `MISSING_BANK_CREDIT` (high risk).

#### 3. Parametric Discrepancy & Banking Noise Injection
- **The Concept**: J.P. Morgan demonstrated that real financial reconciliation failures fall into distinct, recurring mathematical categories rather than random chaos.
- **How We Used It**: We adopted J.P. Morgan's exact anomaly taxonomy for our test suites and simulation feeds:
  - **MDR & GST Rounding Drift**: Payment gateways compute percentage fees with different rounding rules than internal merchant ERPs (e.g. integer paise truncation vs round-half-up). Our Stage 4 detects fee drift exceeding ₹1.
  - **Bank Narration Text Distortion**: Real bank core systems truncate order references, prepend clearing house codes (`CMS/NACH/SETTL/`), and remove delimiters. Stage 2 uses regex normalization to recover hidden references from distorted strings.
  - **1:N Lump-Sum Settlement Bundling**: Gateways never deposit individual ₹1,000 customer payments into bank accounts; they aggregate hundreds of orders, subtract aggregate fees, and send one single net payout. Stage 6 implements 1:N batch grouping.
  - **Partial Refund & Reversal Netting**: When a customer returns goods, the refund is netted against the merchant's next settlement batch rather than reversed individually.

#### 4. Ground-Truth Benchmarking
- **The Concept**: Because synthetic generation constructs the true underlying event graph, we have an absolute ground truth.
- **How We Used It**: Unlike black-box machine learning approaches that "guess" matches, our 7-stage deterministic engine is verified against ground-truth labels. We know with 100% mathematical certainty that ORD-101 is a clean match, ORD-102 is bundled into SETTLE-901, ORD-103 is a fee overcharge, and ORD-104 is an in-flight timing lag.

---

## Section 6: How We Built It — Architecture Explained Simply

Think of our system in 4 layers, like floors of a building:

```
┌─────────────────────────────────────────────────────────┐
│  FLOOR 4: USER INTERFACE (what you see in browser)      │
│  React App (7 pages) — hosted on Vercel                 │
│  Login │ Dashboard │ Nova │ Timeline │ Exceptions │ ...  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + JWT Token
                           ▼
┌─────────────────────────────────────────────────────────┐
│  FLOOR 3: API SERVER (the middleman)                    │
│  Node.js + Express + TypeScript — hosted on Railway     │
│  12 endpoints that handle requests from the UI          │
│  Runs the 7-stage reconciliation engine                 │
│  Calls Nova API for financial data                      │
└──────────────┬──────────────────────────────────────────┘
               │                     │
               ▼                     ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  FLOOR 2A: CACHE     │   │  FLOOR 2B: DATA STREAMS      │
│  Redis               │   │  Aczen Nova API (external)   │
│  Mutex lock          │   │  4 endpoints: payments,      │
│  Run summary cache   │   │  gateway-txns, bank-txns,    │
└──────────────────────┘   │  settlements                 │
                           └──────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────┐
│  FLOOR 1: DATABASE (permanent storage)                  │
│  Supabase PostgreSQL — 3 tables:                        │
│  finathon_runs │ finathon_exceptions │ finathon_audit_log│
│  NUMERIC(18,4) precision. RLS. Immutable audit trigger. │
└─────────────────────────────────────────────────────────┘
```

**How a request flows through the system:**
1. User clicks "Trigger Reconciliation" in the browser
2. React sends `POST /api/reconcile/run` to Node.js with JWT token
3. Node.js checks Redis — is another reconciliation already running? If yes, rejects.
4. Node.js calls Nova API to fetch all 4 data streams
5. Node.js runs the 7-stage engine (takes ~120ms)
6. Results saved to Supabase PostgreSQL
7. Node.js sends back the results to React
8. React updates the Dashboard with live KPI cards

---

## Section 7: All 11 FIN-11 Implementation Modules

Every module from the FIN-11 problem statement is implemented. Here is exactly where each one lives:

| # | Module Name | What It Does (Plain English) | Where It Runs | Where to See It in the App |
|---|---|---|---|---|
| M1 | Internal Transaction Records | Fetches the merchant's own order records | Nova API `/payments` → backend | Nova Explorer page, Payments tab |
| M2 | Payment Gateway Records | Fetches gateway captures (Razorpay-style, with MDR fees) | Nova API `/gateway-transactions` → backend | Nova Explorer page, Gateway tab |
| M3 | Bank Settlement Records | Fetches actual bank credits with UTR codes | Nova API `/bank-transactions` → backend | Nova Explorer page, Bank tab |
| M4 | Transaction-ID Matching | Exact match: internal order ID = gateway order reference | Engine Stage 1 (Confidence: 1.0) | Dashboard pipeline progress, Stage 1 |
| M5 | Reference Matching | Fuzzy match: cleans up messy narration strings and finds UTR codes | Engine Stage 2 (Confidence: 0.98) | Dashboard pipeline progress, Stage 2 |
| M6 | Partial Matching | Weighted score: Amount (50%) + Date (20%) + Reference (30%) | Engine Stage 3 (threshold ≥ 0.90) | Dashboard pipeline progress, Stage 3 |
| M7 | Fee Calculation | Recalculates expected MDR (2%) + GST (18%) and flags overcharges | Engine Stage 4 | Exceptions Queue — FEE_MISMATCH cases |
| M8 | Refund/Reversal Handling | Links refund IDs to parent orders, flags TIMING_LAG vs MISSING_BANK_CREDIT | Engine Stage 5 | Exceptions Queue — TIMING_LAG cases |
| M9 | Settlement Matching | Groups multiple gateway captures into one settlement bundle, verifies bank payout | Engine Stage 6 | Settlement Matcher page |
| M10 | Exception Management | Every unflagged case goes into a human review queue (Approve/Reject/Escalate) | All stages → `/api/cases` | Exceptions Queue page — click any row |
| M11 | Reconciliation Report | Generates a full health report with all 11 module coverage statuses + CSV export | `/api/report` | Recon Report page — all 11 green badges |

---

## Section 8: The 7-Stage Reconciliation Engine — Simply Explained

The engine runs in memory on the Node.js server. It takes about 120 milliseconds from start to finish. Here is what each stage does:

**Stage 1 — Transaction-ID Match** *(the easy ones)*
Compares the order reference number on the internal order directly against the gateway's order ID. If they are exactly the same string: matched. Confidence: 100%.

**Stage 2 — Reference Match** *(the messy ones)*
Bank statements often have narration text like `"IMPS/CMS/SETTL/ORD101/HDFC"`. The engine strips out all punctuation and spaces, converts to uppercase, and finds the order reference hidden inside. Confidence: 98%.

**Stage 3 — Partial Match** *(the ambiguous ones)*
For records that still don't match, the engine scores every possible pairing on three factors: How close are the amounts? How close are the dates? How similar are the reference strings? It auto-approves matches scoring above 90%.

**Stage 4 — Fee Calculation** *(checking the gateway's math)*
For every matched pair, the engine recalculates what the MDR fee and GST should have been (2% MDR + 18% GST on gross amount). If the gateway charged more than ₹1 different from the expected amount, it flags a FEE_MISMATCH exception.

**Stage 5 — Refund/Reversal Handling** *(handling returns)*
Finds all refund records and links them to their original payment capture. If a settlement doesn't include the refund deduction, it flags PARTIAL_REFUND_NOT_REFLECTED. If the bank credit hasn't arrived yet because it's within T+2 days, it flags TIMING_LAG (low severity) instead of MISSING_BANK_CREDIT (high severity).

**Stage 6 — Settlement Matching** *(1:N batch verification)*
In real payment processing, one bank transfer pays for many orders at once. The engine groups all gateway captures by their settlement ID, adds up the expected net amounts, and checks whether the bank credit matches within ₹1 tolerance. One bank transfer: many orders.

**Stage 7 — Risk Ranking** *(sorting by urgency)*
After all stages, the engine sorts all exceptions by the rupee amount at risk — highest first. The CFO sees the most expensive problems at the top of the queue.

---

## Section 9: The Backend — All 12 API Endpoints

The backend runs on Node.js at `http://localhost:4000` in development and on Railway in production. Here is every endpoint in plain English:

| # | Endpoint | What It Does |
|---|---|---|
| 1 | `POST /api/auth/login` | You send username + password, get back a JWT token. Use this token for every other request. |
| 2 | `GET /api/health` | Checks that everything is running — Redis, database, last run status. |
| 3 | `GET /api/nova/sync` | Calls all 4 Aczen Nova API endpoints and returns the data combined. |
| 4 | `POST /api/reconcile/run` | Starts the 7-stage reconciliation engine. Returns results when done. |
| 5 | `GET /api/cases` | Returns the list of all exception cases (the ones flagged by the engine). |
| 6 | `POST /api/cases/:id/decision` | You send a decision (Approve/Reject/Escalate) + a written rationale. Gets saved permanently. |
| 7 | `GET /api/settlements` | Returns the settlement batch matches from Stage 6 of the engine. |
| 8 | `GET /api/audit-logs` | Returns every decision ever made — cannot be deleted or changed. |
| 9 | `GET /api/report` | Returns the full Module 11 reconciliation report as JSON. |
| 10 | `GET /api/report?format=csv` | Same report but downloads as a spreadsheet (.csv file). |
| 11 | `GET /api/db/status` | Database health check — shows how many records are in each table. |
| 12 | `GET /api/deployment/status` | Shows what version and deployment info is running. |

---

## Section 10: The Database — 3 Tables Explained Simply

The database is Supabase PostgreSQL. Think of each table like a spreadsheet that never lies.

### Table 1: `finathon_runs`
Stores one row every time someone clicks "Trigger Reconciliation."

| Column | What It Stores |
|---|---|
| run_id | A unique ID for this specific reconciliation run |
| merchant_id | Which merchant this run belongs to |
| status | Is it running, done, or failed? |
| total_records | How many records were processed |
| matched_count | How many were successfully matched |
| discrepancy_count | How many exceptions were found |
| created_at | Exactly when this run started |

### Table 2: `finathon_exceptions`
Stores one row for every problem the engine found.

| Column | What It Stores |
|---|---|
| case_id | Unique ID for this exception |
| run_id | Which reconciliation run found this |
| order_id | Which order has the problem |
| discrepancy_type | FEE_MISMATCH, TIMING_LAG, DUPLICATE_PAYMENT, etc. |
| amount_at_risk_paise | How much money is at risk (stored in paise, never decimals) |
| status | PENDING_REVIEW, APPROVED, REJECTED, or ESCALATED |
| decision_rationale | What the reviewer wrote when they decided |
| decided_at | When the decision was made |

### Table 3: `finathon_audit_log`
Stores one row for every action anyone takes. **This table can NEVER be updated or deleted.** The database enforces this with a trigger.

| Column | What It Stores |
|---|---|
| event_type | What happened (e.g., "CASE_DECISION", "RUN_STARTED") |
| entity_id | Which case or run this is about |
| actor_username | Who did this action |
| actor_role | Were they an admin or reviewer? |
| payload | The full details of what happened (stored as JSON) |
| created_at | Exactly when this happened |

**The Immutable Rule:** Once a row is inserted into `finathon_audit_log`, a PostgreSQL trigger fires and blocks any attempt to UPDATE or DELETE it. Even a database administrator cannot erase an audit record. This is the standard in financial compliance.

---

## Section 11: How to Use What We Built — Detailed Step-by-Step Flow

To understand the system deeply, here is each step of the user journey, broken down into:
- **What the User Does (Action)**
- **What the Feature is About (System Concept)**
- **The Difference / Value Delivered (Why this replaces manual Excel work)**

```
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 1: AUTHENTICATION & SESSION INITIALIZATION                        │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Navigates to /login, types admin / admin123, and clicks "Sign in".  │
│                                                                        │
│ • What the Feature is About:                                           │
│   Cryptographic JWT token generation with role-based access control    │
│   (FINOPS_ADMIN vs REVIEWER) and localStorage persistence.             │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   In legacy Excel setups, spreadsheets are emailed around with zero    │
│   access control or audit trails. Here, every downstream reconciliation│
│   action is cryptographically signed to an authenticated officer.      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 2: MULTI-SOURCE STREAM INGESTION (NOVA EXPLORER)                 │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Opens "Nova Explorer" tab and clicks "⟳ Sync Nova Feeds".           │
│                                                                        │
│ • What the Feature is About:                                           │
│   Multi-stream ingestion from Aczen Nova API + J.P. Morgan synthetic   │
│   engine across 4 decoupled endpoints: /payments, /gateway-txns,       │
│   /bank-txns, and /settlements.                                        │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Instead of manually downloading CSV exports from 3 bank portals and  │
│   Razorpay, the system normalizes 4 heterogeneous data feeds into a    │
│   unified integer-paise memory structure with real MDR fee schedules.  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 3: RUNNING THE 7-STAGE RECONCILIATION PIPELINE                   │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Goes to "Dashboard" and clicks "Trigger Reconciliation".            │
│                                                                        │
│ • What the Feature is About:                                           │
│   Distributed Redis-locked execution of our 7-stage engine (Exact ID,  │
│   UTR regex, Partial weighted match, Fee recomputation, Refund link,   │
│   1:N batch grouping, and Rupee risk ranking) in sub-120ms.            │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Replaces 12 complex nested Excel VLOOKUP and SUMIFS formulas with a  │
│   deterministic sub-second pipeline. Redis mutex guarantees two ops    │
│   clerks cannot trigger concurrent runs that corrupt audit state.      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 4: 4-WAY TIMELINE INSPECTION                                      │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Opens "Payment Timeline" and toggles between ORD-101 ... ORD-104.    │
│                                                                        │
│ • What the Feature is About:                                           │
│   Lifecycle visualization reconstructing the exact multi-party journey │
│   of an order across ERP -> Gateway Capture -> Bank UTR -> Settlement. │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Immediately visualizes why an order is in-flight (ORD-104 has no     │
│   settlement ID due to T+2 timing lag) without combing through raw     │
│   bank statement line items.                                           │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 5: EXCEPTION MANAGEMENT & RUPEE RISK ISOLATION                    │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Opens "Exceptions Queue", clicks on case CASE-2 (FEE_MISMATCH on     │
│   ORD-103), opening the slide-in review drawer.                        │
│                                                                        │
│ • What the Feature is About:                                           │
│   Automated discrepancy categorization and variance isolation. The     │
│   drawer computes: Expected Fee (2% MDR + 18% GST = ₹23.60) vs Actual  │
│   Charged (₹40.00), isolating a ₹16.40 gateway overcharge.             │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Finance teams typically discover fee overcharges months later during │
│   annual audits, losing lakhs silently. LedgerSense flags the exact    │
│   paise leakage within seconds of transaction capture.                 │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 6: HUMAN-IN-THE-LOOP ADJUDICATION & IMMUTABLE AUDIT               │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Selects "ESCALATED", enters dispute rationale ("Dispute with PSP"),  │
│   and clicks "Confirm Decision". Then views the decision in Audit Trail│
│                                                                        │
│ • What the Feature is About:                                           │
│   Enforced human governance backed by an append-only PostgreSQL        │
│   trigger that forbids updates or deletions on finathon_audit_log.     │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Complete statutory compliance. Even database administrators cannot   │
│   delete or rewrite who approved or escalated a financial discrepancy. │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 7: 1:N BATCH SETTLEMENT VERIFICATION                              │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Opens "Settlement Matcher" tab and reviews batch SETTLE-901.         │
│                                                                        │
│ • What the Feature is About:                                           │
│   Aggregates 1:N gateway captures, computes net expected payout after  │
│   fees, and cross-verifies against the bank's lump-sum UTR credit.     │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Solves the fundamental 1:many reconciliation headache where banks    │
│   deposit single lump sums that represent hundreds of customer orders. │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ STEP 8: M11 RECONCILIATION COMPLIANCE REPORT & CSV EXPORT              │
├────────────────────────────────────────────────────────────────────────┤
│ • What the User Does:                                                  │
│   Opens "Recon Report", verifies 11/11 green IMPLEMENTED badges, and   │
│   clicks "↓ Export CSV" to download the formal compliance schedule.   │
│                                                                        │
│ • What the Feature is About:                                           │
│   Automated executive audit generation satisfying FIN-11 specification,│
│   providing mathematical balance proofs (Gateway Net = Bank Credit).   │
│                                                                        │
│ • The Difference / Value Delivered:                                    │
│   Transforms a 3-day month-end accounting crunch into a 1-click export │
│   ready for internal finance controllers and external statutory auditors│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Section 12: End-to-End User Journey (Story Form)

*Priya is a new finance operations officer at Acme Retail India. It is her first day on the job.*

**8:30 AM — First Login**
Priya opens `https://ledgersense.vercel.app` in her browser. She sees a clean white login page. She types `admin` and `admin123` and clicks Sign In. The app sends her credentials to the backend, which creates a JWT token and sends it back. Priya's browser saves this token. She lands on the Dashboard.

**8:32 AM — Syncing Financial Data**
Priya goes to the Nova Explorer page. She sees four empty tabs: Internal Records, Gateway Txns, Bank Statements, Settlements. She clicks "Sync Nova Feeds." Within two seconds, all four tables fill up with data — real payment records from Aczen Nova's API. She can see ORD-101 to ORD-104, the MDR fees, the UTR codes from the bank. She now has the raw material to reconcile.

**8:35 AM — Running Reconciliation**
Priya goes back to the Dashboard and clicks "Trigger Reconciliation." The button shows a spinner. The backend runs all 7 stages in 120 milliseconds. The KPI cards update: 4 orders processed, 2 clean matches, 2 discrepancies found, ₹16.40 total amount at risk.

**8:36 AM — Investigating a Discrepancy**
Priya goes to the Exceptions Queue. She sees two rows. The first one catches her eye: FEE_MISMATCH on ORD-103, ₹16.40 at risk. She clicks on the row. A panel slides in from the right showing:

- Expected MDR fee: ₹19.80 (2% of ₹990)
- Expected GST on fee: ₹3.56 (18% of ₹19.80)
- Total expected: ₹23.36
- Actual fee charged by gateway: ₹39.60
- Difference: **₹16.24** (the gateway overcharged on this order)

**8:38 AM — Recording a Decision**
Priya reads the details. She decides this is a valid gateway overcharge — Acme Retail should dispute it. She clicks "Escalate" and types: "Gateway fee overcharge confirmed. Escalating to finance controller for dispute filing with Razorpay support." She clicks Confirm. The status changes to ESCALATED immediately.

**8:40 AM — Checking the Audit Trail**
Priya goes to the Audit Trail section. She can see her own decision logged: her username, her role, the time (8:38 AM), and the full text of her rationale. She tries to click "edit" but there is no edit button. The audit log is read-only forever. Good.

**8:42 AM — Getting the Report**
Priya goes to the Recon Report page. She clicks Refresh. She sees all 11 FIN-11 module coverage badges — all green, all showing IMPLEMENTED. She clicks Export CSV. A file called `ledgersense-reconciliation-report.csv` downloads. She sends it to her manager.

---

## Section 13: Future Roadmap

The current system handles the complete FIN-11 workflow end-to-end. These are the planned next phases:

**Phase 2A — AI Features (adding intelligence)**
- LLM-based anomaly scoring: instead of just flagging FEE_MISMATCH, the AI explains in natural language what likely caused it and what the historical pattern is
- Razorpay AI integration for payment insights
- Smart exception prioritization using historical resolution patterns

**Phase 2B — AWS Production Deployment (scaling up)**
- AWS ECS for containerized Node.js API (instead of Railway)
- AWS RDS PostgreSQL (instead of Supabase)
- AWS CloudWatch for monitoring and alerting
- Note: we chose Railway/Vercel first because they are faster to deploy and free to start

**Phase 2C — Real-Time Webhook Ingestion**
- Live payment gateway webhooks instead of batch sync
- Sub-second reconciliation trigger on every new payment
- Streaming dashboard updates (Server-Sent Events already partially implemented)

---

*Document last updated: September 30, 2026*
*All 11 FIN-11 modules: IMPLEMENTED ✓*
*Tech stack: React (Vercel) + Node.js/Express/TypeScript (Railway) + Redis + Supabase PostgreSQL + Aczen Nova API*
