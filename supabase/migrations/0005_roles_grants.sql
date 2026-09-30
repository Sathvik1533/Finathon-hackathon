-- Up Migration
DO $$
BEGIN
  -- Safe grant execution if roles exist
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_app') THEN
    GRANT USAGE ON SCHEMA public TO api_app;
    GRANT SELECT, INSERT, UPDATE ON merchants, users, batches, internal_txns, gateway_txns,
      bank_credits, refunds, runs, matches, match_items, exceptions, run_outcomes TO api_app;
    GRANT SELECT, INSERT ON audit_log, config, policies, prompt_templates TO api_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO api_app;
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_service') THEN
    GRANT USAGE ON SCHEMA public TO ai_service;
    GRANT SELECT, INSERT, UPDATE, DELETE ON policy_chunks TO ai_service;
  END IF;
END
$$;

-- Down Migration
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_app') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM api_app;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_service') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ai_service;
  END IF;
END
$$;
