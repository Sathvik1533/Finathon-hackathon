-- Up Migration
CREATE TABLE runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  config_version int NOT NULL,
  config_snapshot jsonb NOT NULL,
  seed bigint,
  as_of timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  progress jsonb NOT NULL DEFAULT '{}',
  error text,
  created_by uuid REFERENCES users(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runs_batch_idx ON runs (batch_id);
CREATE INDEX runs_merchant_created_idx ON runs (merchant_id, created_at DESC);

CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  stage text NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  explanation text
);
CREATE INDEX matches_run_stage_idx ON matches (run_id, stage);

CREATE TABLE match_items (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  source_type text NOT NULL CHECK (source_type IN ('internal','gateway','bank','refund')),
  source_id uuid NOT NULL,
  PRIMARY KEY (match_id, source_type, source_id)
);
CREATE INDEX match_items_source_idx ON match_items (source_type, source_id);

CREATE TABLE exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  category text NOT NULL,
  severity text NOT NULL,
  amount_at_risk_paise bigint NOT NULL CHECK (amount_at_risk_paise >= 0),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPROVED','REJECTED','ESCALATED')),
  version int NOT NULL DEFAULT 1,
  evidence jsonb NOT NULL,
  ai_suggestion jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exceptions_queue_idx ON exceptions (run_id, amount_at_risk_paise DESC);
CREATE INDEX exceptions_merchant_status_idx ON exceptions (merchant_id, status);
CREATE INDEX exceptions_run_category_idx ON exceptions (run_id, category);

CREATE TABLE run_outcomes (
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  internal_txn_id uuid NOT NULL REFERENCES internal_txns(id),
  predicted_status text NOT NULL CHECK (predicted_status IN ('SETTLED','EXCEPTION','UNMATCHED')),
  predicted_category text,
  settlement_match_id uuid REFERENCES matches(id),
  exception_id uuid REFERENCES exceptions(id),
  PRIMARY KEY (run_id, internal_txn_id)
);

-- Down Migration
DROP TABLE IF EXISTS run_outcomes, exceptions, match_items, matches, runs CASCADE;
