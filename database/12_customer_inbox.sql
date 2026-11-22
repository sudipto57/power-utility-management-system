-- =====================================================================
-- Power Utility Management System - 12_customer_inbox.sql   (21 Nov 2026)
--
-- Run after 11_extra_features.sql. Safe to run more than once.
-- Adds ONE new table (the original tables in 01 and 02 are not changed):
--
-- notifications: the customer's inbox (the bell in the top bar).
--   The backend adds a row when something happens: a new bill, a payment
--   confirmed or not received, a meter reading accepted or rejected, a reply
--   on a request, an outage notice for their area, a profile change answer,
--   or a reminder that a bill is due. Messages belong to the CUSTOMER, so a
--   customer who makes a login later still finds them.
-- =====================================================================

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

-- ---------------------------------------------------------------------
-- Supabase only: keep the new table away from the public Data API (same as 07, 09, 10 and 11)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
END
$$;

-- Check: the newest messages
-- SELECT c.customer_number, n.kind, n.title, n.is_read FROM notifications n JOIN customers c ON c.id = n.customer_id ORDER BY n.created_at DESC LIMIT 20;
