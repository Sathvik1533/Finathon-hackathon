-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('reviewer','admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  source text NOT NULL CHECK (source IN ('simulated','upload')),
  params jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX batches_merchant_created_idx ON batches (merchant_id, created_at DESC);

CREATE TABLE internal_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  internal_id text NOT NULL,
  order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL,
  ground_truth jsonb,
  UNIQUE (batch_id, internal_id)
);
CREATE INDEX internal_merchant_order_idx ON internal_txns (merchant_id, order_ref);
CREATE INDEX internal_batch_idx ON internal_txns (batch_id);

CREATE TABLE gateway_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  gateway_payment_id text NOT NULL,
  order_ref text,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  fee_paise bigint NOT NULL DEFAULT 0 CHECK (fee_paise >= 0),
  tax_paise bigint NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  status text NOT NULL,
  captured_at timestamptz,
  settlement_id text,
  UNIQUE (batch_id, gateway_payment_id)
);
CREATE INDEX gw_merchant_pay_idx ON gateway_txns (merchant_id, gateway_payment_id);
CREATE INDEX gw_merchant_order_idx ON gateway_txns (merchant_id, order_ref);
CREATE INDEX gw_merchant_settle_idx ON gateway_txns (merchant_id, settlement_id);
CREATE INDEX gw_batch_idx ON gateway_txns (batch_id);

CREATE TABLE bank_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  utr text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  credited_at timestamptz NOT NULL,
  narration text,
  settlement_ref text
);
CREATE INDEX bank_merchant_utr_idx ON bank_credits (merchant_id, utr);
CREATE INDEX bank_batch_credited_idx ON bank_credits (batch_id, credited_at);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  refund_id text NOT NULL,
  gateway_payment_id text,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (batch_id, refund_id)
);
CREATE INDEX refunds_merchant_pay_idx ON refunds (merchant_id, gateway_payment_id);

-- Down Migration
DROP TABLE IF EXISTS refunds, bank_credits, gateway_txns, internal_txns, batches, users, merchants CASCADE;
