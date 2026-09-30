-- Up Migration
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE policy_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  merchant_id uuid,
  policy_key text NOT NULL,
  policy_version int NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(384) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX policy_chunks_vec_idx ON policy_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX policy_chunks_scope_idx ON policy_chunks (merchant_id, policy_key, is_current);

-- Down Migration
DROP TABLE IF EXISTS policy_chunks CASCADE;
