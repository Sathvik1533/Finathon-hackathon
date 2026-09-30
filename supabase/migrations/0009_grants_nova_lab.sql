-- Up Migration
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_app') THEN
    GRANT SELECT, INSERT, UPDATE ON nova_imports, source_settlements TO api_app;
    GRANT SELECT, INSERT ON nova_records, metric_profiles, lab_comparisons TO api_app;
  END IF;
END
$$;

-- Down Migration
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_app') THEN
    REVOKE ALL ON nova_imports, source_settlements, nova_records, metric_profiles, lab_comparisons FROM api_app;
  END IF;
END
$$;
