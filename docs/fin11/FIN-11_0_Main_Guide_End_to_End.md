# FIN-11 LedgerSense | Main Guide, End to End (v3)

**This is the parent guide.** Every other guide says "if this document and the parent disagree, the parent wins, then raise a contract PR". That parent is this file.
**Repo (collaborative):** https://github.com/Sathvik1533/Finathon-hackathon.git
**Stack (fixed):** Next.js + React (web) | Node.js + Express + TypeScript (api) | FastAPI (ai) | PostgreSQL (RDS, pgvector) | AWS (EC2 + docker-compose, RDS, S3, SSM).
**Build tool:** Antigravity IDE, one agent per branch, one small task per prompt, each with an acceptance check.
**Golden rules:** Deterministic first, AI second. Money is integer paise. Nothing hardcoded. A human makes every decision.

---

## 0. How to read this guide set

| # | File | Read it when |
|---|---|---|
| 0 | **This Main Guide** | First. Whole product, Nova usage, flow, security, phases |
| 1 | Data Guide (Nova + synthetic) | You touch data sources, mapping, metrics, the generator |
| 2 | Database Guide | You touch `/db` or any SQL |
| 3 | Backend Guide | You touch `/api` |
| 4 | AI Service Guide | You touch `/ai` |
| 5 | Frontend Guide | You touch `/web` |
| 6 | Deployment Guide (AWS) | You touch `/infra` or `/.github` |
| 7 | MVP Completion Checklist | Before every gate, every demo |
| 8 | User Journey and Screens | You want to see the product exactly as a user does, screen by screen |
| 9 | Antigravity Playbook | You are about to open Antigravity and start a branch |
| 10 | Git and Branching Guide | Before creating any branch, PR or merge |
| 11 | Razorpay Integration Guide (Phase 2) | The end-to-end flow is green and you add Razorpay |

**Precedence:** this Main Guide, then the track guide for your folder, then the Data Guide for anything about data sources. Conflicts are settled by a contract PR (section 9), never by silently editing code.

---

## 1. What LedgerSense is

Finance teams reconcile money across **four sources**: the merchant's **internal records**, the **payment gateway** records, the **bank settlement** credits, and **refunds/reversals**. One bank credit usually covers many payments net of fee, GST and refunds, so matching is one-to-many, and mistakes hide in fees, timing and duplicates.

LedgerSense does this:
1. Loads the four sources from **Nova** (real read-only accounting data), from a **seeded simulator**, from an **upload**, and later from **Razorpay** (Phase 2).
2. Runs a **deterministic 7-stage engine** (no AI) that matches, checks fees, nets refunds, matches settlements one-to-many, and classifies every leftover into an **exception** ranked by **Amount at Risk**.
3. Lets a **reviewer** work the queue: open a case, see a four-source timeline, read a deterministic explanation plus an optional **AI explanation with policy citation**, and record a decision (approve, reject, escalate) with a rationale. Every decision is written to an **append-only audit log**.
4. Lets an **admin** change rules (fee %, tolerances, stage toggles, categories), and see the numbers move on the next run.
5. Proves quality: on **simulated** data a hidden ground truth gives precision, recall and **0 false approvals**; on **Nova** data it reports only observed exception rates; a **Synthetic Lab** compares Nova metrics with calibrated synthetic metrics using the J.P. Morgan 7-step method.

### 1.1 The three honesty rules (never break)
1. **No accuracy claims on Nova, upload or Razorpay batches.** They have no ground truth. Say "exception rate observed".
2. **Data honesty statement (verbatim in README, S17 and the demo):**
   > The synthetic data engine follows the seven-step process described by J.P. Morgan AI Research for generating synthetic financial datasets (Assefa et al., ICAIF 2020). No J.P. Morgan datasets are used; those are available only by request and none is a reconciliation dataset. Real-world reference figures come from the Nova API (Aczen), read-only, INR, Indian GST.
