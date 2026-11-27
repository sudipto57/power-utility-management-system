-- =====================================================================
-- Sparkility - Roles and Grants   (was 05_grants.sql)
--
-- OPTIONAL and for a LOCAL PostgreSQL only.
--   * Using Supabase?  SKIP this file. The backend connects with your
--     Supabase "postgres" user, and 07_supabase_security.sql protects the tables.
--   * Using local PostgreSQL? You may run it to create a separate login
--     role for the backend. Then put DB_USER=power_app and its password
--     in backend/.env.
--
-- Fix #8: roles renamed (power_app, power_readonly, power_admin).
-- IMPORTANT: change the three passwords below before you run this file,
--            and never commit real passwords to GitHub.
-- =====================================================================

-- Application login role (used by the backend)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'power_app') THEN
        CREATE ROLE power_app WITH LOGIN PASSWORD 'change_me_app_password';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO power_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO power_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO power_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO power_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO power_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO power_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO power_app;

-- Read-only role for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'power_readonly') THEN
        CREATE ROLE power_readonly WITH LOGIN PASSWORD 'change_me_readonly_password';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO power_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO power_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO power_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO power_readonly;

-- Admin role for full access
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'power_admin') THEN
        CREATE ROLE power_admin WITH LOGIN PASSWORD 'change_me_admin_password';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO power_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO power_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO power_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO power_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO power_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO power_admin;
