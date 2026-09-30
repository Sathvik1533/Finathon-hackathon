# FIN-11 LedgerSense | Database Guide (v3)

**Parent guide:** FIN-11 Main Guide (`FIN-11_0_Main_Guide_End_to_End.md`). If they disagree, the parent wins, then raise a contract PR.
**Database:** PostgreSQL only (AWS RDS in production, `pgvector/pgvector` image in local docker-compose). No other datastore. Redis only if time permits.
**Track:** Database. Owns `/db` and `/infra/db`. Branch prefix `feat/db/*`. Only the database owner merges migrations. Never edit a merged migration; add a new one.
**Related:** Data Guide (Nova + synthetic) for why the new tables exist.

## What changed in v3
1. **0008_lab.sql fixed:** `lab_comparisons` can now really refuse a profile of another merchant (`UNIQUE (id, merchant_id)` on `metric_profiles` plus composite foreign keys). In v2 the plain foreign keys could not enforce the tenant rule that prompt D9 asked to prove.
2. **0007 Down migration fixed:** dependent `runs` are deleted before the Nova batches; the Down is dev-only (production rollback is the RDS snapshot).
3. **Phase 2 migrations 0010 and 0011** (Razorpay) are specified in the Razorpay Guide (Doc 11, section 7) and built on branch `feat/db/razorpay` after the end-to-end gate.
4. Migration numbers 0007 to 0011 are reserved; nobody picks a number.

## What changed in v2
1. New migration **0007_nova.sql**: `nova_imports`, `nova_records`, `source_settlements`, `nova_id` columns, `refunds.kind`, and `batches.source` now allows `nova`.
2. New migration **0008_lab.sql**: `metric_profiles` (real and synthetic profiles for the JPM 7-step comparison).
3. Grants updated (0005 now also covers 0007 and 0008 tables; see section 5).
4. Benchmark view guarded so Nova and upload batches show "not available" instead of 0/0.

---

## 1. How the database team works in Antigravity (steps)
1. Open the monorepo in Antigravity. One agent per branch below; never two agents in the same folder.
2. `git switch develop && git pull && git switch -c <branch>`.
3. Paste the shared preface, then the branch prompt (section 6).
4. Ask the agent to run the acceptance check and paste psql output in the PR.
5. Review the diff. Reject any secret, password, sample row or hardcoded category.

**Shared preface**
> You are working only in `/db` and `/infra/db`. PostgreSQL only; local dev uses the `pgvector/pgvector` image, production is AWS RDS. Write plain SQL migrations for node-pg-migrate (`db/migrations`, SQL language, `-- Up Migration` and `-- Down Migration` markers), numbered `0001_core.sql`, `0002_recon.sql` and so on. Money is BIGINT paise; rates are integer basis points; primary keys are UUID; every table has `merchant_id` except the documented global ones. Never put passwords or secrets in any file. Prove each acceptance check with a psql script and paste the output in the PR.

## 2. Migration plan

| File | Branch | Contents |
|---|---|---|
| 0001_core.sql | feat/db/schema-core | merchants, users, batches, four source tables |
| 0002_recon.sql | feat/db/schema-recon | runs, matches, match_items, exceptions, run_outcomes |
| 0003_audit_config.sql | feat/db/audit-config | audit_log (append-only), config, policies, prompt_templates |
| 0004_pgvector.sql | feat/db/pgvector | vector extension, policy_chunks, hnsw |
| 0005_roles_grants.sql | feat/db/roles-security | least-privilege grants (roles created by bootstrap.sql) |
| 0006_views.sql | feat/db/indexes-views | summary and benchmark views |
| **0007_nova.sql** | **feat/db/nova** | **Nova import tables and columns** |
| **0008_lab.sql** | **feat/db/lab** | **metric_profiles, lab_comparisons (tenant-safe foreign keys)** |
| db/seed, db/reset.sh | feat/db/seed-scripts | demo merchants, users, config v1, policies, prompts |
| **0010_razorpay.sql** (Phase 2) | **feat/db/razorpay** | **razorpay_imports, razorpay_records, razorpay_webhook_events, `razorpay` source, merchant account id** |
| **0011_grants_razorpay.sql** (Phase 2) | **feat/db/razorpay** | **grants for the 0010 tables** |

