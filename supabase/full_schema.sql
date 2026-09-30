-- =====================================================================
-- FIN-11 LedgerSense | Complete Supabase & PostgreSQL Schema Master DDL
-- Project: End-to-End Payment Reconciliation & Settlement Engine
-- Target Database: Supabase / PostgreSQL 15+ (with pgcrypto & pgvector)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------
-- 2. TENANTS & ACCESS MANAGEMENT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('reviewer', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email));

-- ---------------------------------------------------------------------
-- 3. FINANCIAL DATASET BATCHES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('simulated', 'upload', 'nova', 'razorpay')),
  params jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS batches_merchant_created_idx ON batches (merchant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 4. SOURCE 1: INTERNAL TRANSACTION RECORDS (ERP / Order Management)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internal_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  internal_id text NOT NULL,
  order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL,
  ground_truth jsonb,                        -- Populated only on simulated batches for benchmark evaluation
  nova_id text,
  UNIQUE (batch_id, internal_id)
);
CREATE INDEX IF NOT EXISTS internal_merchant_order_idx ON internal_txns (merchant_id, order_ref);
CREATE INDEX IF NOT EXISTS internal_batch_idx ON internal_txns (batch_id);

-- ---------------------------------------------------------------------
-- 5. SOURCE 2: PAYMENT GATEWAY RECORDS (Captures, Fees, Taxes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gateway_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  gateway_payment_id text NOT NULL,
  order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  fee_paise bigint NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  tax_paise bigint NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  status text NOT NULL,
  captured_at timestamptz,
  settlement_id text,
  gateway_ref text,
  bank_rrn text,
  nova_id text,
  UNIQUE (batch_id, gateway_payment_id)
);
CREATE INDEX IF NOT EXISTS gw_merchant_pay_idx ON gateway_txns (merchant_id, gateway_payment_id);
CREATE INDEX IF NOT EXISTS gw_merchant_order_idx ON gateway_txns (merchant_id, order_ref);
CREATE INDEX IF NOT EXISTS gw_merchant_settle_idx ON gateway_txns (merchant_id, settlement_id);
CREATE INDEX IF NOT EXISTS gw_merchant_rrn_idx ON gateway_txns (merchant_id, bank_rrn);
CREATE INDEX IF NOT EXISTS gw_batch_idx ON gateway_txns (batch_id);

-- ---------------------------------------------------------------------
-- 6. SOURCE 3: BANK SETTLEMENT RECORDS (Bank Statement Credits & UTR)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  utr text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  credited_at timestamptz NOT NULL,
  narration text,
  settlement_ref text,
  bank_ref text,
  nova_id text
);
CREATE INDEX IF NOT EXISTS bank_merchant_utr_idx ON bank_credits (merchant_id, utr);
CREATE INDEX IF NOT EXISTS bank_batch_credited_idx ON bank_credits (batch_id, credited_at);

-- ---------------------------------------------------------------------
-- 7. SOURCE 4: REFUNDS & REVERSALS (Refunds, Chargebacks)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  refund_id text NOT NULL,
  gateway_payment_id text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  status text NOT NULL,
  kind text NOT NULL DEFAULT 'refund' CHECK (kind IN ('refund', 'chargeback', 'chargeback_reversal')),
  parent_txn_ref text,
  nova_id text,
  created_at timestamptz NOT NULL,
  UNIQUE (batch_id, refund_id)
);
CREATE INDEX IF NOT EXISTS refunds_merchant_pay_idx ON refunds (merchant_id, gateway_payment_id);

-- ---------------------------------------------------------------------
-- 8. SOURCE SETTLEMENTS (Expected Settlement Cross-Check)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  settlement_ref text NOT NULL,
  nova_id text,
  settlement_date date,
  period_start date,
  period_end date,
  status text,
  net_amount_paise bigint NOT NULL CHECK (net_amount_paise >= 0),
  adjustments_paise bigint NOT NULL DEFAULT 0,
  payout_account_id text,
  UNIQUE (batch_id, settlement_ref)
);
CREATE INDEX IF NOT EXISTS source_settlements_merchant_ref_idx ON source_settlements (merchant_id, settlement_ref);

-- ---------------------------------------------------------------------
-- 9. RECONCILIATION RUNS & ENGINE OUTCOMES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  config_version int NOT NULL,
  config_snapshot jsonb NOT NULL,
  seed bigint,
  as_of timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  progress jsonb NOT NULL DEFAULT '{}',
  error text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runs_batch_idx ON runs (batch_id);
CREATE INDEX IF NOT EXISTS runs_merchant_created_idx ON runs (merchant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  stage text NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  explanation text
);
CREATE INDEX IF NOT EXISTS matches_run_stage_idx ON matches (run_id, stage);

CREATE TABLE IF NOT EXISTS match_items (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('internal', 'gateway', 'bank', 'refund')),
  source_id uuid NOT NULL,
  PRIMARY KEY (match_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS match_items_source_idx ON match_items (source_type, source_id);

CREATE TABLE IF NOT EXISTS exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity text NOT NULL,
  amount_at_risk_paise bigint NOT NULL CHECK (amount_at_risk_paise >= 0),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'APPROVED', 'REJECTED', 'ESCALATED')),
  version int NOT NULL DEFAULT 1,
  evidence jsonb NOT NULL,
  ai_suggestion jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exceptions_queue_idx ON exceptions (run_id, amount_at_risk_paise DESC);
