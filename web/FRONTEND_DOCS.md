# LedgerSense — Frontend Architecture & Backend Integration Guide

**Status:** ✅ Production Ready | Typecheck Passed | Lint 0 Errors | Build Passed (Static Prerender 13/13)  
**Target Audience:** Backend Engineers (FastAPI / Express / PostgreSQL / AI Service teams)

---

## 1. Architectural Overview & Rules of Engagement

LedgerSense operates as a **deterministic-first, AI-assisted multi-source financial reconciliation engine**. The frontend is built on **Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, and TanStack Query v5**.

### ⚠️ Immutable Rules for Backend Integration

1. **Same-Origin Proxy (`/api/*`)**:
   * The browser **never** speaks directly to PostgreSQL, FastAPI, or upstream Nova APIs.
   * Every request is dispatched to `/api/*` and proxied to internal backend services.
2. **Standard Headers Sent by Client**:
   * `X-Requested-With: fin11` (sent on every request for CSRF protection).
   * `Content-Type: application/json` (on mutations).
   * `credentials: "include"` (session cookie passed automatically).
3. **Standard Headers Expected from Backend**:
   * `X-Request-Id: <uuid>` (MUST be present on **every response**, especially error responses, so it can be surfaced to the user in `<ErrorState />` and `<ForbiddenState />`).
4. **Integer Paise Representation (Strictly No Floating Point)**:
   * **Rule:** Currency amounts MUST be sent as **strings representing integer paise** (1 Rupee = 100 paise).
   * Example: `₹1,234.56` ➔ `"123456"`, `₹0.00` ➔ `"0"`, `-₹50.00` ➔ `"-5000"`.
   * **Reason:** Float math breaks across multi-source rounding tolerances. The frontend uses `BigInt` integer math (`formatPaise()`).
5. **Security & Credential Masking**:
   * The backend **must never return full secret keys**. When reporting Nova status, return only the first 16 characters (`keyPrefix`).
6. **Error Response Format**:
   * Non-2xx responses must return JSON matching:
     ```json
     {
       "error": {
         "code": "invalid_parameter",
         "message": "Human readable explanation of the validation failure"
       }
     }
     ```

---

## 2. Screen Map to Backend Services

The frontend uses an optimized **Hub-and-Tab** model (consolidated from 17 specification screens into 6 unified operational hubs):

| Route | Tab Parameter | Finathon Spec | Primary Backend Service | Required Endpoints |
|---|---|---|---|---|
| `/login` | — | S2 | Auth Service | `POST /api/auth/login`, `GET /api/auth/me` |
| `/app` | — | S5 | Analytics / Engine | `GET /api/runs`, `GET /api/metrics/:runId` |
| `/app/data` | `?tab=sources` | S16 | Ingestion & Nova | `GET /api/nova/status`, `POST /api/nova/import`, `GET /api/nova/imports`, `GET /api/nova/imports/:id/stream` (SSE) |
| `/app/data` | `?tab=batches` | S3 | Simulator & Ingestion | `GET /api/batches`, `POST /api/batches/simulate`, `POST /api/uploads/presign` |
| `/app/data` | `?tab=runs` | S4 | Engine Worker | `GET /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/stream` (SSE) |
| `/app/ledger` | `?tab=transactions` | S6 | Ledger Service | `GET /api/transactions?page=1&pageSize=25&q=...` |
| `/app/ledger` | `?tab=settlements` | S7 | Settlement Service | `GET /api/settlements`, `GET /api/settlements/:id` |
| `/app/ledger` | `?tab=refunds` | S10 | Dispute Service | `GET /api/refunds` |
| `/app/review` | `?tab=queue` | S8 | Exception Service | `GET /api/exceptions?page=1&pageSize=25&status=...` |
| `/app/review` | `?tab=case&id=:id` | S9 | Case & AI Service | `GET /api/cases/:id`, `POST /api/cases/:id/decision`, `POST /api/ai/explain` |
| `/app/review` | `?tab=audit` | S11 | Audit Trail | `GET /api/audit?page=1&pageSize=25` |
| `/app/reports` | `?tab=reports` | S12 | Reporting Service | `GET /api/reports/:runId?format=csv\|json` |
| `/app/reports` | `?tab=lab` | S17 | Synthetic Lab (JPM) | `GET /api/lab/profiles`, `POST /api/lab/profiles`, `POST /api/lab/calibrate`, `POST /api/lab/compare`, `POST /api/ai/lab-narrative` |
| `/admin/config` | — | S13 | Engine Config | `GET /api/config`, `POST /api/config`, `GET /api/config/history` |
| `/admin/policies` | — | S14 | Policy Vector Store | `GET /api/policies`, `POST /api/policies`, `PUT /api/policies/:id`, `POST /api/policies/reindex` |
| `/admin/users` | — | S15 | IAM Service | `GET /api/users`, `POST /api/users` |

