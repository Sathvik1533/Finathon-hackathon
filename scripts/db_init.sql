-- =====================================================================
-- FIN-11 LedgerSense | Database Initialization & Master Setup Script
-- Project: End-to-End Payment Reconciliation & Settlement Engine
-- Target Database: Supabase / PostgreSQL 15+ (pgcrypto & pgvector)
-- File: scripts/db_init.sql
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
  ground_truth jsonb,
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
  raw_narration text,
  settlement_ref text,
  nova_id text,
  UNIQUE (batch_id, utr)
);
CREATE INDEX IF NOT EXISTS bank_merchant_utr_idx ON bank_credits (merchant_id, utr);
CREATE INDEX IF NOT EXISTS bank_batch_idx ON bank_credits (batch_id);

-- ---------------------------------------------------------------------
-- 7. SOURCE 4: REFUNDS AND REVERSALS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  refund_id text NOT NULL,
  payment_id text,
  order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  fee_reversal_paise bigint NOT NULL DEFAULT 0 CHECK (fee_reversal_paise >= 0),
  tax_reversal_paise bigint NOT NULL DEFAULT 0 CHECK (tax_reversal_paise >= 0),
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  nova_id text,
  UNIQUE (batch_id, refund_id)
);
CREATE INDEX IF NOT EXISTS refunds_merchant_pay_idx ON refunds (merchant_id, payment_id);
CREATE INDEX IF NOT EXISTS refunds_batch_idx ON refunds (batch_id);

-- ---------------------------------------------------------------------
-- 8. SOURCE SETTLEMENTS (Gateway Settlement Advices)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  settlement_id text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  fee_paise bigint NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  tax_paise bigint NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  utr text,
  status text NOT NULL,
  settled_at timestamptz NOT NULL,
  payment_count integer NOT NULL DEFAULT 0 CHECK (payment_count >= 0),
  nova_id text,
  UNIQUE (batch_id, settlement_id)
);
CREATE INDEX IF NOT EXISTS src_settle_merchant_idx ON source_settlements (merchant_id, settlement_id);
CREATE INDEX IF NOT EXISTS src_settle_batch_idx ON source_settlements (batch_id);

-- ---------------------------------------------------------------------
-- 9. RECONCILIATION RUNS & ENGINE OUTPUTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  config_version integer NOT NULL,
  seed bigint,
  as_of timestamptz,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress jsonb NOT NULL DEFAULT '{"pct":0, "stage":""}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS runs_merchant_batch_idx ON runs (merchant_id, batch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  match_type text NOT NULL CHECK (match_type IN ('exact_txn_id', 'exact_ref', 'partial', 'settlement_group')),
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 6),
  net_discrepancy_paise bigint NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matches_run_merchant_idx ON matches (run_id, merchant_id);

CREATE TABLE IF NOT EXISTS match_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('internal', 'gateway', 'bank', 'refund', 'settlement')),
  record_id text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  role text NOT NULL CHECK (role IN ('primary', 'counterpart', 'settlement', 'fee_reversal', 'netting'))
);
CREATE INDEX IF NOT EXISTS match_items_match_idx ON match_items (match_id);

CREATE TABLE IF NOT EXISTS exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  amount_at_risk_paise bigint NOT NULL CHECK (amount_at_risk_paise >= 0),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'APPROVED', 'REJECTED', 'ESCALATED')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  evidence jsonb NOT NULL DEFAULT '{}',
  ai_suggestion jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exceptions_run_merchant_idx ON exceptions (run_id, merchant_id, amount_at_risk_paise DESC);
CREATE INDEX IF NOT EXISTS exceptions_status_idx ON exceptions (merchant_id, status);

CREATE TABLE IF NOT EXISTS run_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  internal_id text NOT NULL,
  category text NOT NULL,
  settled boolean NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS run_outcomes_run_merchant_idx ON run_outcomes (run_id, merchant_id);