3. **The AI never decides.** It explains, cites and drafts. Only a human decision writes an audit entry.

---

## 2. Team, tracks and where code lives

| Track | Folder | Branch prefix | Guide | Merges to `develop` |
|---|---|---|---|---|
| Frontend | `/web` | `feat/fe/*` | 5 | Frontend owner |
| Backend | `/api` | `feat/be/*` | 3 | Backend owner |
| Database | `/db`, `/infra/db` | `feat/db/*` | 2 | **Database owner only** (migrations) |
| AI | `/ai` | `feat/ai/*` | 4 | AI owner |
| Infra / AWS | `/infra`, `/.github` | `feat/infra/*` | 6 | Infra owner |
| Contracts | `/contracts` | `feat/contracts/*` | this guide, section 9 | Lead |
| Docs | `/docs`, root `README.md` | `feat/docs/*` | this guide set | Lead |

Rule of thumb: **one folder, one owner, one agent**. Two people never edit the same folder on different branches at the same time. Details: Doc 10.

---

## 3. Architecture and trust boundaries

```
Browser (Next.js)
   | HTTPS, cookie session, same origin  /api/*
   v
Caddy proxy (EC2)  --- /ai/* returns 404 (never public)
   v
Express API (Node) --- only service that talks to: PostgreSQL, S3, Nova, Razorpay, FastAPI
   |--> PostgreSQL (RDS, role api_app)
   |--> Nova API      GET only, key in NOVA_API_KEY            (api container only)
   |--> Razorpay API  Basic Auth, key in RAZORPAY_KEY_SECRET   (api container only, Phase 2)
   |--> FastAPI (ai)  private network, header X-Internal-Key
                        |--> PostgreSQL (role ai_service, table policy_chunks only)
                        |--> Groq LLM
```

| Boundary | Rule |
|---|---|
| Browser | Never calls Nova, Razorpay, FastAPI or the database. Never sees a secret. Only calls `/api/*` |
| API | Owns all business logic and all external data calls. `userId`/`merchantId` only from the JWT |
| AI | Holds only `GROQ_API_KEY` and `INTERNAL_KEY`. No ledger tables. No Nova or Razorpay |
| Database | Three roles: `migrator` (release only), `api_app`, `ai_service`. `audit_log` is append-only |
| Engine | Pure functions. Never calls AI. Never reads `ground_truth`. Never reads Nova link fields such as `payments.bank_transaction_id` |

---

## 4. Nova API: complete usage, start to finish

Nova (Aczen) is the **real-world data source**. This section is the one-page version; the Data Guide (Doc 1) has the full rule table and the import pipeline.

### 4.1 What Nova is and is not
- Read-only REST, INR, Indian GST. Base URL **with www**: `https://www.aczen.in/nova-api/v1` (the apex domain redirects and drops the `Authorization` header, which shows up as a 401).
- Key format `nova_sk_` + 43 characters, sent as `Authorization: Bearer <key>`. One active key per account; each key sees its own team slice (`team_slot`, `dataset_slice` from `/me`).
- Only `GET`. 120 requests/minute/key (our limiter: 100). Lists are paged (`limit` max 200, `offset`).
- Nova has **no ground truth** and **no as-of date**. We derive `as_of` from the data.

### 4.2 Who does what with Nova