Order of merge: 0001, 0002, 0003, then 0005 roles (bootstrap first), 0004, 0006, 0007, 0008. Grants for 0007 and 0008 are appended in a new file `0009_grants_nova_lab.sql` so 0005 stays immutable once merged (section 5).

**Schema deltas to approve at hour 2** (merge into the parent schema table): (1) `merchant_id` on matches, match_items, audit_log; (2) `run_outcomes`; (3) no CHECK on `exceptions.category`; (4) config, policies, prompt_templates insert-only; (5) `policy_chunks.merchant_id` and `is_current`; (6) no UNIQUE on `bank_credits.utr`; **(7) `nova_*` tables, `source_settlements`, `refunds.kind`; (8) `metric_profiles`.**

---

## 3. Migrations 0001 to 0006 (unchanged content)

### 0001_core.sql
```sql
-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE merchants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  email text NOT NULL, password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('reviewer','admin')),
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  source text NOT NULL CHECK (source IN ('simulated','upload')),   -- widened in 0007 (nova) and 0010 (razorpay)
  params jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX batches_merchant_created_idx ON batches (merchant_id, created_at DESC);
CREATE TABLE internal_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  internal_id text NOT NULL, order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL,
  ground_truth jsonb,                        -- null for uploads and Nova
  UNIQUE (batch_id, internal_id));
CREATE INDEX internal_merchant_order_idx ON internal_txns (merchant_id, order_ref);
CREATE INDEX internal_batch_idx ON internal_txns (batch_id);
CREATE TABLE gateway_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  gateway_payment_id text NOT NULL, order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  fee_paise bigint NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  tax_paise bigint NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  status text NOT NULL, captured_at timestamptz, settlement_id text,
  UNIQUE (batch_id, gateway_payment_id));
CREATE INDEX gw_merchant_pay_idx ON gateway_txns (merchant_id, gateway_payment_id);
CREATE INDEX gw_merchant_order_idx ON gateway_txns (merchant_id, order_ref);
CREATE INDEX gw_merchant_settle_idx ON gateway_txns (merchant_id, settlement_id);
CREATE INDEX gw_batch_idx ON gateway_txns (batch_id);
CREATE TABLE bank_credits (   -- no UNIQUE on utr: duplicate credits must be storable
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  utr text NOT NULL, amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  credited_at timestamptz NOT NULL, narration text, settlement_ref text);
CREATE INDEX bank_merchant_utr_idx ON bank_credits (merchant_id, utr);
CREATE INDEX bank_batch_credited_idx ON bank_credits (batch_id, credited_at);
CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  refund_id text NOT NULL, gateway_payment_id text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  status text NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (batch_id, refund_id));
CREATE INDEX refunds_merchant_pay_idx ON refunds (merchant_id, gateway_payment_id);
-- Down Migration
DROP TABLE refunds, bank_credits, gateway_txns, internal_txns, batches, users, merchants;
```