---

## 3. Detailed API Endpoints & Data Contracts

All types correspond to [`src/lib/api-client.ts`](file:///c:/Users/user/OneDrive/Desktop/Finathon-hackathon/Finathon-hackathon/web/src/lib/api-client.ts).

### 3.1 Authentication & User Session

#### `GET /api/auth/me`
* **Trigger:** App shell mount, cached for 5 minutes (`staleTime: 300_000`).
* **Response (200):**
  ```json
  {
    "id": "usr_01H...",
    "email": "analyst@fintech.internal",
    "role": "reviewer", // "reviewer" | "admin"
    "merchantId": "mer_01H...",
    "merchantName": "Acme Retail Payments"
  }
  ```
* **401 Response:** Frontend catches 401 and automatically executes `window.location.replace('/login?next=...')`.

#### `POST /api/auth/login`
* **Request:** `{ "email": "admin@company.com", "password": "••••••" }`
* **Response (200):** `{ "user": { ... } }` + sets `httpOnly` session cookie.
* **429 Rate Limited:** Response header `Retry-After: 60` or error message containing seconds to display the rate limit countdown banner.

---

### 3.2 Dashboard & Metrics

#### `GET /api/runs`
* **Response (200):** Array of run summaries:
  ```json
  [
    {
      "id": "run_01H...",
      "batchId": "bat_01H...",
      "batchSource": "nova", // "nova" | "simulated" | "upload"
      "status": "done",      // "queued" | "running" | "done" | "failed"
      "createdAt": "2026-09-30T10:00:00Z",
      "recordsProcessed": 10500,
      "matchesFound": 10420,
      "exceptionsFound": 80
    }
  ]
  ```

#### `GET /api/metrics/:runId`
* **Response (200):**
  ```json
  {
    "runId": "run_01H...",
    "matchRate": 0.985,
    "settledAmountPaise": "145025000",
    "exceptionCount": 80,
    "amountAtRiskPaise": "1250000",
    "exceptionsByCategory": [
      { "category": "amount_mismatch", "count": 35, "amountAtRiskPaise": "600000" },
      { "category": "timing_lag", "count": 25, "amountAtRiskPaise": "400000" },
      { "category": "fee_discrepancy", "count": 20, "amountAtRiskPaise": "250000" }
    ],
    "settlementLagDays": [
      { "day": 1, "count": 8200 },
      { "day": 2, "count": 1800 },
      { "day": 3, "count": 420 },
      { "day": 4, "count": 80 }
    ],
    "benchmark": null // IMPORTANT: Must be null for Nova and Upload batches!
                      // For Simulated batches, return ground-truth object:
    /*
    "benchmark": {
      "matchRate": 0.992,
      "precision": 0.998,
      "recall": 0.985,
      "falseApprovals": 0,
      "categoryAccuracy": 0.975
    }
    */
  }
  ```

---

### 3.3 Nova Ingestion & Ingestion Stream (SSE)

#### `GET /api/nova/status`
* **Response (200):**
  ```json
  {
    "reachable": true,
    "teamSlot": "alpha-slot-04",
    "datasetSlice": "in_2026_q3_slice_01",
    "rateLimitPerMin": 120,
    "keyPrefix": "nova_sk_live_948f" // Exactly 16 chars! Never the full key.
  }
  ```

#### `POST /api/nova/import`
* **Request:** `{ "asOfOverride": "2026-09-30" }` (or omitted if auto-derived).
* **Response (200):** `{ "importId": "imp_01H..." }`

#### `GET /api/nova/imports`
* **Response (200):** Array of import records:
  ```json
  [
    {
      "id": "imp_01H...",
      "status": "done", // "queued" | "running" | "done" | "failed"
      "startedAt": "2026-09-30T09:00:00Z",
      "asOf": "2026-09-30",
      "asOfDerived": true,
      "batchId": "bat_01H...",
      "requestCount": 42,
      "rejectCount": 3,
      "resourceCounts": {
        "payments": 5000,
        "settlements": 50,
        "refunds": 120
      }
    }
  ]
  ```

---

### 3.4 Batches & Simulation

#### `POST /api/batches/simulate`
* **Request:**
  ```json
  {
    "size": 1000,
    "seed": 42,
    "feePct": 2.5,
    "gstPct": 18.0,
    "lagDays": 3,
    "exceptionRates": {},
    "profileId": "prof_01H..." // Optional calibrated profile from Synthetic Lab
  }
  ```
* **Response (200):** `{ "batchId": "bat_01H...", "runId": "run_01H..." }`

#### `POST /api/uploads/presign`
* **Request:** `{ "fileName": "bank_statement.csv", "fileType": "text/csv" }`
* **Response (200):**
  ```json
  {
    "url": "https://s3.amazonaws.com/fin11-uploads/...",
    "fields": { "key": "raw/..." },
    "batchId": "bat_01H..."
  }
  ```

---

### 3.5 Review Center & Case Dossier

#### `GET /api/exceptions`
* **Query Params:** `?page=1&pageSize=25&status=open&category=...&severity=...&q=...`
* **Response (200):**
  ```json
  {
    "data": [
      {
        "id": "exc_01H...",
        "caseId": "case_01H...",
        "category": "fee_discrepancy",
        "severity": "high", // "high" | "medium" | "low"
        "amountAtRiskPaise": "45000",
        "status": "open",    // "open" | "approved" | "rejected" | "escalated"
        "runId": "run_01H...",
        "createdAt": "2026-09-30T10:15:00Z"
      }
    ],
    "total": 142
  }
  ```

#### `GET /api/cases/:id`
* **Response (200):**
  ```json
  {
    "id": "case_01H...",
    "exceptionId": "exc_01H...",
    "category": "fee_discrepancy",
    "severity": "high",
    "amountAtRiskPaise": "45000",
    "status": "open",
    "version": 1, // Concurrency counter!
    "runId": "run_01H...",
    "batchSource": "nova",
    "timeline": [
      {
        "id": "evt_1",
        "source": "internal", // "internal" | "gateway" | "bank" | "refund"
        "type": "order_created",
        "date": "2026-09-30T09:12:00Z",
        "amountPaise": "150000",
        "status": "matched",
        "novaId": "pay_nova_8829"
      },
      {
        "id": "evt_2",
        "source": "gateway",
        "type": "charge_captured",
        "date": "2026-09-30T09:12:05Z",
        "amountPaise": "150000",
        "status": "matched"
      },
      {
        "id": "evt_3",
        "source": "bank",
        "type": "credit_cleared",
        "date": "2026-09-30T14:30:00Z",
        "amountPaise": "145500",
        "status": "discrepancy"
      }
    ],
    "feeBreakdown": {
      "expectedFeePaise": "3750",
      "actualFeePaise": "4200",
      "differencePaise": "450",
      "expectedGstPaise": "675",
      "actualGstPaise": "756"
    },
    "deterministicExplanation": "Gateway transaction deducted 2.8% MDR instead of the agreed contract rate of 2.5%. Variance of ₹4.50 exceeds the 100 paise tolerance threshold.",
    "aiSuggestion": "MDR rate discrepancy detected. Review contract schedule for Razorpay UPI charges. Recommended action: Approve adjustment.",
    "aiUnavailable": false // If true, frontend displays fallback banner without errors
  }
  ```

#### `POST /api/cases/:id/decision`
* **Request:**
  ```json
  {
    "decision": "approved", // "approved" | "rejected" | "escalated"
    "note": "Rate discrepancy verified against Razorpay merchant agreement schedule.",
    "version": 1 // Sent from caseData.version
  }
  ```
* **409 Conflict:** If another reviewer modified the case concurrently, return HTTP 409 so the frontend can alert the analyst to re-fetch the latest state.

#### `POST /api/ai/explain`
* **Request:** `{ "caseId": "case_01H..." }`
* **Response (200):** `{ "suggestion": "Plain text analysis and recommendation..." }`

---

### 3.6 Synthetic Lab (J.P. Morgan 7-Step Method)

#### `GET /api/lab/profiles`
* **Response (200):**
  ```json
  [
    {
      "id": "prof_01H...",
      "batchId": "bat_01H...",
      "batchSource": "nova",
      "kind": "real", // "real" | "synthetic"
      "createdAt": "2026-09-30T08:00:00Z",
      "metrics": {
        "fee_ratio_bps": 248.5,
        "timing_lag_mean": 2.1,
        "refund_rate_pct": 1.45
      }
    }
  ]
  ```

#### `POST /api/lab/compare`
* **Request:** `{ "realProfileId": "prof_real_01", "syntheticProfileId": "prof_syn_02" }`
* **Response (200):**
  ```json
  {
    "id": "cmp_01H...",
    "realProfileId": "prof_real_01",
    "syntheticProfileId": "prof_syn_02",
    "createdAt": "2026-09-30T11:00:00Z",
    "iterationCount": 2,
    "rows": [
      {
        "metricKey": "fee_ratio_bps",
        "realValue": 250,
        "syntheticValue": 252,
        "error": 0.008,
        "verdict": "PASS", // "PASS" | "WARN" | "FAIL"
        "paramHint": "MDR parameter calibrated within 10 bps"
      }
    ]
  }
  ```

#### `POST /api/ai/lab-narrative`
* **Request:** `{ "comparisonId": "cmp_01H..." }`
* **Response (200):** `{ "narrative": "Detailed statistical divergence narrative..." }`

---

## 4. Server-Sent Events (SSE) Specification

The frontend connects using [`useSSE()`](file:///c:/Users/user/OneDrive/Desktop/Finathon-hackathon/Finathon-hackathon/web/src/hooks/useSSE.ts). The backend streams events using `text/event-stream`.

### Endpoints
1. `/api/runs/:id/stream` (Reconciliation run execution telemetry)
2. `/api/nova/imports/:id/stream` (Live ingestion progress from Nova)

### Event Types Handled by Frontend

```
event: progress
data: {"resource": "payments", "count": 1500, "requestCount": 15, "rejects": 0}

event: counter
data: {"recordsProcessed": 10000, "matchesFound": 9850, "exceptionsFound": 150}

event: stage
data: {"stage": "stage_1_exact_match", "status": "running"}

event: done
data: {"status": "done"}

event: error
data: {"message": "Rate limit exceeded on Nova API"}
```

* **Frontend Resilience**: If the connection breaks, `useSSE` automatically retries with exponential backoff (1s, 2s, 4s, 8s, up to 15s cap, max 5 attempts) with status displayed as `<StatusBadge status="reconnecting" />`.
* **Completion**: When an event with `type: "done"` arrives, the frontend automatically closes the `EventSource` and refetches corresponding queries.

---

## 5. Security & Compliance Checklist

| Rule | Enforcement Location | Backend Expectation |
|---|---|---|
| **No secrets in frontend** | `next.config.ts`, grep test | Never return private API keys or database connection strings. Return only `keyPrefix` (16 chars). |
| **No XSS injection** | Plain text rendering | Text fields (narrations, AI suggestions, rationales) are rendered as plain text. Backend does not need to pre-sanitize HTML, but must preserve raw formatting. |
| **No localStorage tokens** | Pure `httpOnly` cookies | Cookie must be configured with `SameSite=Lax` or `Strict` and `HttpOnly`. |
| **CSRF defense** | Fetch client | Non-GET requests carry `X-Requested-With: fin11`. Backend should reject requests missing this header. |
| **Role authorization** | `<AdminGuard>` in UI | Backend MUST independently enforce role gates on `/api/config`, `/api/users`, and `/api/policies` and return `403 Forbidden` with `X-Request-Id`. |

---

## 6. How to Run & Verify the Frontend

```bash
# 1. Install dependencies
cd web
npm install

# 2. Run TypeScript typecheck (Must pass with 0 errors)
npx tsc --noEmit

# 3. Run ESLint (Must pass with 0 errors, 0 warnings)
npm run lint

# 4. Run Production Build (Must prerender all 13 routes cleanly)
npm run build

# 5. Start Next.js server
npm run dev # Runs on http://localhost:3000
```
