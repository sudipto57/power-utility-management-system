-- =====================================================================
-- Sparkility - 14_profile_photos.sql   (27 Nov 2026)
--
-- Run after 13_support_and_deletions.sql. Safe to run more than once.
-- Adds ONE new table (the original tables in 01 and 02 are not changed):
--
-- customer_photos: the profile picture of a customer (one picture per customer).
--   An admin sets it on the customer profile page; a customer sets it on My Profile.
--   The website makes the picture a small square JPEG (about 30-80 KB) before sending it.
--   ON DELETE CASCADE: when a customer is deleted, the picture goes with them.
-- =====================================================================

CREATE TABLE IF NOT EXISTS customer_photos (
    customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    photo_type VARCHAR(20) NOT NULL CHECK (photo_type IN ('image/jpeg', 'image/png', 'image/webp')),
    photo_data BYTEA NOT NULL CHECK (octet_length(photo_data) <= 300000), -- 300 KB at most
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Supabase only: keep the new table away from the public Data API (same as 07, 09 ... 13)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;
    ALTER TABLE public.customer_photos ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.customer_photos FROM anon, authenticated;
END
$$;

-- Check: which customers have a picture, and how big it is
-- SELECT c.customer_number, c.full_name, p.photo_type, octet_length(p.photo_data) AS bytes, p.updated_at
-- FROM customer_photos p JOIN customers c ON c.id = p.customer_id ORDER BY p.updated_at DESC;