### 0002_recon.sql
```sql
-- Up Migration
CREATE TABLE runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  config_version int NOT NULL, config_snapshot jsonb NOT NULL,
  seed bigint, as_of timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  progress jsonb NOT NULL DEFAULT '{}', error text,
  created_by uuid REFERENCES users(id),
  started_at timestamptz, finished_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX runs_batch_idx ON runs (batch_id);
CREATE INDEX runs_merchant_created_idx ON runs (merchant_id, created_at DESC);
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  stage text NOT NULL, confidence numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1), explanation text);
CREATE INDEX matches_run_stage_idx ON matches (run_id, stage);
CREATE TABLE match_items (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  source_type text NOT NULL CHECK (source_type IN ('internal','gateway','bank','refund')),
  source_id uuid NOT NULL,
  PRIMARY KEY (match_id, source_type, source_id));     -- many rows per match = one-to-many
CREATE INDEX match_items_source_idx ON match_items (source_type, source_id);
CREATE TABLE exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  category text NOT NULL,      -- validated against config, NOT a CHECK: categories are editable
  severity text NOT NULL,
  amount_at_risk_paise bigint NOT NULL CHECK (amount_at_risk_paise >= 0),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPROVED','REJECTED','ESCALATED')),
  version int NOT NULL DEFAULT 1, evidence jsonb NOT NULL, ai_suggestion jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX exceptions_queue_idx ON exceptions (run_id, amount_at_risk_paise DESC);
CREATE INDEX exceptions_merchant_status_idx ON exceptions (merchant_id, status);
CREATE INDEX exceptions_run_category_idx ON exceptions (run_id, category);
CREATE TABLE run_outcomes (      -- one row per internal transaction per run: benchmark = one SQL join
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  internal_txn_id uuid NOT NULL REFERENCES internal_txns(id),
  predicted_status text NOT NULL CHECK (predicted_status IN ('SETTLED','EXCEPTION','UNMATCHED')),
  predicted_category text,
  settlement_match_id uuid REFERENCES matches(id),
  exception_id uuid REFERENCES exceptions(id),
  PRIMARY KEY (run_id, internal_txn_id));
-- Down Migration
DROP TABLE run_outcomes, exceptions, match_items, matches, runs;
```

### 0003_audit_config.sql
```sql
-- Up Migration
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  exception_id uuid NOT NULL REFERENCES exceptions(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('APPROVE','REJECT','ESCALATE')),
  previous_state text NOT NULL, new_state text NOT NULL, rationale text NOT NULL,
  ai_suggestion_shown jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_merchant_created_idx ON audit_log (merchant_id, created_at DESC);
CREATE INDEX audit_exception_idx ON audit_log (exception_id);
CREATE FUNCTION audit_log_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$;
CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_block();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block();
CREATE TABLE config (      -- insert-only; each row is a version AND an audit record
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  version int NOT NULL, values jsonb NOT NULL,
  updated_by uuid REFERENCES users(id), change_note text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (merchant_id, version));
CREATE TABLE policies (    -- insert-only versions; merchant_id null = global
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id),
  policy_key text NOT NULL, title text NOT NULL, body text NOT NULL, version int NOT NULL,
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX policies_key_version_uq ON policies
  (coalesce(merchant_id,'00000000-0000-0000-0000-000000000000'), policy_key, version);
CREATE TABLE prompt_templates (   -- global by design; admin-only edits
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, version int NOT NULL, template text NOT NULL, model text NOT NULL,
  temperature numeric(3,2) NOT NULL CHECK (temperature BETWEEN 0 AND 2),
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version));
-- Down Migration
DROP TABLE prompt_templates, policies, config, audit_log;
DROP FUNCTION audit_log_block();
```

### 0004_pgvector.sql
Confirm the RDS engine version supports pgvector and hnsw before relying on this (recent PostgreSQL 15 and 16 minors do). Test `CREATE EXTENSION vector` on RDS in the first hours, not at hour 34.
```sql
-- Up Migration
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE policy_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES policies(id),
  merchant_id uuid,                       -- null = global policy; retrieval filters on this
  policy_key text NOT NULL, policy_version int NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  chunk_index int NOT NULL, chunk_text text NOT NULL,
  embedding vector(384) NOT NULL,         -- small fastembed model
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX policy_chunks_vec_idx ON policy_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX policy_chunks_scope_idx ON policy_chunks (merchant_id, policy_key, is_current);
-- Down Migration
DROP TABLE policy_chunks;
```