-- ---------------------------------------------------------------------
-- 10. IMMUTABLE AUDIT TRAIL
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'ESCALATE', 'UPDATE_CONFIG', 'CREATE_BATCH', 'TRIGGER_RUN')),
  target_type text NOT NULL,
  target_id text NOT NULL,
  rationale text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_merchant_created_idx ON audit_log (merchant_id, created_at DESC);

-- PostgreSQL trigger prohibiting UPDATE, DELETE, and TRUNCATE on audit_log
CREATE OR REPLACE FUNCTION audit_log_block() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is strictly append-only. Modification or deletion is prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block();

-- ---------------------------------------------------------------------
-- 11. VERSIONED CONFIGURATION (N+1 Immutability)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  values jsonb NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, version)
);
CREATE INDEX IF NOT EXISTS config_merchant_version_idx ON config (merchant_id, version DESC);

-- ---------------------------------------------------------------------
-- 12. GOVERNANCE POLICIES & AI KNOWLEDGE BASE (pgvector)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS policies_merchant_key_idx ON policies (merchant_id, policy_key);

CREATE TABLE IF NOT EXISTS policy_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  policy_version integer NOT NULL,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(384),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS policy_chunks_search_idx ON policy_chunks (merchant_id, is_current);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  model text NOT NULL,
  temperature numeric(3,2) NOT NULL DEFAULT 0.0,
  system_prompt text NOT NULL,
  user_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, version)
);

-- ---------------------------------------------------------------------
-- 13. REAL-WORLD NOVA DATA INGESTION RECORDS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nova_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pulling', 'saving', 'transforming', 'done', 'failed')),
  counts jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nova_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES nova_imports(id) ON DELETE CASCADE,
  resource text NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL,
  pulled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, resource, external_id)
);

-- ---------------------------------------------------------------------
-- 14. SYNTHETIC LAB & METRIC PROFILES (J.P. Morgan 7-Step Method)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('nova', 'simulated', 'upload', 'razorpay')),
  metrics jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  real_profile_id uuid NOT NULL REFERENCES metric_profiles(id) ON DELETE CASCADE,
  synthetic_profile_id uuid NOT NULL REFERENCES metric_profiles(id) ON DELETE CASCADE,
  overall_status text NOT NULL CHECK (overall_status IN ('PASS', 'WARN', 'FAIL')),
  metric_evals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 15. AGGREGATED ANALYTIC VIEWS
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_run_exception_summary AS
SELECT
  run_id,
  merchant_id,
  category,
  severity,
  status,
  COUNT(*) AS exception_count,
  SUM(amount_at_risk_paise) AS total_amount_at_risk_paise
FROM exceptions
GROUP BY run_id, merchant_id, category, severity, status;

CREATE OR REPLACE VIEW v_run_benchmark AS
SELECT
  r.id AS run_id,
  r.batch_id,
  r.merchant_id,
  b.source,
  COUNT(o.id) AS total_evaluated,
  COUNT(CASE WHEN o.settled THEN 1 END) AS total_settled,
  COUNT(CASE WHEN NOT o.settled THEN 1 END) AS total_discrepancies
FROM runs r
JOIN batches b ON b.id = r.batch_id
LEFT JOIN run_outcomes o ON o.run_id = r.id
GROUP BY r.id, r.batch_id, r.merchant_id, b.source;

-- ---------------------------------------------------------------------
-- 16. SEED DATA (Bootstrap Demo Accounts, Policies, & Initial Batch)
-- ---------------------------------------------------------------------
-- Demo Merchant
INSERT INTO merchants (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Retail India Pvt Ltd', now())
ON CONFLICT (id) DO NOTHING;

-- Demo Users (Admin & Reviewer)
INSERT INTO users (id, merchant_id, email, password_hash, role, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'admin@acme.com', '$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i', 'admin', true, now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'reviewer@acme.com', '$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i', 'reviewer', true, now())
ON CONFLICT (id) DO NOTHING;

-- Initial Configuration v1
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
    "reference_metrics": {"fee_bps":200,"settlement_lag_days":2,"refund_rate_bps":150}
  }'::jsonb,
  '00000000-0000-0000-0000-000000000011',
  'Initial configuration baseline for FIN-11 reconciliation engine',
  now()
)
ON CONFLICT (merchant_id, version) DO NOTHING;

