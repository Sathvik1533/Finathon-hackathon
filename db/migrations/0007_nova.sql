-- Up Migration
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_source_check;
ALTER TABLE batches ADD CONSTRAINT batches_source_check CHECK (source IN ('simulated','upload','nova'));

CREATE TABLE nova_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  batch_id uuid REFERENCES batches(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  team_slot int,
  dataset_slice int,
  as_of date,
  as_of_source text CHECK (as_of_source IN ('derived','override')),
  resource_counts jsonb NOT NULL DEFAULT '{}',
  request_count int NOT NULL DEFAULT 0,
  reject_count int NOT NULL DEFAULT 0,
  progress jsonb NOT NULL DEFAULT '{}',
  error text,
  created_by uuid REFERENCES users(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nova_imports_merchant_idx ON nova_imports (merchant_id, created_at DESC);

CREATE TABLE nova_records (
  import_id uuid NOT NULL REFERENCES nova_imports(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  resource text NOT NULL,
  nova_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (import_id, resource, nova_id)
);
CREATE INDEX nova_records_resource_idx ON nova_records (import_id, resource);

CREATE TABLE source_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
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
CREATE INDEX source_settlements_merchant_ref_idx ON source_settlements (merchant_id, settlement_ref);

ALTER TABLE internal_txns ADD COLUMN IF NOT EXISTS nova_id text;
ALTER TABLE gateway_txns  ADD COLUMN IF NOT EXISTS nova_id text, ADD COLUMN IF NOT EXISTS gateway_ref text, ADD COLUMN IF NOT EXISTS bank_rrn text;
ALTER TABLE bank_credits  ADD COLUMN IF NOT EXISTS nova_id text, ADD COLUMN IF NOT EXISTS bank_ref text;
ALTER TABLE refunds       ADD COLUMN IF NOT EXISTS nova_id text, ADD COLUMN IF NOT EXISTS parent_txn_ref text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'refund' CHECK (kind IN ('refund','chargeback','chargeback_reversal'));

CREATE INDEX IF NOT EXISTS gw_merchant_rrn_idx ON gateway_txns (merchant_id, bank_rrn);

-- Down Migration
DROP INDEX IF EXISTS gw_merchant_rrn_idx;
ALTER TABLE refunds DROP COLUMN IF EXISTS kind, DROP COLUMN IF EXISTS parent_txn_ref, DROP COLUMN IF EXISTS nova_id;
ALTER TABLE bank_credits DROP COLUMN IF EXISTS bank_ref, DROP COLUMN IF EXISTS nova_id;
ALTER TABLE gateway_txns DROP COLUMN IF EXISTS bank_rrn, DROP COLUMN IF EXISTS gateway_ref, DROP COLUMN IF EXISTS nova_id;
ALTER TABLE internal_txns DROP COLUMN IF EXISTS nova_id;
DROP TABLE IF EXISTS source_settlements, nova_records, nova_imports CASCADE;
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_source_check;
ALTER TABLE batches ADD CONSTRAINT batches_source_check CHECK (source IN ('simulated','upload'));
