# FIN-11 LedgerSense | Database-to-Backend Contract Specification

## 1. Principles of Integration

This document defines the strict interface contract between the PostgreSQL database layer (Supabase / RDS) and the backend API service (FastAPI).

### 1.1 Tenant Scoping
- **Rule:** Every query and insert executed on behalf of an authenticated user MUST include `WHERE merchant_id = $merchant_id` or `INSERT INTO ... (merchant_id, ...) VALUES ($merchant_id, ...)`.
- **Source of Truth:** `merchant_id` is NEVER extracted from client request bodies or URL path parameters. It is cryptographically validated and extracted exclusively from the validated JWT claims (`current_user["merchant_id"]`).
- **Global Resources:** Tables `policies` and `policy_chunks` may have `merchant_id IS NULL` for system-wide default accounting rules. Queries for policies must match:
  ```sql
  WHERE (merchant_id = $merchant_id OR merchant_id IS NULL)
  ```

### 1.2 Integer Paise Currency Contract
- Amounts are represented in the database as `bigint` paise.
- **Conversion Rule:**
  - $1 \text{ INR} = 100 \text{ paise}$
  - A transaction for ₹1,250.75 is stored as `125075`.
- **Engine Math:** All fee calculations, GST calculations, partial netting, and refund subtractions are performed using integer arithmetic with half-up rounding. Floating point arithmetic is forbidden in monetary operations.

---

## 2. CRUD & Operational Contracts

### 2.1 Batch Ingestion & 4-Source Records
When a batch is created (`POST /api/batches/simulate`, `POST /api/batches/upload`, or `POST /api/nova/import`):
1. Insert into `batches`:
   ```sql
   INSERT INTO batches (id, merchant_id, source, params, created_by, created_at)
   VALUES ($id, $merchant_id, $source, $params::jsonb, $user_id, now());
   ```
2. Atomically bulk-insert associated records into:
   - `internal_txns`
   - `gateway_txns`
   - `bank_credits`
   - `refunds`
   - `source_settlements`

### 2.2 Reconciliation Execution
When a reconciliation run is triggered (`POST /api/runs`):
1. Fetch the latest `config` for the tenant:
   ```sql
   SELECT version, values FROM config
   WHERE merchant_id = $merchant_id
   ORDER BY version DESC LIMIT 1;
   ```
2. Insert `runs` record with status `'running'`.
3. Execute the 7-stage deterministic engine in memory over the batch dataset.
4. Atomically persist results:
   - Insert matched clusters into `matches` and `match_items`.
   - Insert discrepancies into `exceptions` with initial status `'OPEN'` and `version = 1`.
   - Insert transaction outcomes into `run_outcomes`.
   - Update `runs` status to `'completed'` and record `completed_at = now()`.

### 2.3 Exception Management & Optimistic Concurrency Control (OCC)
When a reviewer records a decision (`POST /api/cases/{case_id}/decision`):
```sql
UPDATE exceptions
SET status = $new_status,
    version = version + 1
WHERE id = $case_id
  AND merchant_id = $merchant_id
  AND version = $expected_version
RETURNING id, version, status;
```
- **If rows updated == 0:**
  The record was concurrently modified by another user. Rollback and return **HTTP 409 Conflict** with `{ "detail": "Conflict: Exception was modified by another reviewer. Please refresh." }`.
- **If rows updated == 1:**
  Immediately insert into `audit_log`:
  ```sql
  INSERT INTO audit_log (
    merchant_id, actor_id, action, target_type, target_id,
    rationale, previous_state, new_state, created_at
  ) VALUES (
    $merchant_id, $actor_id, $action, 'exception', $case_id,
    $rationale, $previous_state::jsonb, $new_state::jsonb, now()
  );
  ```

---

## 3. Configuration Management (N+1 Immutability)
When an admin updates configuration rules (`PUT /api/config`):
1. Lock the latest version:
   ```sql
   SELECT MAX(version) FROM config WHERE merchant_id = $merchant_id;
   ```
2. Insert version $N+1$:
   ```sql
   INSERT INTO config (merchant_id, version, values, updated_by, change_note, created_at)
   VALUES ($merchant_id, $max_version + 1, $values::jsonb, $actor_id, $change_note, now());
   ```
3. Append `UPDATE_CONFIG` event to `audit_log`.

---

## 4. Analytical Views Contract
The backend exposes reporting endpoints powered directly by these pre-aggregated database views:
- `v_run_exception_summary`: Fast categorical and severity aggregations grouped by `run_id`.
- `v_run_benchmark`: Run settlement totals and discrepancy counts for accuracy and settlement velocity tracking.
