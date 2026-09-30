# FIN-11 LedgerSense | Frontend Integration & API Wiring Guide

This guide is written specifically for the frontend teammate developing in **React & Next.js** to enable clean, isolated, and frictionless integration with the backend API and Supabase / PostgreSQL database.

---

## 1. Base URL & Authentication

- **Base API URL**: `http://localhost:8000/api` (or proxied via Next.js `/api/*`)
- **Authentication**: JWT Cookie (`access_token`) or `Authorization: Bearer <token>`
- **Default Test Accounts**:
  - **Admin**: `admin@acme.com` / `Password123!` (Role: `admin`)
  - **Reviewer**: `reviewer@acme.com` / `Password123!` (Role: `reviewer`)

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <token>
X-Requested-With: fin11
```

---

## 2. API Endpoints Contract

### A. Authentication
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Body: `{ email, password }` -> Returns `{ token, role, user_id, merchant_id }` |
| `POST` | `/api/auth/logout` | Any | Clears session cookie |
| `GET` | `/api/auth/me` | Any | Returns current user profile and role |

---

### B. Ingestion & Batches
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/batches/simulate` | Any | Body: `{ size: 100, seed: 42, fee_bps: 200, gst_bps: 1800, settlement_lag_days: 2 }`<br>Returns: `BatchResponse { id, source: 'simulated', params, created_at }` |
| `POST` | `/api/batches/upload` | Any | Multipart Form: `file` (.csv or .json)<br>Returns: `BatchResponse { id, source: 'upload', params }` |
| `GET` | `/api/batches` | Any | Returns list of all ingested batches |
| `GET` | `/api/batches/{id}` | Any | Returns batch metadata |

---

### C. Reconciliation Runs & SSE Live Progress
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/runs` | Any | Body: `{ batch_id: string, as_of?: string, seed?: number }`<br>Starts 7-stage engine. Returns `RunResponse { id, status, progress }` |
| `GET` | `/api/runs/{id}` | Any | Returns run progress and status (`queued`, `running`, `done`, `failed`) |
| `GET` | `/api/runs/{id}/stream` | Any | **Server-Sent Events (SSE)** live stream! Emits `{ status, progress: { stage, percent, matches_found, exceptions_found } }` without polling |

---

### D. Exceptions Queue & Case Dossier
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/exceptions` | Any | Query params: `run_id`, `status` (OPEN, APPROVED, REJECTED, ESCALATED), `category`, `limit`<br>Returns exceptions sorted strictly by `amount_at_risk_paise` descending! |
| `GET` | `/api/cases/{case_id}` | Any | Returns complete case dossier with evidence bundle, order refs, timestamps, and fees |
| `POST` | `/api/cases/{case_id}/decision` | Any | Body: `{ action: "APPROVE" | "REJECT" | "ESCALATE", rationale: string, expected_version: number }`<br>**Note:** If another user already reviewed this case, returns **HTTP 409 Conflict** with `{ current_version, current_status }` |
| `GET` | `/api/audit` | Any | Returns immutable append-only audit trail of analyst decisions |

---

### E. Dashboard Metrics & Reports
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/metrics/{run_id}` | Any | Returns `{ total_transactions, settled_count, exception_count, match_rate_pct, total_amount_at_risk_paise, exceptions_by_category, benchmark }` |
| `GET` | `/api/reports/{run_id}?format=csv` | Any | Downloads formal CSV reconciliation report with sanitized spreadsheet cells |

---

### F. Configuration & Synthetic Lab (Admin)
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/config` | Any | Returns current reconciliation rules and tolerances |
| `PUT` | `/api/config` | Admin | Updates rules and automatically creates version N+1 |
| `POST` | `/api/lab/profiles` | Admin | Body: `{ batch_id }` -> Computes 8-metric JPM catalogue |
| `POST` | `/api/lab/calibrate/{id}` | Admin | Calibrates simulator parameters from real profile |
| `POST` | `/api/lab/compare` | Admin | Body: `{ real_profile_id, synthetic_profile_id }` -> Returns KS-test verdicts and parameter hints |

---

## 3. Financial Data Display Rules

1. **Integer Paise**:
   - Backend returns amounts in integer paise (e.g. `amount_at_risk_paise: 250000`).
   - Format in UI: `₹(paise / 100).toFixed(2)` -> `₹2,500.00`.
2. **Benchmark Availability**:
   - For `simulated` batches: `benchmark` contains `{ precision, recall, false_approvals, category_accuracy }`.
   - For `nova` or `upload` batches: `benchmark` is `null`. The UI must display "Benchmark not available (unlabelled real-world dataset)".
3. **Handling 409 Version Conflict in UI**:
   - When submitting a decision, include `expected_version: case.version`.
   - If response is `409 Conflict`, display a modal: *"This case was updated by another team member. Reloading latest state."* and refresh case data.
