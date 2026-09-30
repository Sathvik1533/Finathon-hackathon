# FIN-11 LedgerSense | Backend-to-Frontend API Contract Specification

## 1. Authentication & Global Conventions

### 1.1 Base URL & Headers
- **Base URL:** `http://localhost:8000` (Local) / `/api` (Production behind Caddy/Reverse Proxy)
- **Standard Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>` (Required for all routes except `/api/auth/login` and `/api/health`)
  - `X-Request-Id: <uuid>` (Returned in all responses for telemetry and debugging)

### 1.2 Monetary Format
- **All amounts are communicated in integer paise** (`1 INR = 100 paise`).
- Frontend display rule: Format `amount_paise / 100` with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

---

## 2. API Endpoints Catalog

### 2.1 Authentication & Profile
- `POST /api/auth/login`
  - **Request:** `{ "email": "admin@acme.com", "password": "Password123!" }`
  - **Response (200):**
    ```json
    {
      "user_id": "00000000-0000-0000-0000-000000000011",
      "merchant_id": "00000000-0000-0000-0000-000000000001",
      "email": "admin@acme.com",
      "role": "admin",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
- `GET /api/auth/me`
  - **Response (200):** `{ "id": "uuid", "merchant_id": "uuid", "email": "admin@acme.com", "role": "admin" }`

### 2.2 Batches & Data Ingestion
- `POST /api/batches/simulate`
  - **Request:**
    ```json
    {
      "size": 100,
      "seed": 42,
      "fee_bps": 200,
      "gst_bps": 1800,
      "settlement_lag_days": 2
    }
    ```
  - **Response (201):** `{ "id": "uuid", "merchant_id": "uuid", "source": "simulated", "params": {...}, "created_at": "ISO-8601" }`

- `POST /api/batches/upload`
  - **Form Data:** Multi-part file upload with `source_type` (`internal`, `gateway`, `bank`, `refunds`) and CSV/JSON file.
  - **Response (201):** `{ "id": "uuid", "source": "upload", "records_parsed": 250, "created_at": "ISO-8601" }`

- `POST /api/nova/import`
  - Ingests real-world accounting records from Aczen Nova API.
  - **Response (200):** `{ "import_id": "uuid", "batch_id": "uuid", "status": "done", "counts": {"gateway_txns": 40, "bank_credits": 25} }`

### 2.3 Reconciliation Execution & SSE Progress
- `POST /api/runs`
  - **Request:** `{ "batch_id": "uuid", "seed": 42, "as_of": "2026-09-30T00:00:00Z" }`
  - **Response (201):** `{ "id": "uuid", "batch_id": "uuid", "config_version": 1, "status": "running", "progress": {"pct": 0, "stage": "INIT"} }`

- `GET /api/runs/{run_id}/stream`
  - **Server-Sent Events (SSE):** Returns real-time stream of engine stage progress:
    ```
    event: progress
    data: {"stage": "STAGE_1_TXN_ID", "pct": 20, "matched": 45}

    event: progress
    data: {"stage": "STAGE_6_SETTLEMENT_MATCH", "pct": 90, "settlements_matched": 12}

    event: done
    data: {"status": "completed", "total_matched": 92, "exceptions_count": 8}
    ```

- `GET /api/runs/{run_id}`
  - Returns run details, summary counts, and timing.

### 2.4 Exceptions Queue, Case Dossier & Human Decisions
- `GET /api/exceptions?run_id={run_id}&status=OPEN&category=FEE_MISMATCH&limit=50`
  - **Response (200):**
    ```json
    [
      {
        "id": "case-uuid",
        "run_id": "run-uuid",
        "category": "FEE_MISMATCH",
        "severity": "medium",
        "amount_at_risk_paise": 236,
        "status": "OPEN",
        "version": 1,
        "evidence": {
          "internal_id": "ORD_1001",
          "gateway_payment_id": "pay_91001",
          "captured_amount_paise": 100000,
          "expected_fee_paise": 2360,
          "actual_fee_paise": 2596,
          "fee_discrepancy_paise": 236
        },
        "ai_suggestion": null,
        "created_at": "ISO-8601"
      }
    ]
    ```

- `GET /api/cases/{case_id}`
  - Returns complete case dossier, evidence bundle across all 4 sources, and previous audit history.

- `POST /api/cases/{case_id}/decision`
  - **Request:**
    ```json
    {
      "action": "APPROVE",
      "rationale": "Verified tier-2 volume discount agreement from merchant contract.",
      "expected_version": 1
    }
    ```
  - **Response (200):** Updated case object with incremented `version: 2` and `status: "APPROVED"`.
  - **Error (409 Conflict):**
    ```json
    {
      "detail": "Conflict: Exception was modified by another reviewer. Current version is 2."
    }
    ```

### 2.5 AI Explanations & Policy Intelligence
- `POST /api/cases/{case_id}/ai-explain` (or `POST /api/ai/explain-case`)
  - **Request:** `{ "exception_id": "case-uuid" }`
  - **Response (200):**
    ```json
    {
      "explanation": "Gateway deducted ₹25.96 instead of expected contract fee ₹23.60 on gross amount ₹1,000.00.",
      "suggestedAction": "Verify volume tier schedule under POL_FEE_TOLERANCE. If uncontracted, escalate to partner ops.",
      "citedPolicyIds": ["POL_FEE_TOLERANCE"],
      "confidence": 0.95
    }
    ```
- `POST /api/ai/policy-chat`
  - **Request:** `{ "query": "What is the threshold for missing bank credits?" }`
  - **Response (200):**
    ```json
    {
      "answer": "Under policy POL_MISSING_CREDIT, when a gateway marks a transaction as captured but no bank credit arrives within T+2 days past as-of date, it must be escalated to treasury for suspense account tracing.",
      "citedPolicyIds": ["POL_MISSING_CREDIT"]
    }
    ```
- `POST /api/ai/brief`
  - **Request:** `{ "run_id": "run-uuid" }`
  - **Response (200):** Executive summary controller brief of run performance, settlement rate, and top exposure categories.

### 2.6 Synthetic Lab & Reports
- `GET /api/lab/profiles` & `POST /api/lab/compare`: J.P. Morgan 7-step statistical comparison between Nova profile and synthetic generator.
- `GET /api/runs/{run_id}/report.csv` & `GET /api/runs/{run_id}/report.json`: Formatted financial reconciliation reports with CSV formula injection neutralization.