| Step | Who | Action | Result |
|---|---|---|---|
| 1 | Backend + Lead, hour 0 | Sign in at `https://www.aczen.in/nova-api` (allowlisted email), create key `fin11-dev`, store in `api/.env` as `NOVA_API_KEY` | Key exists only on the api service |
| 2 | Backend | `curl $NOVA_BASE_URL/health`, then `/me`, then `/gateway-transactions?limit=2` | Proves connectivity, prints `team_slot` and `dataset_slice` |
| 3 | Backend (branch `feat/be/nova-client`, prompt N1) | `NovaClient` + `nova-discover.ts` writes `docs/nova-discovery.md` (field names only) | Real field names replace every `verify` cell |
| 4 | Backend | Freeze `api/config/nova-mapping.json` at hour 2 | Mapping frozen (changes need a contract PR) |
| 5 | Backend (branch `feat/be/nova`, B12) | Import pipeline: preflight, sequential paged pull, raw save to `nova_records`, Zod validate, pure transform, one DB transaction, derive `as_of`, done event | A `nova` batch with `ground_truth = null` |
| 6 | Admin (UI, screen S16) | Presses **Import from Nova**, watches live SSE progress | Import row `done`, counts per resource |
| 7 | Reviewer/Admin | **Run reconciliation** on the Nova batch | Exceptions ranked by Amount at Risk; benchmark shows "not available" |
| 8 | Admin (Synthetic Lab, S17) | Compute the **real** profile from the Nova batch, calibrate, simulate, compute the synthetic profile, compare | PASS/WARN/FAIL per metric |
| 9 | Infra | Store prod key under `/fin11/prod/api/NOVA_API_KEY`; curl `/health` from the EC2 box | Works in production |
| 10 | Infra, after demo | Revoke `fin11-prod` key | Clean shutdown |

### 4.3 Nova resources we use, and where they land

| Nova resource | Our table | Notes |
|---|---|---|
| `/payments` joined to `/invoices` | `internal_txns` | `tds_deducted` kept in `evidence` (a reason for short receipts) |
| `/gateway-transactions` (`txn_type=capture`) | `gateway_txns` | fee and tax observed, not recomputed |
| `/gateway-transactions` (refund, chargeback, chargeback_reversal) + `/credit-notes` | `refunds` (with `kind`) | `parent_txn_id` links to the capture |
| `/bank-transactions` (`credit.gt=0`) | `bank_credits` | narration is untrusted text |
| `/settlements` | `source_settlements` | expected credit per settlement, stage 6 cross-check |
| `/bank-accounts`, `/payment-channels` | lineage / calibration | `settlement_days`, `fee_model` |

### 4.4 Nova do-nots
Never call Nova from the browser or the AI service. Never log or return the key (only the first 16 characters as `keyPrefix`). Never invent filters. Never read `payments.bank_transaction_id` in the engine. Never use `new Date()` as `as_of` for Nova data. Never present Nova results as "accuracy".

---

## 5. The complete end-to-end flow (what happens at every layer)

Each row is one user action and everything it touches. The screen-by-screen version is Doc 8.

