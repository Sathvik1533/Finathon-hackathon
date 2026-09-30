# FIN-11 LedgerSense | Database Schema Specification

## 1. Overview & Architectural Principles

The LedgerSense database is designed for **PostgreSQL 15+** (including Supabase and AWS RDS for PostgreSQL) with extensions `pgcrypto` and `vector` (pgvector).

### Core Database Rules:
1. **Integer Paise Storage:** All currency fields store Indian Rupee amounts as `bigint` paise (1 INR = 100 paise). Floating-point currency storage is strictly prohibited to eliminate binary IEEE 754 precision loss.
2. **Multi-Tenant Isolation:** Every table (except global platform system policies and prompt templates) contains a foreign key `merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE`. Every query executed by the backend must filter on `merchant_id`.
3. **Immutability & Governance:** 
   - `audit_log` is strictly append-only. A PostgreSQL statement-level trigger `trg_audit_log_immutable` raises an exception on any attempt to `UPDATE`, `DELETE`, or `TRUNCATE`.
   - `config` uses versioned $N+1$ immutability with unique constraint `(merchant_id, version)`. Configs are never updated in-place; saving changes inserts version $N+1$.
4. **Optimistic Concurrency Control (OCC):** The `exceptions` table maintains a `version integer NOT NULL DEFAULT 1`. Concurrent human decisions must supply `expected_version`. If a race condition occurs, the database transaction fails and the API returns HTTP 409 Conflict.
5. **Zero Data Leakage:** On simulated batches, ground truth labels are isolated in `internal_txns.ground_truth` and are never queried or leaked into the reconciliation matching engine.

---

## 2. Table Catalog

### 2.1 Multi-Tenancy & Identity
- **`merchants`**
  - `id` (uuid, PK): Unique identifier for the organization/business.
  - `name` (text, NOT NULL): Legal business name.
  - `created_at` (timestamptz, NOT NULL): Organization registration timestamp.
- **`users`**
  - `id` (uuid, PK): User identity.
  - `merchant_id` (uuid, FK `merchants.id`): Tenant scope.
  - `email` (text, UNIQUE lowercase): Login address.
  - `password_hash` (text, NOT NULL): Passlib/Bcrypt hash.
  - `role` (text, CHECK `role IN ('reviewer', 'admin')`): Access tier.
  - `is_active` (boolean, NOT NULL DEFAULT true): Account state.
  - `created_at` (timestamptz, NOT NULL).

### 2.2 Financial Ingestion Batches
- **`batches`**
  - `id` (uuid, PK): Batch identifier.
  - `merchant_id` (uuid, FK `merchants.id`): Tenant scope.
  - `source` (text, CHECK `source IN ('simulated', 'upload', 'nova', 'razorpay')`).
  - `params` (jsonb, NOT NULL): Ingestion metadata (seed, size, fee schedules, upload stats).
  - `created_by` (uuid, FK `users.id`).
  - `created_at` (timestamptz, NOT NULL).