### Roles: bootstrap.sql, then 0005_roles_grants.sql
```sql
-- infra/db/bootstrap.sql: run ONCE by the RDS master user; passwords are set from Secrets Manager
-- by the release script, never written in git
CREATE ROLE migrator LOGIN CREATEROLE;   -- owns schema objects; used only at release
CREATE ROLE api_app LOGIN;
CREATE ROLE ai_service LOGIN;
ALTER DATABASE fin11 OWNER TO migrator;
REVOKE ALL ON DATABASE fin11 FROM PUBLIC;
GRANT CONNECT ON DATABASE fin11 TO migrator, api_app, ai_service;
```
```sql
-- 0005 Up (runs as migrator, the owner of every table)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO api_app, ai_service;
GRANT SELECT, INSERT, UPDATE ON merchants, users, batches, internal_txns, gateway_txns,
  bank_credits, refunds, runs, matches, match_items, exceptions, run_outcomes TO api_app;
GRANT SELECT, INSERT ON audit_log, config, policies, prompt_templates TO api_app;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO api_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON policy_chunks TO ai_service;
```
`ai_service` cannot read `policies`; Express sends policy text in the reindex request. Optional RLS: `ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation ON exceptions USING (merchant_id = current_setting('app.merchant_id', true)::uuid);` with `SELECT set_config('app.merchant_id', $1, true)` per transaction; repeat per tenant table and keep the `WHERE merchant_id` filters in code.

### 0006_views.sql
```sql
-- Up Migration
CREATE VIEW v_run_exception_summary WITH (security_invoker = true) AS
SELECT run_id, merchant_id, category, severity, count(*) AS exception_count,
       sum(amount_at_risk_paise) AS amount_at_risk_paise
FROM exceptions GROUP BY run_id, merchant_id, category, severity;
CREATE VIEW v_run_benchmark WITH (security_invoker = true) AS
SELECT o.run_id, o.merchant_id, count(*) AS total,
  count(*) FILTER (WHERE o.predicted_status='SETTLED') AS predicted_settled,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='SETTLED') AS truth_settled,
  count(*) FILTER (WHERE o.predicted_status='SETTLED' AND t.ground_truth->>'expected_status'='SETTLED') AS true_positive,
  count(*) FILTER (WHERE o.predicted_status='SETTLED' AND t.ground_truth->>'expected_status'<>'SETTLED') AS false_approvals,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='EXCEPTION'
                   AND o.predicted_category = t.ground_truth->>'expected_category') AS category_correct,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='EXCEPTION') AS truth_exceptions,
  count(*) FILTER (WHERE t.ground_truth IS NOT NULL) AS labelled_rows      -- NEW in v2
FROM run_outcomes o JOIN internal_txns t ON t.id = o.internal_txn_id
GROUP BY o.run_id, o.merchant_id;
-- precision = true_positive / predicted_settled ; recall = true_positive / truth_settled
-- API rule: if labelled_rows = 0 (Nova or upload batch), return benchmark = null ("not available")
-- Down Migration
DROP VIEW v_run_benchmark, v_run_exception_summary;
```

---

## 4. NEW migrations

