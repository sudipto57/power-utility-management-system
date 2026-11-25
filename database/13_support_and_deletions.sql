-- =====================================================================
-- Power Utility Management System - 13_support_and_deletions.sql   (25 Nov 2026)
--
-- Run after 12_customer_inbox.sql. Safe to run more than once.
-- Adds TWO new tables (the original tables in 01 and 02 are not changed):
--
-- support_tickets: the "Support" form on the first page. Anybody (customer or not)
--   describes a problem, can attach one picture or PDF, and confirms their email
--   with a 4-digit code. Then the ticket is Open: it is emailed to the office
--   (pums.admins@gmail.com) and shows on the admin "Support" page. When an admin
--   marks it Solved, the person gets the admin's reply by email.
--
-- deleted_customers: the customer numbers an admin deleted for ever
--   ("Delete permanently" on the customer profile). Only the number is kept,
--   no name, phone or email. The backend uses this list to remove those
--   customers from database/04_sample_data.sql too.
-- =====================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) UNIQUE,              -- SUP-2026-001, given when the email is confirmed
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('Billing', 'Meter or reading', 'Power outage', 'Account or login', 'Website problem', 'Other')),
    subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    attachment_name VARCHAR(255),                  -- one picture (PNG, JPG) or PDF, at most 2 MB
    attachment_type VARCHAR(50),
    attachment_data BYTEA,
    status VARCHAR(20) NOT NULL DEFAULT 'Unverified'
        CHECK (status IN ('Unverified', 'Open', 'In Progress', 'Solved')),
    admin_reply TEXT,                              -- emailed to the person when the ticket is Solved
    code_hash VARCHAR(64),                         -- the 4-digit email code (only its SHA-256 hash)
    code_expires_at TIMESTAMP WITH TIME ZONE,
    code_attempts INTEGER NOT NULL DEFAULT 0,      -- wrong tries (blocked after 5)
    code_sent_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    solved_at TIMESTAMP WITH TIME ZONE,
    solved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS deleted_customers (
    customer_number VARCHAR(20) PRIMARY KEY,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Supabase only: keep the new tables away from the public Data API (same as 07, 09 ... 12)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.deleted_customers ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.support_tickets FROM anon, authenticated;
    REVOKE ALL ON TABLE public.deleted_customers FROM anon, authenticated;
END
$$;

-- Check: the newest support tickets
-- SELECT ticket_number, name, category, subject, status, created_at FROM support_tickets ORDER BY created_at DESC LIMIT 20;