### 2.3 The Four Financial Ledger Sources
- **`internal_txns`** (Source 1: Merchant ERP / Order Management System)
  - `id` (uuid, PK)
  - `batch_id` (uuid, FK `batches.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `internal_id` (text, NOT NULL): ERP order or transaction identifier (e.g. `ORD_1001`).
  - `order_ref` (text): Merchant checkout/cart reference.
  - `amount_paise` (bigint, CHECK > 0): Expected gross purchase amount in paise.
  - `currency` (char(3), NOT NULL DEFAULT 'INR').
  - `created_at` (timestamptz, NOT NULL): Order authorization time.
  - `ground_truth` (jsonb): Injected simulation scenario (e.g. `clean_settled`, `fee_mismatch`). Null on real Nova / CSV batches.
  - `nova_id` (text): Remote Nova ID if ingested from Aczen Nova API.
  - *Constraints:* UNIQUE (`batch_id`, `internal_id`).

- **`gateway_txns`** (Source 2: Payment Gateway Records - Razorpay / PayU / Stripe)
  - `id` (uuid, PK)
  - `batch_id` (uuid, FK `batches.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `gateway_payment_id` (text, NOT NULL): Gateway transaction identifier (e.g. `pay_H83kxL91`).
  - `order_ref` (text): Gateway order identifier (e.g. `order_K910xL`).
  - `amount_paise` (bigint, CHECK >= 0): Captured gross amount.
  - `fee_paise` (bigint, CHECK >= 0): MDR fee deducted by payment gateway.
  - `tax_paise` (bigint, CHECK >= 0): GST deducted on fee (18% in India).
  - `status` (text, NOT NULL): Gateway capture status (`captured`, `failed`, `authorized`).
  - `captured_at` (timestamptz): Timestamp of payment capture.
  - `settlement_id` (text): Gateway settlement advice grouping ID (e.g. `set_91002`).
  - `gateway_ref` (text): Gateway internal reference ID.
  - `bank_rrn` (text): 12-digit Retrieval Reference Number from bank switch.
  - `nova_id` (text): Remote Nova reference ID.
  - *Constraints:* UNIQUE (`batch_id`, `gateway_payment_id`).

- **`bank_credits`** (Source 3: Bank Settlement Credits / Nodal Account Statements)
  - `id` (uuid, PK)
  - `batch_id` (uuid, FK `batches.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `utr` (text, NOT NULL): Unique Transaction Reference from NEFT/RTGS/IMPS (e.g. `CMS1092837461`).
  - `amount_paise` (bigint, CHECK >= 0): Actual net funds credited to merchant bank account.
  - `credited_at` (timestamptz, NOT NULL): Value date and time of bank credit.
  - `raw_narration` (text): Messy banking string (e.g. `CMS/NODAL/set_91002/CITIN109283/NET_PAYOUT`).
  - `settlement_ref` (text): Extracted settlement batch reference.
  - `nova_id` (text): Remote Nova reference ID.
  - *Constraints:* UNIQUE (`batch_id`, `utr`).

- **`refunds`** (Source 4: Customer Refunds, Chargebacks, & Reversals)
  - `id` (uuid, PK)
  - `batch_id` (uuid, FK `batches.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `refund_id` (text, NOT NULL): Gateway refund reference (e.g. `rfnd_91823`).
  - `payment_id` (text): Parent transaction ID being refunded.
  - `order_ref` (text): Original order reference.
  - `amount_paise` (bigint, CHECK > 0): Refund amount.
  - `fee_reversal_paise` (bigint, NOT NULL DEFAULT 0): Proportionate MDR fee reimbursed to merchant.
  - `tax_reversal_paise` (bigint, NOT NULL DEFAULT 0): Proportionate GST reimbursed.
  - `status` (text, NOT NULL): Refund status (`processed`, `reversed`, `failed`).
  - `created_at` (timestamptz, NOT NULL).
  - *Constraints:* UNIQUE (`batch_id`, `refund_id`).

- **`source_settlements`** (Gateway Settlement Advices)
  - `id` (uuid, PK)
  - `batch_id` (uuid, FK `batches.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `settlement_id` (text, NOT NULL): Gateway payout ID (e.g. `set_91002`).
  - `amount_paise` (bigint, CHECK >= 0): Net payout sum across lumped payments.
  - `fee_paise` (bigint, CHECK >= 0): Total MDR fees deducted in payout.
  - `tax_paise` (bigint, CHECK >= 0): Total GST deducted in payout.
  - `utr` (text): Bank UTR tracking this payout.
  - `status` (text, NOT NULL): Payout status (`processed`, `failed`).
  - `settled_at` (timestamptz, NOT NULL): Scheduled payout timestamp.
  - `payment_count` (integer, NOT NULL DEFAULT 0).
  - *Constraints:* UNIQUE (`batch_id`, `settlement_id`).

---

### 2.4 Reconciliation Execution & Results
- **`runs`**
  - `id` (uuid, PK)
  - `batch_id` (uuid, FK `batches.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `config_version` (integer, NOT NULL): Active configuration version at execution.
  - `seed` (bigint): PRNG seed for deterministic runs.
  - `as_of` (timestamptz): Settlement cutoff snapshot date.
  - `status` (text, CHECK `status IN ('pending', 'running', 'completed', 'failed')`).
  - `progress` (jsonb, NOT NULL DEFAULT `{"pct": 0, "stage": ""}`).
  - `created_by` (uuid, FK `users.id`).
  - `created_at` (timestamptz, NOT NULL).
  - `completed_at` (timestamptz).

- **`matches`**
  - `id` (uuid, PK)
  - `run_id` (uuid, FK `runs.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `match_type` (text, CHECK `match_type IN ('exact_txn_id', 'exact_ref', 'partial', 'settlement_group')`).
  - `confidence` (numeric(4,3), CHECK between 0.000 and 1.000).
  - `stage` (smallint, CHECK between 1 and 6).
  - `net_discrepancy_paise` (bigint, NOT NULL DEFAULT 0).
  - `details` (jsonb, NOT NULL DEFAULT '{}').
  - `created_at` (timestamptz, NOT NULL).

- **`match_items`**
  - `id` (uuid, PK)
  - `match_id` (uuid, FK `matches.id`)
  - `source_type` (text, CHECK `source_type IN ('internal', 'gateway', 'bank', 'refund', 'settlement')`).
  - `record_id` (text, NOT NULL): String ID of the underlying record in that source.
  - `amount_paise` (bigint, CHECK >= 0).
  - `role` (text, CHECK `role IN ('primary', 'counterpart', 'settlement', 'fee_reversal', 'netting')`).

- **`exceptions`** (The Case Review Queue)
  - `id` (uuid, PK): Case identifier.
  - `run_id` (uuid, FK `runs.id`).
  - `merchant_id` (uuid, FK `merchants.id`).
  - `category` (text, NOT NULL): Exception category (`FEE_MISMATCH`, `MISSING_BANK_CREDIT`, `TIMING_LAG`, `AMOUNT_MISMATCH`, `PARTIAL_REFUND_NOT_REFLECTED`, `UNMATCHED_REVERSAL`, `MISSING_SETTLEMENT`, `DUPLICATE_BANK_CREDIT`, `DUPLICATE_PAYMENT`, `AMBIGUOUS_MATCH`).
  - `severity` (text, CHECK `severity IN ('low', 'medium', 'high')`).
  - `amount_at_risk_paise` (bigint, CHECK >= 0): Financial exposure calculated from basis policy.
  - `status` (text, CHECK `status IN ('OPEN', 'APPROVED', 'REJECTED', 'ESCALATED')`, DEFAULT 'OPEN').
  - `version` (integer, NOT NULL DEFAULT 1): Optimistic locking revision.
  - `evidence` (jsonb, NOT NULL): Four-source timeline, amounts, expected vs actual fees.
  - `ai_suggestion` (jsonb): Grounded AI explanation, suggested action, and policy citation.
  - `created_at` (timestamptz, NOT NULL).

- **`run_outcomes`**
  - `id` (uuid, PK)
  - `run_id` (uuid, FK `runs.id`)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `internal_id` (text, NOT NULL)
  - `category` (text, NOT NULL)
  - `settled` (boolean, NOT NULL)
  - `details` (jsonb, NOT NULL)

---

### 2.5 Governance, Audit & Vector AI
- **`audit_log`** (Immutable Audit Trail)
  - `id` (uuid, PK)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `actor_id` (uuid, FK `users.id`)
  - `action` (text, CHECK `action IN ('APPROVE', 'REJECT', 'ESCALATE', 'UPDATE_CONFIG', 'CREATE_BATCH', 'TRIGGER_RUN')`)
  - `target_type` (text, NOT NULL)
  - `target_id` (text, NOT NULL)
  - `rationale` (text, NOT NULL)
  - `previous_state` (jsonb)
  - `new_state` (jsonb)
  - `created_at` (timestamptz, NOT NULL DEFAULT now())
  - *Trigger:* `trg_audit_log_immutable` blocks UPDATE/DELETE/TRUNCATE.

- **`config`** (Versioned N+1 Rules)
  - `id` (uuid, PK)
  - `merchant_id` (uuid, FK `merchants.id`)
  - `version` (integer, NOT NULL CHECK >= 1)
  - `values` (jsonb, NOT NULL): Engine stage toggles, fee tolerances, lag windows, weights.
  - `updated_by` (uuid, FK `users.id`)
  - `change_note` (text)
  - `created_at` (timestamptz, NOT NULL DEFAULT now())
  - *Constraints:* UNIQUE (`merchant_id`, `version`).

- **`policies`** & **`policy_chunks`** (Governance RAG Knowledge Base)
  - `policies`: Global and merchant-specific accounting policies (e.g. `POL_FEE_TOLERANCE`).
  - `policy_chunks`: Chunked text with `embedding vector(384)` indexed with pgvector for semantic retrieval.

- **`prompt_templates`**
  - Prompt templates versioned in database (`explain_case`, `policy_chat`, `brief`, `lab_narrative`, `investigate`) with `model` and `temperature` settings.

---

### 2.6 Real-World Nova Ingestion & Synthetic Lab
- **`nova_imports`** & **`nova_records`**: Raw immutable audit store of GET requests pulled from the Aczen Nova API (`/gateway-transactions`, `/bank-credits`, etc.).
- **`metric_profiles`** & **`lab_comparisons`**: Stores the 8 J.P. Morgan metrics calculated from batches and records Kolmogorov-Smirnov distribution comparisons (PASS / WARN / FAIL).
