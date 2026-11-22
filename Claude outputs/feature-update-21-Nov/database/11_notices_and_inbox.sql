-- =====================================================================
-- Power Utility Management System - 11_notices_and_inbox.sql   (21 Nov 2026)
--
-- Run after 10_auto_save.sql. Safe to run more than once.
-- Adds two NEW tables (the original tables in 01 and 02 are not changed):
--
-- 1. outage_notices: power cuts and maintenance work that staff announce.
--    A customer sees the notices for their area (the area name is found
--    in the customer's address, e.g. "Gazipur") and the "All areas" ones.
-- 2. notifications: the customer's inbox (the bell in the top bar).
--    The backend adds a row when something happens: a new bill, a payment
--    confirmed, a meter reading checked, a reply on a request, a notice,
--    or a reminder that a bill is due. Messages belong to the CUSTOMER, so a
--    customer who makes a login later still finds them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Outage and maintenance notices
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outage_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    notice_type VARCHAR(20) NOT NULL DEFAULT 'Outage' CHECK (notice_type IN ('Outage', 'Maintenance')),
    area VARCHAR(100) NOT NULL DEFAULT 'All areas',   -- a place name from the address, or 'All areas'
    message TEXT NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT notice_ends_after_start CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_outage_notices_ends_at ON outage_notices(ends_at);

-- ---------------------------------------------------------------------
-- 2. Customer inbox
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('bill', 'payment', 'reading', 'request', 'notice', 'reminder', 'profile')),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(200),             -- page to open in the website, e.g. /my/bills/<id>
    ref_id UUID,                   -- the bill, payment, ... it is about (used to avoid double reminders)
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_ref ON notifications(ref_id);

-- updated_at for notices (the same trigger function as the other tables, from 03)
DROP TRIGGER IF EXISTS update_outage_notices_updated_at ON outage_notices;
CREATE TRIGGER update_outage_notices_updated_at
BEFORE UPDATE ON outage_notices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 3. Supabase only: keep the new tables away from the public Data API (same as 07, 09 and 10)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;
    ALTER TABLE public.outage_notices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.outage_notices, public.notifications FROM anon, authenticated;
END
$$;

-- Check:
-- SELECT title, area, starts_at, ends_at FROM outage_notices ORDER BY starts_at DESC;
-- SELECT c.customer_number, n.kind, n.title, n.is_read FROM notifications n JOIN customers c ON c.id = n.customer_id ORDER BY n.created_at DESC LIMIT 20;
