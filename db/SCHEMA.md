# FIN-11 LedgerSense | Database Schema Specification

This document provides the complete data dictionary for all PostgreSQL / Supabase tables in FIN-11.

## Tables

### 1. `merchants`
Tenant entity.
- `id` (uuid, PK): Unique merchant identifier.
- `name` (text, NOT NULL): Company / merchant legal name.
- `created_at` (timestamptz, NOT NULL): Creation timestamp.

### 2. `users`
System users with role-based access.
- `id` (uuid, PK): User identifier.
- `merchant_id` (uuid, FK -> `merchants.id`): Tenant isolation key.
- `email` (text, UNIQUE): Lowercase email address.
- `password_hash` (text): Bcrypt hashed password.
- `role` (text): Role constraint `reviewer` or `admin`.
- `is_active` (boolean): Account active status.
- `created_at` (timestamptz): Account registration timestamp.

### 3. `batches`
Financial dataset ingestion batches.
- `id` (uuid, PK): Batch identifier.
- `merchant_id` (uuid, FK -> `merchants.id`): Tenant isolation key.
- `source` (text): Ingestion origin (`simulated`, `upload`, `nova`, `razorpay`).
- `params` (jsonb): Batch generation parameters, seed, lookback window, etc.
- `created_by` (uuid, FK -> `users.id`): Initiating user.
- `created_at` (timestamptz): Creation timestamp.

### 4. `internal_txns`
Internal system of record (merchant ERP / order management system).
- `id` (uuid, PK): Record ID.
- `batch_id` (uuid, FK -> `batches.id` ON DELETE CASCADE).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `internal_id` (text): Internal payment ID / transaction number.
- `order_ref` (text): Customer order identifier / invoice reference.
- `amount_paise` (bigint, > 0): Gross payment amount in paise.
- `currency` (char(3), default 'INR'): ISO currency.
- `created_at` (timestamptz): Transaction initiation timestamp.
- `ground_truth` (jsonb, nullable): Expected settlement outcome for simulated benchmark evaluation.

### 5. `gateway_txns`
Payment gateway capture and charge records.
- `id` (uuid, PK): Record ID.
- `batch_id` (uuid, FK -> `batches.id` ON DELETE CASCADE).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `gateway_payment_id` (text): Gateway reference (e.g. `pay_...`).
- `order_ref` (text): Merchant order reference.
- `amount_paise` (bigint, >= 0): Captured gross amount in paise.
- `fee_paise` (bigint, >= 0): Merchant Discount Rate (MDR) processing fee.
- `tax_paise` (bigint, >= 0): GST applicable on processing fee.
- `status` (text): Gateway status (`captured`, `failed`).
- `captured_at` (timestamptz): Timestamp of payment capture.
- `settlement_id` (text): Gateway payout settlement bundle ID.

### 6. `bank_credits`
Bank account statement credits (UTR records).
- `id` (uuid, PK): Record ID.
- `batch_id` (uuid, FK -> `batches.id` ON DELETE CASCADE).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `utr` (text): Unique Transaction Reference issued by banking network.
- `amount_paise` (bigint, >= 0): Net credited amount in paise.
- `credited_at` (timestamptz): Bank value / posted timestamp.
- `narration` (text): Unstructured narration string (treated as untrusted data).
- `settlement_ref` (text): Extracted or matched settlement identifier.

### 7. `refunds`
Reversals, refunds, and chargebacks.
- `id` (uuid, PK): Record ID.
- `batch_id` (uuid, FK -> `batches.id` ON DELETE CASCADE).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `refund_id` (text): Refund reference (e.g. `rfnd_...`).
- `gateway_payment_id` (text): Target gateway payment being reversed.
- `amount_paise` (bigint, > 0): Refund amount in paise.
- `status` (text): Refund status (`processed`, `pending`).
- `kind` (text): `refund`, `chargeback`, or `chargeback_reversal`.
- `created_at` (timestamptz): Refund timestamp.

### 8. `runs`
Reconciliation engine execution instance.
- `id` (uuid, PK): Run identifier.
- `batch_id` (uuid, FK -> `batches.id`).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `config_version` (int): Config version applied.
- `config_snapshot` (jsonb): Complete frozen snapshot of engine rules.
- `seed` (bigint): PRNG seed for simulated reproducibility.
- `as_of` (timestamptz): Cutoff timestamp for timing lag calculations.
- `status` (text): `queued`, `running`, `done`, `failed`.
- `progress` (jsonb): Current stage and counters for live streaming.
- `error` (text, nullable): Failure details.
- `started_at`, `finished_at`, `created_at` (timestamptz).

### 9. `matches` & `match_items`
Matched transaction groupings.
- `matches`:
  - `id` (uuid, PK).
  - `run_id` (uuid, FK -> `runs.id`).
  - `merchant_id` (uuid, FK -> `merchants.id`).
  - `stage` (text): Reconciliation stage that established match (`txn_id_match`, `reference_match`, `settlement_match`, etc.).
  - `confidence` (numeric(5,4)): Confidence score between 0.0000 and 1.0000.
  - `explanation` (text): Deterministic matching audit note.
- `match_items`:
  - `match_id` (uuid, FK -> `matches.id`).
  - `source_type` (text): `internal`, `gateway`, `bank`, `refund`.
  - `source_id` (uuid): Corresponding row ID in the source table.

### 10. `exceptions`
Discrepancy queue entries ranked by Amount at Risk.
- `id` (uuid, PK).
- `run_id` (uuid, FK -> `runs.id`).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `category` (text): `FEE_MISMATCH`, `MISSING_BANK_CREDIT`, `TIMING_LAG`, `AMOUNT_MISMATCH`, `PARTIAL_REFUND_NOT_REFLECTED`, `UNMATCHED_REVERSAL`, `MISSING_SETTLEMENT`, `DUPLICATE_BANK_CREDIT`, `DUPLICATE_PAYMENT`, `AMBIGUOUS_MATCH`.
- `severity` (text): `low`, `medium`, `high`.
- `amount_at_risk_paise` (bigint): Exposure in paise.
- `status` (text): `OPEN`, `APPROVED`, `REJECTED`, `ESCALATED`.
- `version` (int, default 1): Optimistic locking concurrency version.
- `evidence` (jsonb): Linked transaction timeline and values.
- `ai_suggestion` (jsonb, nullable): AI root-cause explanation and policy citation.

### 11. `audit_log`
Immutable record of all human decisions.
- `id` (bigserial, PK).
- `merchant_id` (uuid, FK -> `merchants.id`).
- `exception_id` (uuid, FK -> `exceptions.id`).
- `actor_id` (uuid, FK -> `users.id`).
- `action` (text): `APPROVE`, `REJECT`, `ESCALATE`.
- `previous_state`, `new_state` (text): State transition.
- `rationale` (text): Mandatory human rationale.
- `ai_suggestion_shown` (jsonb): Stored copy of what AI suggested.
- `created_at` (timestamptz): Creation timestamp.
- *Protected by trigger prohibiting UPDATE, DELETE, and TRUNCATE.*
