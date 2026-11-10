-- =====================================================================
-- Power Utility Management System - 07_supabase_security.sql
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