CREATE INDEX IF NOT EXISTS exceptions_merchant_status_idx ON exceptions (merchant_id, status);
CREATE INDEX IF NOT EXISTS exceptions_run_category_idx ON exceptions (run_id, category);

CREATE TABLE IF NOT EXISTS run_outcomes (
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  internal_txn_id uuid NOT NULL REFERENCES internal_txns(id) ON DELETE CASCADE,
  predicted_status text NOT NULL CHECK (predicted_status IN ('SETTLED', 'EXCEPTION', 'UNMATCHED')),
  predicted_category text,
  settlement_match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  exception_id uuid REFERENCES exceptions(id) ON DELETE SET NULL,
  PRIMARY KEY (run_id, internal_txn_id)
);

-- ---------------------------------------------------------------------
-- 10. APPEND-ONLY AUDIT LOG (Protected with Trigger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  exception_id uuid NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'ESCALATE')),
  previous_state text NOT NULL,
  new_state text NOT NULL,
  rationale text NOT NULL,
  ai_suggestion_shown jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_merchant_created_idx ON audit_log (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_exception_idx ON audit_log (exception_id);

CREATE OR REPLACE FUNCTION audit_log_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only. UPDATE, DELETE and TRUNCATE are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update_delete ON audit_log;
CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_block();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block();

-- ---------------------------------------------------------------------
-- 11. IMMUTABLE VERSIONED CONFIGURATION & POLICIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  version int NOT NULL,
  values jsonb NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, version)
);

CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  version int NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS policies_key_version_uq ON policies
  (coalesce(merchant_id, '00000000-0000-0000-0000-000000000000'), policy_key, version);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version int NOT NULL,
  template text NOT NULL,
  model text NOT NULL,
  temperature numeric(3,2) NOT NULL CHECK (temperature BETWEEN 0 AND 2),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

-- ---------------------------------------------------------------------
-- 12. NOVA IMPORT TABLES (Real Accounting Data Storage)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nova_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  team_slot int,
  dataset_slice int,
  as_of date,
  as_of_source text CHECK (as_of_source IN ('derived', 'override')),
  resource_counts jsonb NOT NULL DEFAULT '{}',
  request_count int NOT NULL DEFAULT 0,
  reject_count int NOT NULL DEFAULT 0,
  progress jsonb NOT NULL DEFAULT '{}',
  error text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nova_imports_merchant_idx ON nova_imports (merchant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nova_records (
  import_id uuid NOT NULL REFERENCES nova_imports(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  resource text NOT NULL,
  nova_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (import_id, resource, nova_id)
);
CREATE INDEX IF NOT EXISTS nova_records_resource_idx ON nova_records (import_id, resource);

-- ---------------------------------------------------------------------
-- 13. SYNTHETIC LAB BENCHMARK PROFILES (J.P. Morgan 7-Step Method)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('real', 'synthetic')),
  metrics jsonb NOT NULL,
  generator_params jsonb,
  seed bigint,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, merchant_id)
);
CREATE INDEX IF NOT EXISTS metric_profiles_merchant_idx ON metric_profiles (merchant_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS lab_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  real_profile_id uuid NOT NULL,
  synthetic_profile_id uuid NOT NULL,
  iteration int NOT NULL DEFAULT 1,
  config_version int NOT NULL,
  result jsonb NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (real_profile_id, merchant_id) REFERENCES metric_profiles (id, merchant_id),
  FOREIGN KEY (synthetic_profile_id, merchant_id) REFERENCES metric_profiles (id, merchant_id)
);
CREATE INDEX IF NOT EXISTS lab_comparisons_merchant_idx ON lab_comparisons (merchant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 14. AGGREGATED VIEWS
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_run_exception_summary AS
SELECT run_id, merchant_id, category, severity, count(*) AS exception_count,
       sum(amount_at_risk_paise) AS amount_at_risk_paise
FROM exceptions
GROUP BY run_id, merchant_id, category, severity;

CREATE OR REPLACE VIEW v_run_benchmark AS
SELECT o.run_id, o.merchant_id, count(*) AS total,
  count(*) FILTER (WHERE o.predicted_status='SETTLED') AS predicted_settled,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='SETTLED') AS truth_settled,
  count(*) FILTER (WHERE o.predicted_status='SETTLED' AND t.ground_truth->>'expected_status'='SETTLED') AS true_positive,
  count(*) FILTER (WHERE o.predicted_status='SETTLED' AND t.ground_truth->>'expected_status'<>'SETTLED') AS false_approvals,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='EXCEPTION'
                   AND o.predicted_category = t.ground_truth->>'expected_category') AS category_correct,
  count(*) FILTER (WHERE t.ground_truth->>'expected_status'='EXCEPTION') AS truth_exceptions,
  count(*) FILTER (WHERE t.ground_truth IS NOT NULL) AS labelled_rows
