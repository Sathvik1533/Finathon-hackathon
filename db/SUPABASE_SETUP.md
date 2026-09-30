# FIN-11 LedgerSense | Supabase & PostgreSQL Database Integration Guide

This guide documents the complete database architecture, Supabase setup steps, role configuration, entity relations, and backend connection details.

---

## 1. Quick Setup on Supabase

You can run the schema in your Supabase project in two ways:

### Option A: Via Supabase SQL Editor (Fastest)
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Run the migration files in this exact order:
   - `0001_core.sql`: Base tables (`merchants`, `users`, `batches`, `internal_txns`, `gateway_txns`, `bank_credits`, `refunds`).
   - `0002_recon.sql`: Reconciliation tables (`runs`, `matches`, `match_items`, `exceptions`, `run_outcomes`).
   - `0003_audit_config.sql`: Immutable append-only `audit_log`, versioned `config`, `policies`, `prompt_templates`.
   - `0004_pgvector.sql`: Vector extension & `policy_chunks` for RAG semantic search.
   - `0006_views.sql`: High-speed aggregated views (`v_run_exception_summary`, `v_run_benchmark`).
   - `0007_nova.sql`: Real-world accounting tables (`nova_imports`, `nova_records`, `source_settlements`).
   - `0008_lab.sql`: J.P. Morgan synthetic benchmark tables (`metric_profiles`, `lab_comparisons`).
   - `seed/seed.sql`: Pre-seeds Acme Retail merchant, reviewer & admin accounts, baseline config v1, policies, and prompt templates.

### Option B: Via Supabase CLI / Direct psql
```bash
# Connect using your Supabase Postgres connection string (from Project Settings -> Database)
psql "$DATABASE_URL" -f db/migrations/0001_core.sql
psql "$DATABASE_URL" -f db/migrations/0002_recon.sql
psql "$DATABASE_URL" -f db/migrations/0003_audit_config.sql
psql "$DATABASE_URL" -f db/migrations/0004_pgvector.sql
psql "$DATABASE_URL" -f db/migrations/0006_views.sql
psql "$DATABASE_URL" -f db/migrations/0007_nova.sql
psql "$DATABASE_URL" -f db/migrations/0008_lab.sql
psql "$DATABASE_URL" -f db/seed/seed.sql
```

---

## 2. Core Entity Relationships

```
[merchants]
   │
   ├── [users] (admin, reviewer)
   │
   ├── [batches] (simulated, upload, nova, razorpay)
   │      │
   │      ├── [internal_txns] (order_ref, amount_paise, ground_truth)
   │      ├── [gateway_txns]  (gateway_payment_id, fee_paise, tax_paise, status, settlement_id)
   │      ├── [bank_credits]  (utr, amount_paise, narration, settlement_ref)
   │      ├── [refunds]       (refund_id, gateway_payment_id, kind, amount_paise)
   │      └── [source_settlements] (settlement_ref, net_amount_paise)
   │
   ├── [runs] (batch_id, config_snapshot, seed, as_of, status)
   │      │
   │      ├── [matches] ──< [match_items] (1-to-many source mapping)
   │      ├── [exceptions] (category, severity, amount_at_risk_paise, status, version)
   │      └── [run_outcomes] (predicted_status, SETTLED vs EXCEPTION)
   │
   ├── [audit_log] (immutable append-only log of reviewer decisions)
   ├── [config]    (versioned immutable config N+1)
   └── [metric_profiles] ──< [lab_comparisons] (JPM Synthetic Lab calibration)
```

---

## 3. Strict Financial Rules & DB Guarantees

1. **Integer Paise Precision**:
   - All financial amounts (`amount_paise`, `fee_paise`, `tax_paise`, `amount_at_risk_paise`) are stored as `BIGINT` integer paise (1 INR = 100 paise).
   - Floats are strictly prohibited to prevent IEEE-754 precision loss.
2. **Append-Only Audit Log**:
   - `audit_log` is protected by database trigger `audit_log_block()`.
   - Any `UPDATE`, `DELETE`, or `TRUNCATE` will fail at the database engine level with:
     `audit_log is append-only`.
3. **Optimistic Concurrency Control**:
   - `exceptions` table has an integer `version` column.
   - When a reviewer records a decision, the update runs:
     `UPDATE exceptions SET status=$1, version=version+1 WHERE id=$2 AND merchant_id=$3 AND version=$4`.
   - If two analysts simultaneously submit decisions, the second query updates 0 rows and returns HTTP 409 Conflict.
4. **Multi-Tenant Scoping**:
   - Every ledger row contains `merchant_id`.
   - Queries strictly enforce `WHERE merchant_id = $tenant_id` to guarantee tenant isolation.
5. **No Ground Truth Leakage**:
   - `ground_truth` column on `internal_txns` is populated only for simulated datasets to compute benchmark metrics.
   - It is `NULL` for Nova and uploaded datasets. The reconciliation engine never queries `ground_truth`.

---

## 4. Connecting the Backend API

Set the environment variable in `api/.env`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

For environments where Supabase or PostgreSQL is offline during development or CI, the backend includes an automatic **In-Memory / SQLite Repository Adapter** that mirrors the exact same schema and operations, allowing tests and local development to run smoothly.