### 0007_nova.sql (branch feat/db/nova)
```sql
-- Up Migration
ALTER TABLE batches DROP CONSTRAINT batches_source_check;
ALTER TABLE batches ADD CONSTRAINT batches_source_check CHECK (source IN ('simulated','upload','nova'));

CREATE TABLE nova_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  batch_id uuid REFERENCES batches(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  team_slot int, dataset_slice int,          -- from GET /me, provenance only
  as_of date,                                -- derived or admin-overridden, see Data Guide 6.7
  as_of_source text CHECK (as_of_source IN ('derived','override')),
  resource_counts jsonb NOT NULL DEFAULT '{}',   -- {"gateway-transactions": 1840, ...}
  request_count int NOT NULL DEFAULT 0,
  reject_count int NOT NULL DEFAULT 0,
  progress jsonb NOT NULL DEFAULT '{}', error text,   -- error: our code + Nova request_id, never the key
  created_by uuid REFERENCES users(id),
  started_at timestamptz, finished_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX nova_imports_merchant_idx ON nova_imports (merchant_id, created_at DESC);

CREATE TABLE nova_records (                  -- raw payloads, so an import can be replayed offline
  import_id uuid NOT NULL REFERENCES nova_imports(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  resource text NOT NULL, nova_id text NOT NULL, payload jsonb NOT NULL,
  PRIMARY KEY (import_id, resource, nova_id));
CREATE INDEX nova_records_resource_idx ON nova_records (import_id, resource);

CREATE TABLE source_settlements (            -- expected credit per settlement, from Nova /settlements
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  settlement_ref text NOT NULL, nova_id text,
  settlement_date date, period_start date, period_end date,
  status text, net_amount_paise bigint NOT NULL CHECK (net_amount_paise >= 0),
  adjustments_paise bigint NOT NULL DEFAULT 0, payout_account_id text,
  UNIQUE (batch_id, settlement_ref));
CREATE INDEX source_settlements_merchant_ref_idx ON source_settlements (merchant_id, settlement_ref);

ALTER TABLE internal_txns ADD COLUMN nova_id text;
ALTER TABLE gateway_txns  ADD COLUMN nova_id text, ADD COLUMN gateway_ref text, ADD COLUMN bank_rrn text;
ALTER TABLE bank_credits  ADD COLUMN nova_id text, ADD COLUMN bank_ref text;
ALTER TABLE refunds       ADD COLUMN nova_id text, ADD COLUMN parent_txn_ref text,
  ADD COLUMN kind text NOT NULL DEFAULT 'refund' CHECK (kind IN ('refund','chargeback','chargeback_reversal'));
CREATE INDEX gw_merchant_rrn_idx ON gateway_txns (merchant_id, bank_rrn);
-- Down Migration
DROP INDEX gw_merchant_rrn_idx;
ALTER TABLE refunds DROP COLUMN kind, DROP COLUMN parent_txn_ref, DROP COLUMN nova_id;
ALTER TABLE bank_credits DROP COLUMN bank_ref, DROP COLUMN nova_id;
ALTER TABLE gateway_txns DROP COLUMN bank_rrn, DROP COLUMN gateway_ref, DROP COLUMN nova_id;
ALTER TABLE internal_txns DROP COLUMN nova_id;
DROP TABLE source_settlements, nova_records, nova_imports;
DELETE FROM runs WHERE batch_id IN (SELECT id FROM batches WHERE source = 'nova');   -- dev only; fails if decisions exist (audit_log is append-only)
DELETE FROM batches WHERE source = 'nova';
ALTER TABLE batches DROP CONSTRAINT batches_source_check;
ALTER TABLE batches ADD CONSTRAINT batches_source_check CHECK (source IN ('simulated','upload'));
```
Notes: this Down is for development databases. In production, rollback means restoring the pre-migration snapshot, because `audit_log` (append-only) may reference exceptions of Nova runs. `nova_records` keeps raw Nova JSON (company data). It never contains the API key. Rows are deleted with the import (cascade); `api_app` has no DELETE, so retention is handled by the release script as `migrator` (documented in the Deployment Guide).

### 0008_lab.sql (branch feat/db/lab)
```sql
-- Up Migration
CREATE TABLE metric_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('real','synthetic')),   -- real = Nova, synthetic = simulator
  metrics jsonb NOT NULL,          -- catalogue in Data Guide 8.1; scalars plus raw samples/CDF points
  generator_params jsonb,          -- for calibration output: fee_bps, lag histogram, amount quantiles...
  seed bigint,
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, merchant_id));       -- v3: target for composite foreign keys (tenant safety)
CREATE INDEX metric_profiles_merchant_idx ON metric_profiles (merchant_id, kind, created_at DESC);
CREATE TABLE lab_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  real_profile_id uuid NOT NULL,
  synthetic_profile_id uuid NOT NULL,
  iteration int NOT NULL DEFAULT 1, config_version int NOT NULL,
  result jsonb NOT NULL,           -- per metric: real, synthetic, error, verdict, parameter_hint
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (real_profile_id, merchant_id)      REFERENCES metric_profiles (id, merchant_id),
  FOREIGN KEY (synthetic_profile_id, merchant_id) REFERENCES metric_profiles (id, merchant_id));   -- v3: cross-tenant reference is impossible
CREATE INDEX lab_comparisons_merchant_idx ON lab_comparisons (merchant_id, created_at DESC);
-- Down Migration
DROP TABLE lab_comparisons, metric_profiles;
```