| # | User action | Screen | API | Database | Other |
|---|---|---|---|---|---|
| 1 | Opens the site, enters email and password | S2 `/login` | `POST /api/auth/login` | reads `users`; bcrypt compare | JWT in httpOnly cookie; 6th fast attempt gives 429 |
| 2 | Lands on the shell | S1 `/app` | `GET /api/auth/me` | `users`, `merchants` | Sidebar shaped by role |
| 3 | Admin opens Data sources, checks connection | S16 | `GET /api/nova/status` | none | API calls Nova `/health` and `/me`; shows key prefix only |
| 4 | Admin presses Import from Nova | S16 | `POST /api/nova/import` then SSE `.../stream` | `nova_imports`, `nova_records`, then `batches`, `internal_txns`, `gateway_txns`, `refunds`, `bank_credits`, `source_settlements` | About 250 Nova GETs for 10k rows in five big resources, paced at 100/min |
| 5 | (Alternative) Reviewer simulates a batch with chosen parameters | S3 `/app/batches` | `GET /api/config`, `POST /api/batches/simulate` | `batches`, four source tables with hidden `ground_truth` | Seeded generator; optional calibration `profileId` |
| 6 | (Alternative) Uploads CSV/JSON | S3 | `POST /api/uploads/presign`, PUT to S3, `POST /api/batches/upload` | `batches` (`upload`) | All-or-nothing validation with row-level errors |
| 7 | Starts reconciliation | S16/S3 → S4 | `POST /api/runs {batchId}` | `runs` (config snapshot, seed, `as_of`) | One active run per merchant |
| 8 | Watches the run | S4 `/app/runs/:id` | `GET /api/runs/:id/stream` (SSE) | `runs.progress` | Heartbeat 15 s, reconnect with `Last-Event-ID` |
| 9 | Engine finishes | (server) | (job) | `matches`, `match_items`, `run_outcomes`, `exceptions` (all `OPEN`) in one transaction | Stages 1 to 7 from the config snapshot |
| 10 | Reads the dashboard | S5 `/app` | `GET /api/metrics/:runId` | views `v_run_exception_summary`, `v_run_benchmark` | Benchmark null when `labelled_rows = 0` |
| 11 | Works the queue | S8 `/app/queue` | `GET /api/exceptions` | `exceptions` ordered by `amount_at_risk_paise DESC` | |
| 12 | Opens a case | S9 `/app/cases/:id` | `GET /api/cases/:id` | `exceptions` + linked rows | Nova ids and source badge on timeline items |
| 13 | Asks for AI explanation / policy chat | S9 | `POST /api/ai/explain`, `/ai/policy-chat` | `exceptions.ai_suggestion` (bumps `version`) | API builds a scoped bundle, calls FastAPI; falls back to deterministic text on any failure |
| 14 | Records a decision | S9 | `POST /api/cases/:id/decision {action, rationale, expectedVersion}` | `exceptions` (optimistic lock) + `audit_log` in one transaction | Second tab gets 409 |
| 15 | Reads the audit trail | S11 | `GET /api/audit` | `audit_log` | Read-only |
| 16 | Exports a report | S12 | `GET /api/reports/:runId?format=csv` | read | Formula cells neutralised |
| 17 | Admin changes fee % | S13 `/admin/config` | `PUT /api/config` | new `config` row (version N+1) | Applies from the next run |
| 18 | Admin presses Refresh | S5 | `POST /api/batches/simulate` (or re-import), `POST /api/runs` | new batch and run | KPIs and Amount at Risk move |
| 19 | Admin runs the Synthetic Lab | S17 `/app/lab` | `POST /api/lab/profiles`, `/calibrate`, `/compare` | `metric_profiles`, `lab_comparisons` | Optional `POST /api/ai/lab-narrative` |
| 20 | Admin edits policies | S14 | `PUT /api/policies`, `POST /api/ai/reindex` | `policies` (new version), `policy_chunks` (pgvector) | Next policy chat cites the new version |
| 21 | **Phase 2:** Admin imports from Razorpay | S16 (Razorpay tab) | `GET /api/razorpay/status`, `POST /api/razorpay/import` + SSE | `razorpay_imports`, `razorpay_records`, then a `razorpay` batch | Doc 11 |
| 22 | **Phase 2:** Razorpay sends a webhook | (server) | `POST /api/webhooks/razorpay` | `razorpay_webhook_events` | HMAC verified on the raw body |

---

## 6. Roles and permissions

| Capability | Reviewer | Admin |
|---|---|---|
| Log in, dashboard, queue, cases, decisions, audit, reports, transactions, settlements, refunds | Yes | Yes |
| Simulate / upload batches, start runs | Yes | Yes |
| View Nova/Razorpay status and import history, view lab profiles and comparisons | Yes (read) | Yes |
| Start a Nova or Razorpay import, check connection | No (button disabled with tooltip) | Yes |
| Compute lab profiles, calibrate, compare | No | Yes |
| Edit config, policies, prompt templates, reindex, AI eval, users | No | Yes |

Errors: logged out **401**, wrong role **403**, other tenant's id **404**, version conflict **409**, validation **422**, rate limit **429**, Nova/Razorpay upstream failure **502** (`nova_unavailable` / `razorpay_unavailable`).

---

## 7. Build plan, phases and gates

### 7.1 Phase 1: get the end-to-end flow working (hours 0 to 35)
Follows the milestone table in the Checklist (Doc 7, section 11): hour 2 freeze, 10 foundation, 19 engine, 25 screens, 31 AI, 34 code freeze, 35 release.

