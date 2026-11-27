-- =====================================================================
-- Sparkility - 10_auto_save.sql   (20 Nov 2026)
--
-- Run after 09_account_security.sql. Safe to run more than once.
--
-- 1. sql_file_saves: a short history of every time a computer copied the
--    website sign-ups into database/04_sample_data.sql. The live website
--    (where the laptop file does not exist) reads it to show the admin
--    "last copied to the laptop at ..." and how many sign-ups are waiting.
-- 2. customers_in_order: the customers sorted by number (CUST-001, 002 ...).
--    A plain "SELECT * FROM customers" has NO fixed order in PostgreSQL:
--    a row that was changed is stored again at the end of the table,
--    so it shows up later. Use this view (or ORDER BY) to see them in order.
-- 3. Phone numbers in one format: 01712345678 -> +8801712345678
--    (the backend now saves new numbers this way too).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. History of copies into 04_sample_data.sql (one row per change)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sql_file_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    computer VARCHAR(100) NOT NULL,          -- which computer wrote the file (e.g. the laptop's name)
    customers_in_file INTEGER NOT NULL CHECK (customers_in_file >= 0),
    logins_in_file INTEGER NOT NULL DEFAULT 0 CHECK (logins_in_file >= 0),
    meters_in_file INTEGER NOT NULL DEFAULT 0 CHECK (meters_in_file >= 0)
);
CREATE INDEX IF NOT EXISTS idx_sql_file_saves_saved_at ON sql_file_saves(saved_at DESC);

-- ---------------------------------------------------------------------
-- 2. Customers in number order:  SELECT * FROM customers_in_order;
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW customers_in_order
WITH (security_invoker = true) AS
SELECT *
FROM customers
ORDER BY COALESCE(substring(customer_number FROM '[0-9]+$')::int, 0);

-- ---------------------------------------------------------------------
-- 3. Bangladeshi mobile numbers saved as 01XXXXXXXXX get +880 in front
--    (only numbers that are exactly 11 digits starting with 01 are changed)
-- ---------------------------------------------------------------------
UPDATE customers
SET phone = '+88' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE regexp_replace(phone, '[^0-9]', '', 'g') ~ '^01[0-9]{9}$';

-- ---------------------------------------------------------------------
-- 4. Supabase only: keep the new table and view away from the public Data API (same as 07 and 09)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;
    ALTER TABLE public.sql_file_saves ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.sql_file_saves, public.customers_in_order FROM anon, authenticated;
END
$$;

-- Check: all customers, in order, with the newest sign-ups at the end
-- SELECT customer_number, full_name, phone, created_at FROM customers_in_order;