### 0009_grants_nova_lab.sql
```sql
-- Up Migration (runs as migrator)
GRANT SELECT, INSERT, UPDATE ON nova_imports, source_settlements TO api_app;
GRANT SELECT, INSERT ON nova_records, metric_profiles, lab_comparisons TO api_app;   -- no UPDATE, no DELETE
-- ai_service gets nothing here: it must never read Nova data or profiles
-- Down Migration
REVOKE ALL ON nova_imports, source_settlements, nova_records, metric_profiles, lab_comparisons FROM api_app;
```

---

### 0010 and 0011 (Phase 2, Razorpay)
Specified in full in `FIN-11_11_Razorpay_Integration_Guide.md`, section 7. Summary: `batches.source` also allows `razorpay`; new tables `razorpay_imports`, `razorpay_records` (raw payloads, insert-only), `razorpay_webhook_events` (verified events only, unique `event_id`); `merchants.razorpay_account_id`; `razorpay_id` columns on the four source tables; grants for `api_app` only. `ai_service` gets nothing. Build only after the end-to-end gate.

## 5. Ground-truth contract (unchanged) and two new rules
```json
{ "expected_status": "SETTLED" | "EXCEPTION",
  "expected_category": null | "FEE_MISMATCH" | "MISSING_BANK_CREDIT" | "...",
  "settlement_group": "SG-000123" }
```
- Written only by the simulator, read only by `v_run_benchmark`. Uploads and **Nova imports leave it null.**
- Hidden means hidden from the UI and the AI service. The engine must not read it (test: run with the column nulled, identical output).
- New: the engine also must not read `payments.bank_transaction_id` from `nova_records.payload`. Add a test that strips it and asserts identical output.

## 6. Connection, pooling and performance rules
1. Each service uses its own role: `api_app` (Express), `ai_service` (FastAPI), `migrator` (release step only).
2. Pooled `pg` connections; size the pool so api plus migrations stay under RDS `max_connections`.
3. Engine queries are set-based and batch-scoped (`WHERE batch_id = $1`). Bulk inserts use multi-row INSERT or COPY in one transaction. The Nova importer inserts 5,000 rows per statement, all inside one transaction.
4. Every composite index starts with `merchant_id` or `batch_id`; confirm with EXPLAIN.
5. Money is BIGINT paise; display strings are made only in the UI formatter.
6. Backups: RDS automated backups on; manual snapshot before every production migration.

