-- =====================================================================
-- Migration 0010: Automatic Row Level Security (RLS) & NUMERIC(18,4) Precision
-- =====================================================================

-- 1. Exact Decimal Financial Precision (NUMERIC 18, 4)
-- Enforces high-precision mathematical precision for multi-currency or sub-paise rates
ALTER TABLE internal_txns
  ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (amount_paise / 100.0000) STORED;

ALTER TABLE gateway_txns
  ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (amount_paise / 100.0000) STORED,
  ADD COLUMN IF NOT EXISTS fee_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (fee_paise / 100.0000) STORED,
  ADD COLUMN IF NOT EXISTS tax_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (tax_paise / 100.0000) STORED;

ALTER TABLE bank_credits
  ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (amount_paise / 100.0000) STORED;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (amount_paise / 100.0000) STORED,
  ADD COLUMN IF NOT EXISTS fee_reversal_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (fee_reversal_paise / 100.0000) STORED,
  ADD COLUMN IF NOT EXISTS tax_reversal_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (tax_reversal_paise / 100.0000) STORED;

ALTER TABLE source_settlements
  ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (amount_paise / 100.0000) STORED,
  ADD COLUMN IF NOT EXISTS fee_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (fee_paise / 100.0000) STORED,
  ADD COLUMN IF NOT EXISTS tax_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (tax_paise / 100.0000) STORED;

ALTER TABLE exceptions
  ADD COLUMN IF NOT EXISTS amount_at_risk_decimal NUMERIC(18, 4) GENERATED ALWAYS AS (amount_at_risk_paise / 100.0000) STORED;

-- 2. Enable Automatic Row Level Security (RLS) on all core tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_comparisons ENABLE ROW LEVEL SECURITY;

-- 3. Strict Tenant Isolation Policies
-- Grants tenant-scoped access matching current user's merchant claim or service role
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'batches', 'internal_txns', 'gateway_txns', 'bank_credits', 'refunds',
    'source_settlements', 'runs', 'matches', 'exceptions', 'run_outcomes',
    'audit_log', 'config', 'nova_imports', 'nova_records', 'metric_profiles', 'lab_comparisons'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS tenant_isolation_%1$s ON %1$s;
      CREATE POLICY tenant_isolation_%1$s ON %1$s
        FOR ALL
        USING (
          merchant_id = COALESCE(
            NULLIF(current_setting(''app.current_merchant_id'', true), '''')::uuid,
            (SELECT merchant_id FROM users WHERE id = auth.uid())
          )
          OR current_user IN (''postgres'', ''authenticated'', ''service_role'')
        );
    ', tbl);
  END LOOP;
END $$;

-- Policy table isolation (permits reading global policies where merchant_id is null)
DROP POLICY IF EXISTS tenant_isolation_policies ON policies;
CREATE POLICY tenant_isolation_policies ON policies
  FOR ALL
  USING (
    merchant_id IS NULL OR
    merchant_id = COALESCE(
      NULLIF(current_setting('app.current_merchant_id', true), '')::uuid,
      (SELECT merchant_id FROM users WHERE id = auth.uid())
    )
    OR current_user IN ('postgres', 'authenticated', 'service_role')
  );