FROM run_outcomes o
JOIN internal_txns t ON t.id = o.internal_txn_id
GROUP BY o.run_id, o.merchant_id;

-- ---------------------------------------------------------------------
-- 15. SEED DATA (Demo Merchant, Users, Baseline Config, Policies)
-- ---------------------------------------------------------------------
INSERT INTO merchants (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Retail India Pvt Ltd', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, merchant_id, email, password_hash, role, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'admin@acme.com', '$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i', 'admin', true, now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'reviewer@acme.com', '$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i', 'reviewer', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO config (merchant_id, version, values, updated_by, change_note, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  1,
  '{
    "stages": [
      {"key":"txn_id_match","enabled":true},
      {"key":"reference_match","enabled":true},
      {"key":"partial_match","enabled":true},
      {"key":"fee_calculation","enabled":true},
      {"key":"refund_handling","enabled":true},
      {"key":"settlement_match","enabled":true},
      {"key":"classification","enabled":true}
    ],
    "tolerance": {"amount_paise":100,"date_window_days":3},
    "fees": {"fee_bps":200,"gst_bps":1800,"rounding":"half_up"},
    "settlement": {"tolerance_paise":100,"lag_days":2},
    "confidence": {"auto_match_min":0.90,"review_min":0.60,"weights":{"amount":0.5,"date":0.2,"reference":0.3}},
    "categories": {
      "FEE_MISMATCH": {"severity":"medium","basis":"difference","weight_bps":10000},
      "MISSING_BANK_CREDIT": {"severity":"high","basis":"net","weight_bps":10000},
      "TIMING_LAG": {"severity":"low","basis":"net","weight_bps":2000},
      "AMOUNT_MISMATCH": {"severity":"high","basis":"difference","weight_bps":10000},
      "PARTIAL_REFUND_NOT_REFLECTED": {"severity":"high","basis":"difference","weight_bps":10000},
      "UNMATCHED_REVERSAL": {"severity":"medium","basis":"net","weight_bps":8000},
      "MISSING_SETTLEMENT": {"severity":"high","basis":"net","weight_bps":10000},
      "DUPLICATE_BANK_CREDIT": {"severity":"high","basis":"net","weight_bps":10000},
      "DUPLICATE_PAYMENT": {"severity":"medium","basis":"gross","weight_bps":10000},
      "AMBIGUOUS_MATCH": {"severity":"low","basis":"gross","weight_bps":5000}
    },
    "nova": {"max_reject_pct":2,"rate_limit_per_min":100,"as_of_override":null},
    "lab": {"tol_pass":0.10,"tol_warn":0.25,"ks_pass":0.10,"ks_warn":0.20,"max_iterations":5,"amount_model":"empirical_quantiles"},
    "razorpay": {"max_reject_pct":2,"rate_limit_per_min":60,"page_size":100,"default_lookback_days":30},
    "reference_metrics": {"fee_bps":200,"settlement_lag_days":2,"refund_rate_bps":150}
  }'::jsonb,
  '00000000-0000-0000-0000-000000000011',
  'Baseline configuration for FIN-11 reconciliation engine',
  now()
)
ON CONFLICT (merchant_id, version) DO NOTHING;

INSERT INTO policies (id, merchant_id, policy_key, title, body, version, created_by, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', NULL, 'POL_FEE_TOLERANCE', 'Payment Gateway Fee Mismatch Policy', 'Discrepancies in gateway fees exceeding 100 paise (1 INR) must be flagged for audit. If the observed fee rate differs from standard contract schedule (2.00% + 18% GST), require written tier schedule justification.', 1, '00000000-0000-0000-0000-000000000011', now()),
  ('00000000-0000-0000-0000-000000000102', NULL, 'POL_MISSING_CREDIT', 'Missing Bank Settlement Credit Policy', 'When gateway captures a transaction as settled but no corresponding bank UTR credit arrives within T+2 days, escalate to treasury for suspense account tracing.', 1, '00000000-0000-0000-0000-000000000011', now()),
  ('00000000-0000-0000-0000-000000000103', NULL, 'POL_TIMING_LAG', 'In-Flight Settlement and Timing Lag Policy', 'Payments captured within the settlement window (capture date + lag_days > as_of) are categorized as TIMING_LAG with low severity. No manual escalation required.', 1, '00000000-0000-0000-0000-000000000011', now()),
  ('00000000-0000-0000-0000-000000000104', NULL, 'POL_DUPLICATE_CREDIT', 'Duplicate Bank Settlement Policy', 'Double UTR credits must never be marked settled. Escalate immediately to banking operations desk for official recovery notice.', 1, '00000000-0000-0000-0000-000000000011', now()),
  ('00000000-0000-0000-0000-000000000105', NULL, 'POL_REFUNDS_NETTING', 'Refund Netting and Chargeback Policy', 'Customer refunds must net against current batch settlement credits. When withheld from payout, categorize as PARTIAL_REFUND_NOT_REFLECTED.', 1, '00000000-0000-0000-0000-000000000011', now())
ON CONFLICT DO NOTHING;
