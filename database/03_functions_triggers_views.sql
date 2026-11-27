-- =====================================================================
-- Sparkility - Functions, Triggers and Views
-- (was 02_constraints.sql)  Run after 02_billing_tables.sql
--
-- What changed compared with the original file:
--   * calculate_bill_amount() rewritten (fixes #2 and #3):
--       - reads the tariffs + tariff_slabs tables instead of hard-coded numbers
--       - picks the tariff by customer type AND connection type
--       - first slab "0 to 50" now counts 50 units (was 51 = off-by-one)
--       - adds VAT (tariffs.tax_rate) and returns fixed, variable, tax, total
--   * customer_billing_summary view no longer double-counts a bill that has
--     more than one payment, and "outstanding" now subtracts partial payments.
--   Everything else is identical to the original.
-- =====================================================================

-- Additional constraints for data integrity

-- Ensure customer has at most one user account
ALTER TABLE users ADD CONSTRAINT unique_customer_user UNIQUE (customer_id);

-- Ensure meter readings are sequential for each connection
CREATE OR REPLACE FUNCTION check_reading_sequence()
RETURNS TRIGGER AS $$
DECLARE
    last_reading INTEGER;
BEGIN
    -- Get the last verified reading for this connection
    IF NEW.status = 'Verified' THEN
        SELECT current_reading INTO last_reading
        FROM meter_readings
        WHERE connection_id = NEW.connection_id
          AND status = 'Verified'
          AND id != NEW.id
        ORDER BY reading_date DESC, created_at DESC
        LIMIT 1;

        IF last_reading IS NOT NULL AND NEW.previous_reading != last_reading THEN
            RAISE EXCEPTION 'Previous reading (%) does not match last verified reading (%)', NEW.previous_reading, last_reading;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_reading_sequence
BEFORE INSERT OR UPDATE ON meter_readings
FOR EACH ROW EXECUTE FUNCTION check_reading_sequence();

-- Bill status auto-update based on payments
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(12,2);
    bill_total DECIMAL(12,2);
    new_status VARCHAR(20);
BEGIN
    -- Handle DELETE case (OLD.bill_id) and INSERT/UPDATE case (NEW.bill_id)
    IF (TG_OP = 'DELETE') THEN
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payments
        WHERE bill_id = OLD.bill_id AND status = 'Completed';

        SELECT total_amount INTO bill_total FROM bills WHERE id = OLD.bill_id;
    ELSE
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payments
        WHERE bill_id = NEW.bill_id AND status = 'Completed';

        SELECT total_amount INTO bill_total FROM bills WHERE id = NEW.bill_id;
    END IF;

    IF total_paid >= bill_total THEN
        new_status := 'Paid';
    ELSIF total_paid > 0 THEN
        new_status := 'Partially Paid';
    ELSE
        new_status := 'Unpaid';
    END IF;

    IF (TG_OP = 'DELETE') THEN
        UPDATE bills SET status = new_status, updated_at = NOW() WHERE id = OLD.bill_id;
    ELSE
        UPDATE bills SET status = new_status, updated_at = NOW() WHERE id = NEW.bill_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bill_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_bill_status();

-- Overdue bills check (the backend calls this before showing bills / dashboard)
CREATE OR REPLACE FUNCTION check_overdue_bills()
RETURNS VOID AS $$
BEGIN
    UPDATE bills
    SET status = 'Overdue', updated_at = NOW()
    WHERE status IN ('Unpaid', 'Partially Paid')
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create a view for customer billing summary
-- (fixed: bills and payments are added up separately, so nothing is counted twice)
CREATE VIEW customer_billing_summary AS
SELECT
    c.id as customer_id,
    c.customer_number,
    c.full_name,
    c.customer_type,
    COUNT(b.id) as total_bills,
    COUNT(b.id) FILTER (WHERE b.status IN ('Unpaid', 'Partially Paid', 'Overdue')) as unpaid_bills,
    COALESCE(SUM(b.total_amount), 0) as total_billed,
    COALESCE(SUM(b.total_amount - b.paid) FILTER (WHERE b.status IN ('Unpaid', 'Partially Paid', 'Overdue')), 0) as outstanding_amount,
    COALESCE(SUM(b.paid), 0) as total_paid
FROM customers c
LEFT JOIN connections co ON co.customer_id = c.id
LEFT JOIN (
    SELECT bi.id, bi.connection_id, bi.status, bi.total_amount,
           COALESCE((SELECT SUM(p.amount) FROM payments p
                     WHERE p.bill_id = bi.id AND p.status = 'Completed'), 0) AS paid
    FROM bills bi
) b ON b.connection_id = co.id
GROUP BY c.id, c.customer_number, c.full_name, c.customer_type;

-- Create a view for connection consumption history
CREATE VIEW connection_consumption AS
SELECT
    co.id as connection_id,
    co.meter_number,
    co.connection_type,
    c.customer_number,
    c.full_name as customer_name,
    mr.reading_date,
    mr.previous_reading,
    mr.current_reading,
    (mr.current_reading - mr.previous_reading) as consumption,
    mr.status
FROM meter_readings mr
JOIN connections co ON co.id = mr.connection_id
JOIN customers c ON c.id = co.customer_id
WHERE mr.status = 'Verified'
ORDER BY mr.reading_date DESC;

-- Remove the old 2-argument version of the bill function (if it exists)
DROP FUNCTION IF EXISTS calculate_bill_amount(VARCHAR, INTEGER);

-- Function to calculate a bill from the tariff tables
--   Example: SELECT * FROM calculate_bill_amount('Residential', 'Single Phase', 250);
--   -> fixed 150.00 | variable 1175.00 | tax 212.00 | total 1537.00
CREATE OR REPLACE FUNCTION calculate_bill_amount(
    p_customer_type   VARCHAR,
    p_connection_type VARCHAR,
    p_consumption     INTEGER
)
RETURNS TABLE(
    fixed_charge    DECIMAL(12,2),
    variable_charge DECIMAL(12,2),
    tax_amount      DECIMAL(12,2),
    total_amount    DECIMAL(12,2)
) AS $$
#variable_conflict use_column
DECLARE
    v_tariff_id UUID;
    v_fixed     DECIMAL(12,2);
    v_tax_rate  DECIMAL(5,2);
    v_variable  DECIMAL(12,2) := 0;
    v_tax       DECIMAL(12,2);
    v_remaining INTEGER := p_consumption;
    v_units     INTEGER;
    v_slab      RECORD;
BEGIN
    IF p_consumption IS NULL OR p_consumption < 0 THEN
        RAISE EXCEPTION 'Consumption must be 0 or more (got %)', p_consumption;
    END IF;

    -- 1. Find the active tariff for this customer type + connection type
    SELECT t.id, t.fixed_charge, t.tax_rate
      INTO v_tariff_id, v_fixed, v_tax_rate
    FROM tariffs t
    WHERE t.customer_type = p_customer_type
      AND t.connection_type = p_connection_type
      AND t.is_active = TRUE
      AND t.effective_from <= CURRENT_DATE
      AND (t.effective_to IS NULL OR t.effective_to >= CURRENT_DATE)
    ORDER BY t.effective_from DESC
    LIMIT 1;

    IF v_tariff_id IS NULL THEN
        RAISE EXCEPTION 'No active tariff found for % / %', p_customer_type, p_connection_type;
    END IF;

    -- 2. Walk through the slabs in order and charge the units that fall in each one
    FOR v_slab IN
        SELECT s.start_unit, s.end_unit, s.rate_per_unit
        FROM tariff_slabs s
        WHERE s.tariff_id = v_tariff_id
        ORDER BY s.slab_order
    LOOP
        EXIT WHEN v_remaining <= 0;

        IF v_slab.end_unit IS NULL THEN
            v_units := v_remaining;                       -- last slab: no upper limit
        ELSE
            -- slab "0-50" holds 50 units, "51-100" holds 50 units, "101-200" holds 100 units ...
            v_units := LEAST(v_remaining, v_slab.end_unit - GREATEST(v_slab.start_unit - 1, 0));
        END IF;

        v_variable  := v_variable + (v_units * v_slab.rate_per_unit);
        v_remaining := v_remaining - v_units;
    END LOOP;

    -- 3. VAT on (fixed + variable)
    v_tax := ROUND((v_fixed + v_variable) * v_tax_rate / 100, 2);

    RETURN QUERY SELECT v_fixed, ROUND(v_variable, 2), v_tax, v_fixed + ROUND(v_variable, 2) + v_tax;
END;
$$ LANGUAGE plpgsql;

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