## 7. Branch prompts (paste after the shared preface)
- **D1 feat/db/schema-core:** Create `0001_core.sql` exactly as in section 3. Verify on an empty database and that Down reverses it.
- **D2 feat/db/schema-recon:** Create `0002_recon.sql`. After inserting 100k synthetic rows, EXPLAIN the queue query and show the index scan.
- **D3 feat/db/audit-config:** Create `0003_audit_config.sql`. Write a psql script proving UPDATE, DELETE, TRUNCATE on `audit_log` fail.
- **D4 feat/db/roles-security:** Write `bootstrap.sql` (no passwords) and `0005_roles_grants.sql`. Add tests that connect as each role and prove allowed and denied statements.
- **D5 feat/db/pgvector:** `0004_pgvector.sql` plus a retrieval query `WHERE (merchant_id = $1 OR merchant_id IS NULL) AND is_current ORDER BY embedding <=> $2`.
- **D6 feat/db/indexes-views:** `0006_views.sql` (with `labelled_rows`). Run EXPLAIN ANALYZE on loader queries (gateway by settlement_id, bank by utr, refunds by gateway_payment_id) over a 100k-row batch; record in `db/INDEXES.md`.
- **D8 feat/db/nova:** Create `0007_nova.sql` and the grants in `0009`. Prove: a `nova` batch can be inserted, an invalid source is rejected, Down removes everything, and `api_app` cannot DELETE from `nova_records`.
- **D9 feat/db/lab:** Create `0008_lab.sql`. Prove a comparison row cannot reference a profile of another merchant (add a test with two merchants: inserting a `lab_comparisons` row for merchant A that points at merchant B's profile must fail on the composite foreign key).
- **D10 feat/db/razorpay (Phase 2):** Create `0010_razorpay.sql` and `0011_grants_razorpay.sql` exactly as in Doc 11 section 7. Prove: a `razorpay` batch inserts and an invalid source fails; `api_app` cannot DELETE `razorpay_records`; `ai_service` cannot read any `razorpay_*` table; a duplicate `event_id` is rejected; Down then Up is clean.
- **D7 feat/db/seed-scripts:** `db/seed/seed.ts` (refuses in production): two demo merchants, admin and reviewer each (bcrypt from `DEMO_PASSWORD`), config v1 including `nova` and `lab` sections (Data Guide section 10), one global policy per exception category, prompt templates v1. `db/reset.sh` drops, migrates, seeds. Seeds contain **no Nova data and no API key.**

## 8. Acceptance tests (psql)

| Check | Command idea | Expected |
|---|---|---|
| Migrations on empty DB | `npm run migrate up` twice | Success; second is a no-op |
| Down and up | `migrate down` each file then up | Clean and repeatable |
| Audit append-only | As `api_app`: UPDATE, DELETE, TRUNCATE `audit_log` | All fail |
| AI isolation | As `ai_service`: `SELECT * FROM gateway_txns`, `SELECT * FROM nova_records` | Permission denied |
| API limits | As `api_app`: `DELETE FROM exceptions`, `UPDATE config`, `DELETE FROM nova_records` | Permission denied |
| Tenant columns | Tables without `merchant_id` via information_schema | Only `merchants`, `prompt_templates`, `policy_chunks` (nullable scope) |
| Nova source | Insert batch with `source='nova'` | Succeeds; `source='x'` fails |
| Benchmark on Nova | `v_run_benchmark` for a Nova run | `labelled_rows = 0` |
| Index coverage | EXPLAIN loader and queue queries at 100k rows | Index scans on big tables |
| Lab tenant safety (v3) | Insert a comparison for merchant A referencing merchant B's profile | Foreign key violation |
| Razorpay source (Phase 2) | Insert batch with `source='razorpay'`; as `ai_service` select from `razorpay_records` | Succeeds; permission denied |

## 9. Completion checklist
- [ ] Migrations 0001 to 0009 (and 0010, 0011 after Phase 2) run on an empty PostgreSQL database and are repeatable; Down migrations work (dev only)
- [ ] Every ledger table has `merchant_id` and an index starting with it (documented globals excepted)
- [ ] `audit_log` rejects UPDATE, DELETE, TRUNCATE; `api_app` can only INSERT and SELECT it
- [ ] `ai_service` cannot read any ledger, Nova or lab table
- [ ] `api_app` has no DELETE anywhere and no UPDATE on config, policies, prompts, nova_records, metric_profiles
- [ ] `batches.source` accepts `nova`; Nova batches have null `ground_truth`
- [ ] pgvector enabled locally and on RDS; hnsw index built; retrieval merchant-scoped
- [ ] Views correct on a fixture; `labelled_rows` guard used by the API
- [ ] Seed and reset scripts work, refuse production, contain no real data, keys or passwords
- [ ] `grep -ri mongo` over the repo is empty; `grep -r nova_sk_` is empty
- [ ] Pre-migration RDS snapshot step exists in the deployment runbook
