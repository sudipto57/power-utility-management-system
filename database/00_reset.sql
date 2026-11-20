-- =====================================================================
-- Power Utility Management System - 00_reset.sql
-- Removes ONLY this project's objects so all files can be re-run cleanly.
--
-- SAFE ON SUPABASE: it does NOT drop the "public" schema (Supabase needs it).
-- WARNING: all project data (customers, bills, ...) is deleted.
-- Run order: 00 -> 01 -> 02 -> 03 -> 04 -> (05 local only) -> 06 -> 07 (Supabase only) -> 09 -> 10 -> 11
-- =====================================================================

-- Views first
DROP VIEW IF EXISTS customer_statement CASCADE;        -- from 11
DROP VIEW IF EXISTS unusual_readings CASCADE;          -- from 11
DROP VIEW IF EXISTS current_outage_notices CASCADE;    -- from 11
DROP VIEW IF EXISTS bill_balance CASCADE;              -- from 11
DROP VIEW IF EXISTS customers_in_order CASCADE;        -- from 10
DROP VIEW IF EXISTS customer_billing_summary CASCADE;
DROP VIEW IF EXISTS connection_consumption CASCADE;

-- Tables (children first; CASCADE also removes their triggers and indexes)
DROP TABLE IF EXISTS audit_log CASCADE;                -- from 11
DROP TABLE IF EXISTS outage_notices CASCADE;           -- from 11
DROP TABLE IF EXISTS meter_replacements CASCADE;       -- from 11
DROP TABLE IF EXISTS sql_file_saves CASCADE;           -- from 10
DROP TABLE IF EXISTS profile_change_requests CASCADE;  -- from 09
DROP TABLE IF EXISTS account_codes CASCADE;            -- from 09
DROP TABLE IF EXISTS meter_reading_schedules CASCADE;
DROP TABLE IF EXISTS bill_installments CASCADE;
DROP TABLE IF EXISTS bill_adjustments CASCADE;
DROP TABLE IF EXISTS tariff_slabs CASCADE;
DROP TABLE IF EXISTS tariffs CASCADE;
DROP TABLE IF EXISTS service_request_comments CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS check_reading_sequence() CASCADE;
DROP FUNCTION IF EXISTS update_bill_status() CASCADE;
DROP FUNCTION IF EXISTS check_overdue_bills() CASCADE;
DROP FUNCTION IF EXISTS calculate_bill_amount(VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_bill_amount(VARCHAR, VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_bill_amount(VARCHAR, VARCHAR, INTEGER, DATE) CASCADE;   -- from 11
DROP FUNCTION IF EXISTS log_change() CASCADE;                                             -- from 11
DROP FUNCTION IF EXISTS refresh_bill_status(UUID) CASCADE;                                -- from 11
DROP FUNCTION IF EXISTS apply_late_fees(NUMERIC) CASCADE;                                 -- from 11
DROP FUNCTION IF EXISTS expected_previous_reading(UUID, UUID) CASCADE;                    -- from 11
DROP FUNCTION IF EXISTS replace_meter(UUID, VARCHAR, INTEGER, INTEGER, DATE, TEXT, UUID) CASCADE;  -- from 11