**Gate G-E2E (the trigger for Phase 2).** Phase 2 may start only when, on `develop`, all of these are true and pasted as evidence in the tracking issue:
1. Demo steps 1 to 10 in Doc 7 section 10 pass (login, Nova import, run with live SSE, queue, case with AI, decision, audit, 409, config change moves numbers, Synthetic Lab).
2. CI is green on `develop`; `grep -r nova_sk_` is empty.
3. A release tag `v0.9-e2e` exists on `develop`.

### 7.2 Phase 2: Razorpay (after G-E2E)
Full spec in Doc 11. Summary:
- **What "Razorpay auth API" means here:** all Razorpay APIs use HTTP Basic Auth with a Key ID and Key Secret, sent as `Authorization: Basic base64(key_id:key_secret)` (the exact casing `Basic` matters). Our API uses it server-side to read payments, orders, refunds and settlements, and verifies webhook signatures with a separate webhook secret. Our own user login stays as it is (JWT cookie).
- Start in **Razorpay test mode** (`rzp_test_...`). Live keys are refused unless explicitly enabled.
- New batch source `razorpay`; new migrations 0010 and 0011; new backend module B14; the B11 webhook is upgraded from optional to real; S16 gets a Razorpay tab; new branches listed in Doc 10.
- Not a login provider. If you meant "Sign in with Razorpay" (OAuth for partners), stop and raise a contract PR: it is a different design.

### 7.3 Tiers
| Tier | Contents |
|---|---|
| **Must (never cut)** | Deterministic engine, audit trail, human decision, simulated benchmark, auth + tenant isolation, SSE, config-driven rules, Refresh, Nova import, JPM-method generator with comparison, AI explanation with citation or `no policy found`, security checklist, AWS deployment |
| **Must after G-E2E** | Razorpay test-mode import (B14), verified webhook (B11), S16 Razorpay tab |
| Should | Lab narrative, run brief, RAG mini-eval, transactions/settlements/refunds screens, reports export, calibration selector |
| Stretch | Nova weak-label agreement, narration suggestions (F7), MCP server, admin users screen, per-merchant Razorpay credentials |

---

## 8. Security: the 20-point checklist (plus provider items)

Referenced by the Deployment Guide as "parent guide section 8". Tick with evidence in Doc 7, section 8.

1. Secrets only in the right service env: Groq in FastAPI; Nova, Razorpay and JWT in Express; nothing in `NEXT_PUBLIC_*`.
2. `.env*` ignored by git; only `.env.example` committed with dummy values.
3. JWT secret, DB URL, internal key read from the environment.
4. JWT in an httpOnly, Secure, SameSite=Lax cookie; roles reviewer and admin.
5. Role middleware on every route (hiding a button is not security).
6. `userId` and `merchantId` always from the token, never body or query.
7. `merchant_id` on every row and query; RAG retrieval scoped.
8. RDS private; least-privilege roles `migrator`, `api_app`, `ai_service`.
9. Private S3 bucket; presigned URLs only.
10. Admin-only: config, policies, prompts, reindex, eval, Nova import, Razorpay import, lab writes.
11. Production mode: no debug, uvicorn without reload, FastAPI docs off.
12. Generic errors with a request ID; no stack traces.
13. Zod and Pydantic validation; LLM output validated; Nova and Razorpay responses validated with Zod.
14. Reviewer notes sanitised; CSV formula injection guarded.
15. Uploads: only `.csv`/`.json`, size cap, parsed in memory.
16. Parameterized SQL only.
17. Rate limits on login and AI endpoints; Nova limiter below 120/min; Razorpay limiter per config.
18. gitleaks on full history, with custom Nova and Razorpay rules; any leaked key is rotated.
19. helmet, CSP in Next.js, CORS allowlist.
20. Tested logged out (401), wrong role (403), other tenant (404), FastAPI without key (401).
21. `grep -r nova_sk_` over repo, images and logs returns nothing.
22. Nova and Razorpay are called only from the api container; no such traffic from web or ai.
23. Razorpay: key secret only in `RAZORPAY_KEY_SECRET` on the api service; a `rzp_live_` key is refused unless `RAZORPAY_ALLOW_LIVE=true`; webhook signature verified on the raw body before any parsing; webhook secret differs from the API key secret.

