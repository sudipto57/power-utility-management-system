-- =====================================================================
-- Power Utility Management System - 08_update_existing_database.sql
--
-- For a database that was built BEFORE 17 Nov 2026 (like the team's Supabase project).
-- It adds the fixes that are now part of 03 and 07, without rebuilding anything.
-- Safe to run more than once. A brand-new database does NOT need this file
-- (03 and 07 already contain the same fixes).
--
-- Order for an existing database:  08_update_existing_database.sql  ->  04_sample_data.sql
-- =====================================================================

-- =====================================================================
-- FIXES (17 Nov 2026). Safe to run more than once.
-- Found by checking the Supabase database and its Security/Performance Advisor.
-- No table or column is added, removed or renamed.
-- =====================================================================

-- F1. users.customer_id had no foreign key, so a login could point at a customer
--     that does not exist. Now it must point at a real customer (or be empty).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_customer_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- F2. Rules that stop impossible data
ALTER TABLE meter_readings DROP CONSTRAINT IF EXISTS meter_readings_one_per_day;
ALTER TABLE meter_readings ADD CONSTRAINT meter_readings_one_per_day UNIQUE (connection_id, reading_date);

ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_one_per_period;
ALTER TABLE bills ADD CONSTRAINT bills_one_per_period UNIQUE (connection_id, billing_period_end);

ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_valid_dates;
ALTER TABLE bills ADD CONSTRAINT bills_valid_dates
    CHECK (billing_period_end >= billing_period_start AND due_date >= billing_period_end);

ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_amounts_not_negative;
ALTER TABLE bills ADD CONSTRAINT bills_amounts_not_negative
    CHECK (fixed_charge >= 0 AND variable_charge >= 0 AND tax_amount >= 0 AND total_amount >= 0);

ALTER TABLE tariffs DROP CONSTRAINT IF EXISTS tariffs_valid_amounts;
ALTER TABLE tariffs ADD CONSTRAINT tariffs_valid_amounts
    CHECK (fixed_charge >= 0 AND tax_rate >= 0 AND tax_rate <= 100);

ALTER TABLE tariff_slabs DROP CONSTRAINT IF EXISTS tariff_slabs_order_unique;
ALTER TABLE tariff_slabs ADD CONSTRAINT tariff_slabs_order_unique UNIQUE (tariff_id, slab_order);

ALTER TABLE tariff_slabs DROP CONSTRAINT IF EXISTS tariff_slabs_valid_range;
ALTER TABLE tariff_slabs ADD CONSTRAINT tariff_slabs_valid_range
    CHECK (start_unit >= 0 AND (end_unit IS NULL OR end_unit >= start_unit) AND rate_per_unit >= 0);

-- F3. Bangladesh VAT is 5% (the old default was 16%)
ALTER TABLE tariffs ALTER COLUMN tax_rate SET DEFAULT 5.00;

-- F4. Indexes for foreign keys that had none (Supabase Performance Advisor: "Unindexed foreign keys")
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_recorded_by ON meter_readings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_request_comments_user_id ON service_request_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_adjustments_approved_by ON bill_adjustments(approved_by);
CREATE INDEX IF NOT EXISTS idx_meter_reading_schedules_assigned_to ON meter_reading_schedules(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meter_reading_schedules_actual_reading_id ON meter_reading_schedules(actual_reading_id);

-- F5. Three indexes were exact copies of the indexes that UNIQUE already makes. Remove the copies.
DROP INDEX IF EXISTS idx_connections_meter_number;   -- connections_meter_number_key already indexes meter_number
DROP INDEX IF EXISTS idx_users_email;                -- users_email_key already indexes email
DROP INDEX IF EXISTS idx_users_customer_id;          -- unique_customer_user already indexes customer_id

-- F6. Bill status trigger, improved:
--     * a bill that is still not fully paid after its due date becomes 'Overdue' at once
--       (before, deleting a payment made it 'Unpaid' even when it was late)
--     * if a payment is moved to another bill, BOTH bills are recalculated
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    v_bill_id    UUID;
    total_paid   DECIMAL(12,2);
    bill_total   DECIMAL(12,2);
    bill_due     DATE;
    new_status   VARCHAR(20);
BEGIN
    FOR v_bill_id IN
        SELECT DISTINCT x FROM unnest(ARRAY[
            CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.bill_id END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.bill_id END
        ]) AS x WHERE x IS NOT NULL
    LOOP
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payments
        WHERE bill_id = v_bill_id AND status = 'Completed';

        SELECT total_amount, due_date INTO bill_total, bill_due FROM bills WHERE id = v_bill_id;
        CONTINUE WHEN bill_total IS NULL;           -- the bill itself is being deleted

        IF total_paid >= bill_total THEN
            new_status := 'Paid';
        ELSIF bill_due < CURRENT_DATE THEN
            new_status := 'Overdue';
        ELSIF total_paid > 0 THEN
            new_status := 'Partially Paid';
        ELSE
            new_status := 'Unpaid';
        END IF;

        UPDATE bills SET status = new_status, updated_at = NOW() WHERE id = v_bill_id;
    END LOOP;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- F7. Fixed search_path for every project function (Supabase Security Advisor:
--     "Function Search Path Mutable"). The function then always uses our tables.
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION check_reading_sequence() SET search_path = public, pg_temp;
ALTER FUNCTION update_bill_status() SET search_path = public, pg_temp;
ALTER FUNCTION check_overdue_bills() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_bill_amount(VARCHAR, VARCHAR, INTEGER) SET search_path = public, pg_temp;

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
