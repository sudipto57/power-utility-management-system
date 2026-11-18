-- =====================================================================
-- Power Utility Management System - 09_account_security.sql   (18 Nov 2026)
--
-- For the new account features:
--   * email confirmation after sign up   (8-digit code sent by email)
--   * forgot password                    (8-digit code sent by email)
--   * login code for customers           (8-digit code at every login, like GitHub)  - 18 Nov 2026
--   * profile change requests            (customer asks, admin approves)
--
-- It ADDS 2 new tables. The original tables are NOT changed.
-- Safe to run more than once, on Supabase and on a local PostgreSQL.
-- Already ran an older copy? Run this one again: it adds the login codes and changes nothing else.
--
-- New database:       00 -> 01 -> 02 -> 03 -> 04 -> 07 (Supabase) -> 09
-- Existing database:  just run this file (it also updates the admin login, part 4)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. account_codes: the 8-digit codes we email to customers
--    We store only a SHA-256 hash of the code (like a password), never the code.
--    A customer who still has an unused 'confirm_email' code has NOT confirmed
--    their email yet, so they cannot log in until they do.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(20) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- codes work for 15 minutes
    attempts INTEGER NOT NULL DEFAULT 0,             -- wrong tries (blocked after 5)
    used_at TIMESTAMP WITH TIME ZONE,                -- set when the code is used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_codes_user_purpose ON account_codes(user_id, purpose);

-- The kinds of code (set here, so running the file again also updates an older database)
ALTER TABLE account_codes DROP CONSTRAINT IF EXISTS account_codes_purpose_check;
ALTER TABLE account_codes ADD CONSTRAINT account_codes_purpose_check
    CHECK (purpose IN ('confirm_email', 'reset_password', 'login'));

-- ---------------------------------------------------------------------
-- 2. profile_change_requests: email / phone / customer type / connection type
--    can only change after an admin approves. (Name and address the customer
--    changes alone, so they are not stored here.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    field VARCHAR(20) NOT NULL CHECK (field IN ('email', 'phone', 'customer_type', 'connection_type')),
    connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,  -- only for 'connection_type'
    old_value VARCHAR(255),
    new_value VARCHAR(255) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_note TEXT,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT change_request_connection_needed
        CHECK ((field = 'connection_type') = (connection_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_change_requests_customer ON profile_change_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_connection ON profile_change_requests(connection_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_decided_by ON profile_change_requests(decided_by);

-- Only ONE waiting request per thing to change (per meter for the connection type)
CREATE UNIQUE INDEX IF NOT EXISTS change_requests_one_pending
    ON profile_change_requests (customer_id, field, COALESCE(connection_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE status = 'Pending';

-- ---------------------------------------------------------------------
-- 3. Supabase only: keep the 2 new tables away from the public Data API (same as 07)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;
    ALTER TABLE public.account_codes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.account_codes, public.profile_change_requests FROM anon, authenticated;
END
$$;

-- ---------------------------------------------------------------------
-- 4. Existing database only (04_sample_data.sql already has these):
--    a) New admin login:  PUMSadmin / PUMS@dmin578  (the old admin123 was public)
--       tech.john and billing.officer get the same new password.
--       Only accounts that still have the OLD name/password are changed, so running
--       this file again never undoes a password you changed yourself.
--    b) Sample customers' emails end in @example.com, so a bill or code email
--       never goes to a real person by mistake. Only CUST-001 ... CUST-200
--       (the 200 sample customers) are changed; real sign-ups are not touched.
-- ---------------------------------------------------------------------
UPDATE users SET username = 'PUMSadmin', password_hash = '$2b$10$D5XbuCWsC50s/A9d8zdOTufMk7X2uUxnZiVmFxUb6tc2qpPlWlZva'
WHERE username = 'admin';
UPDATE users SET password_hash = '$2b$10$D5XbuCWsC50s/A9d8zdOTufMk7X2uUxnZiVmFxUb6tc2qpPlWlZva'
WHERE username IN ('tech.john', 'billing.officer')
  AND password_hash = '$2b$10$GvZ9mxL3i7kS/6aVq40m/u.dYGpH8H992AgFe1/R7rttaV5Y7PnwC';  -- the old admin123

UPDATE users u SET email = split_part(u.email, '@', 1) || '@example.com'
FROM customers c
WHERE (c.user_id = u.id OR u.customer_id = c.id)
  AND c.customer_number BETWEEN 'CUST-001' AND 'CUST-200'
  AND u.email !~* '@example\.com$';

UPDATE customers SET email = split_part(email, '@', 1) || '@example.com'
WHERE customer_number BETWEEN 'CUST-001' AND 'CUST-200'
  AND email IS NOT NULL AND email !~* '@example\.com$';
