-- infra/db/bootstrap.sql: run ONCE by the RDS/Postgres master user; passwords are set from Secrets Manager or env
-- DO NOT store plaintext passwords in git.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'migrator') THEN
    CREATE ROLE migrator LOGIN CREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_app') THEN
    CREATE ROLE api_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_service') THEN
    CREATE ROLE ai_service LOGIN;
  END IF;
END
$$;

-- Grant database connection
GRANT CONNECT ON DATABASE fin11 TO migrator, api_app, ai_service;