---

## 9. Contracts, schema deltas and change control

- **`/contracts/openapi.yaml`** is the single source of truth for endpoints. Frontend generates its client from it; backend tests validate against it. Frozen at hour 2. After the freeze, any change is a **contract PR** (branch `feat/contracts/<topic>`), approved by the Backend owner, the Frontend owner and the Lead.
- **Schema deltas** (Doc 2, migrations 0001 to 0011) are approved by the Database owner. Merged migrations are never edited; add a new one.
- **Nova mapping** (`api/config/nova-mapping.json`) is frozen at hour 2. **Razorpay mapping** (`api/config/razorpay-mapping.json`) is frozen at the start of Phase 2 after its discovery step.

---

## 10. Demo script (five minutes)

1. Log in as reviewer; explain the four sources and "deterministic first, AI second".
2. Data sources: connection card (team slice, key prefix only); admin Nova import with live progress.
3. Run reconciliation on the Nova batch; show live SSE counters.
4. Dashboard and Amount-at-Risk queue; say out loud: benchmark "not available" for Nova.
5. Open a case: four-source timeline with Nova ids, fee breakdown, AI explanation with policy citation.
6. Record a decision; show the audit trail; trigger the 409 in a second tab.
7. Admin changes fee percent; Refresh; exceptions and Amount at Risk move.
8. Synthetic Lab: Nova real profile, calibrated synthetic profile, comparison table, one refinement.
9. Simulated batch: benchmark with 0 false approvals.
10. Prompt-injection narration has no effect.
11. **(Phase 2)** Razorpay tab in test mode: import, run, one webhook event arriving and verified.
12. State the data honesty sentence. README credits LedgerLens and cites Assefa et al. (ICAIF 2020).

---

## 11. Decisions log and fixes made in v3

| # | Issue found in v2 | Fix in v3 |
|---|---|---|
| 1 | "Parent guide" was referenced everywhere but not in the set | This file is the parent; security list is section 8 |
| 2 | Data Guide names the Nova client branch `feat/be/nova-client`, Backend Guide names the importer `feat/be/nova` | Both kept, as two branches: client and discovery first, importer second (Doc 3 B12a and B12, Doc 10) |
| 3 | Migration 0008 could not enforce "a comparison cannot reference another merchant's profile" (plain foreign keys) | `UNIQUE (id, merchant_id)` on `metric_profiles` and composite foreign keys in `lab_comparisons` (Doc 2) |
| 4 | Smoke test called `/api/health` but the API defined only `/health` | API serves both `/health` (container check) and `/api/health` (through the proxy) (Doc 3 B1, Doc 6) |
| 5 | Down migration 0007 deleted `nova` batches but runs reference batches | Down deletes dependent runs first and is marked dev-only; production rollback is the snapshot (Doc 2) |
| 6 | Razorpay was only an optional webhook | Promoted to Phase 2 with a real data source, auth, migrations and screens (Doc 11) |
| 7 | Repo and branch workflow not written down | Doc 10 |

**Open decisions for the Lead** (defaults in brackets):
- D-R1: bank credits for a Razorpay batch come from [an uploaded bank CSV] or from a Nova import.
- D-R2: single environment-level Razorpay key [yes for the hackathon], per-merchant encrypted credentials later.
- D-R3: whether "Razorpay auth" also means OAuth partner sign-in [no].
- D-R4: if Razorpay test mode returns zero settlements, the demo shows the honest empty result and uses the Nova batch for the settlement story [yes; never fabricate settlements].
