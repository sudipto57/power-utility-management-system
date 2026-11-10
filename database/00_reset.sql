-- =====================================================================
-- Power Utility Management System - 00_reset.sql
-- Removes ONLY this project's objects so all files can be re-run cleanly.
--
-- SAFE ON SUPABASE: it does NOT drop the "public" schema (Supabase needs it).
-- WARNING: all project data (customers, bills, ...) is deleted.
-- Run order: 00 -> 01 -> 02 -> 03 -> 04 -> (05 local only) -> 06 -> 07 (Supabase only)
-- =====================================================================

-- Views first
DROP VIEW IF EXISTS customer_billing_summary CASCADE;
DROP VIEW IF EXISTS connection_consumption CASCADE;

-- Tables (children first; CASCADE also removes their triggers and indexes)
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