-- Governance Policies
INSERT INTO policies (id, merchant_id, policy_key, title, body, version, created_by, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    NULL,
    'POL_FEE_TOLERANCE',
    'Payment Gateway Fee Mismatch Policy',
    'Discrepancies in gateway fees exceeding 100 paise (1 INR) must be flagged for audit. If the observed fee rate differs from standard contract schedule (2.00% + 18% GST), require written tier schedule justification.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    NULL,
    'POL_MISSING_CREDIT',
    'Missing Bank Settlement Credit Policy',
    'When gateway captures a transaction as settled but no corresponding bank UTR credit arrives within T+2 days, escalate to treasury for suspense account tracing.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    NULL,
    'POL_TIMING_LAG',
    'In-Flight Settlement and Timing Lag Policy',
    'Payments captured within the settlement window (capture date + lag_days > as_of) are categorized as TIMING_LAG with low severity. No manual escalation required.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    NULL,
    'POL_DUPLICATE_CREDIT',
    'Duplicate Bank Settlement Policy',
    'Double UTR credits must never be marked settled. Escalate immediately to banking operations desk for official recovery notice.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    NULL,
    'POL_REFUNDS_NETTING',
    'Refund Netting and Chargeback Policy',
    'Customer refunds must net against current batch settlement credits. When withheld from payout, categorize as PARTIAL_REFUND_NOT_REFLECTED.',
    1,
    '00000000-0000-0000-0000-000000000011',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Initial Demo Batch
INSERT INTO batches (id, merchant_id, source, params, created_by, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'simulated',
  '{"size": 1, "seed": 42, "fee_bps": 200, "gst_bps": 1800, "settlement_lag_days": 2}'::jsonb,
  '00000000-0000-0000-0000-000000000011',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Sample 4-Source Records in Demo Batch
INSERT INTO internal_txns (id, batch_id, merchant_id, internal_id, order_ref, amount_paise, currency, created_at, ground_truth)
VALUES (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'INT_DEMO_001',
  'ORD_DEMO_1001',
  100000, -- Rs 1,000.00
  'INR',
  now() - interval '2 days',
  '{"scenario": "clean_settled", "expected_status": "settled"}'::jsonb
) ON CONFLICT (batch_id, internal_id) DO NOTHING;

INSERT INTO gateway_txns (id, batch_id, merchant_id, gateway_payment_id, order_ref, amount_paise, fee_paise, tax_paise, status, captured_at, settlement_id, bank_rrn)
VALUES (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'pay_DEMO_001',
  'ORD_DEMO_1001',
  100000,
  2000, -- Rs 20.00 MDR (2%)
  360,  -- Rs 3.60 GST (18%)
  'captured',
  now() - interval '2 days',
  'set_DEMO_901',
  'RRN1001001'
) ON CONFLICT (batch_id, gateway_payment_id) DO NOTHING;

INSERT INTO source_settlements (id, batch_id, merchant_id, settlement_id, amount_paise, fee_paise, tax_paise, utr, status, settled_at, payment_count)
VALUES (
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'set_DEMO_901',
  97640, -- 100000 - 2000 - 360
  2000,
  360,
  'UTR_DEMO_901',
  'processed',
  now() - interval '1 day',
  1
) ON CONFLICT (batch_id, settlement_id) DO NOTHING;

INSERT INTO bank_credits (id, batch_id, merchant_id, utr, amount_paise, credited_at, raw_narration, settlement_ref)
VALUES (
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'UTR_DEMO_901',
  97640,
  now() - interval '1 day',
  'CMS/NODAL/set_DEMO_901/UTR_DEMO_901/NET_PAYOUT',
  'set_DEMO_901'
) ON CONFLICT (batch_id, utr) DO NOTHING;
