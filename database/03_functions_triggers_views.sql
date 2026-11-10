-- =====================================================================
-- Power Utility Management System - Functions, Triggers and Views
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
