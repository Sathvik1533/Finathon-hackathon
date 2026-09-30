-- Up Migration
CREATE TABLE metric_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('real','synthetic')),
  metrics jsonb NOT NULL,
  generator_params jsonb,
  seed bigint,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, merchant_id)
);
CREATE INDEX metric_profiles_merchant_idx ON metric_profiles (merchant_id, kind, created_at DESC);

CREATE TABLE lab_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  real_profile_id uuid NOT NULL,
  synthetic_profile_id uuid NOT NULL,
  iteration int NOT NULL DEFAULT 1,
  config_version int NOT NULL,
  result jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (real_profile_id, merchant_id) REFERENCES metric_profiles (id, merchant_id),
  FOREIGN KEY (synthetic_profile_id, merchant_id) REFERENCES metric_profiles (id, merchant_id)
);
CREATE INDEX lab_comparisons_merchant_idx ON lab_comparisons (merchant_id, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS lab_comparisons, metric_profiles CASCADE;
