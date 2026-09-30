-- Up Migration
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  exception_id uuid NOT NULL REFERENCES exceptions(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('APPROVE','REJECT','ESCALATE')),
  previous_state text NOT NULL,
  new_state text NOT NULL,
  rationale text NOT NULL,
  ai_suggestion_shown jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_merchant_created_idx ON audit_log (merchant_id, created_at DESC);
CREATE INDEX audit_exception_idx ON audit_log (exception_id);

CREATE OR REPLACE FUNCTION audit_log_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_block();

CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block();

CREATE TABLE config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  version int NOT NULL,
  values jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, version)
);

CREATE TABLE policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id),
  policy_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  version int NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX policies_key_version_uq ON policies
  (coalesce(merchant_id,'00000000-0000-0000-0000-000000000000'), policy_key, version);

CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version int NOT NULL,
  template text NOT NULL,
  model text NOT NULL,
  temperature numeric(3,2) NOT NULL CHECK (temperature BETWEEN 0 AND 2),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

-- Down Migration
DROP TABLE IF EXISTS prompt_templates, policies, config, audit_log CASCADE;
DROP FUNCTION IF EXISTS audit_log_block CASCADE;
