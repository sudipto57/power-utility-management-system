-- =====================================================================
-- Sparkility - 07_supabase_security.sql
--
-- Run this ONLY on Supabase (it does nothing on a normal local PostgreSQL).
--
-- Why: Supabase automatically publishes every table in the "public" schema
-- through its REST "Data API". Without this file, anyone who has your
-- project's public (anon) key could read the users table, including password hashes.
--
-- What it does (no table or column is changed):
--   1. Turns on Row Level Security (RLS) for every project table with NO
--      policies, so the public Data API can't read or change them.
--   2. Removes direct table access from Supabase's "anon" and
--      "authenticated" roles.
--   3. Makes the two views respect those rules (security_invoker).
--
-- Our backend still works because it connects as the "postgres" user, which
-- owns the tables (table owners are not limited by RLS).
-- =====================================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    -- Only run on Supabase (the "anon" role exists only there)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - nothing to do.';
        RETURN;
    END IF;

    FOREACH t IN ARRAY ARRAY[
        'users', 'customers', 'connections', 'meter_readings', 'bills', 'payments',
        'service_requests', 'service_request_comments', 'tariffs', 'tariff_slabs',
        'bill_adjustments', 'bill_installments', 'meter_reading_schedules'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END LOOP;

    EXECUTE 'ALTER VIEW public.customer_billing_summary SET (security_invoker = true)';
    EXECUTE 'ALTER VIEW public.connection_consumption SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.customer_billing_summary, public.connection_consumption FROM anon, authenticated';

    RAISE NOTICE 'Supabase security applied: RLS on, public API access removed.';
END
$$;

-- =====================================================================
-- MORE SUPABASE PROTECTION (17 Nov 2026). Safe to run more than once.
-- =====================================================================
DO $$
DECLARE
    f   TEXT;
    r   TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - nothing to do.';
        RETURN;
    END IF;

    -- S1. Nobody outside the backend may call our functions through the public Data API.
    --     (check_overdue_bills() changes data; the others are only for our triggers and API.)
    FOREACH f IN ARRAY ARRAY[
        'public.update_updated_at_column()', 'public.check_reading_sequence()', 'public.update_bill_status()',
        'public.check_overdue_bills()', 'public.calculate_bill_amount(varchar, varchar, integer)'
    ]
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    END LOOP;

    -- S2. Supabase's own "auto enable RLS" helper is SECURITY DEFINER; signed-out and
    --     signed-in API users must not be able to call it (Security Advisor warning).
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable' AND pronamespace = 'public'::regnamespace) THEN
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    END IF;

    -- S3. New functions made later are not callable by the Data API by default.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

    -- S4. Extra login roles do not belong on Supabase (05_roles_and_grants.sql is for a LOCAL
    --     PostgreSQL only; the pums_* roles use the old project short name). The backend logs in
    --     as "postgres", so nothing uses them. They could log in with the sample passwords from
    --     05 and read or delete every table, so they are removed.
    FOREACH r IN ARRAY ARRAY['power_app', 'power_readonly', 'power_admin', 'pums_app', 'pums_readonly', 'pums_admin']
    LOOP
        CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
        EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
        EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
        EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', r);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
        BEGIN
            EXECUTE format('DROP ROLE %I', r);
            RAISE NOTICE 'Removed login role %', r;
        EXCEPTION WHEN OTHERS THEN
            -- could not drop it (something else still uses it): at least stop it from logging in
            EXECUTE format('ALTER ROLE %I NOLOGIN', r);
            RAISE NOTICE 'Role % kept but can no longer log in (%)', r, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Extra Supabase protection applied.';
END
$$;
