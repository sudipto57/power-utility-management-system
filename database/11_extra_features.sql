-- =====================================================================
-- Power Utility Management System - 11_extra_features.sql   (20 Nov 2026)
--
-- Six extra database features (+ one fix). Run after 10_auto_save.sql.
-- Safe to run more than once, on Supabase and on a local PostgreSQL.
--
--   1. Activity log ............ table audit_log + trigger log_change()
--   2. Account statement ....... view customer_statement (running balance, window function)
--   3. Unusual usage alerts .... view unusual_readings (moving average, window functions)
--   4. Automatic late fees ..... apply_late_fees() + view bill_balance (uses bill_adjustments)
--   5. Outage notices .......... table outage_notices + view current_outage_notices
--   6. Meter replacement ....... table meter_replacements + function replace_meter()
--   7. Fix: a bill uses the tariff of its billing period, not today's tariff
--
-- The team's original tables are NOT changed (no column is added, removed or renamed).
-- It ADDS 3 new tables: audit_log, outage_notices, meter_replacements.
-- =====================================================================


-- =====================================================================
-- 1. ACTIVITY LOG: who changed what, and when
--    One row per INSERT / UPDATE / DELETE on the important tables.
--    For an UPDATE only the columns that really changed are saved.
--    The backend tells the database who is logged in with
--        SELECT set_config('app.user_id', '<user id>', true);
--    inside the same transaction (see backend/src/config/db.js).
--    Changes made by the database itself (e.g. a bill turning Overdue)
--    or in pgAdmin have no user: the website shows them as "System".
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,   -- 1, 2, 3 ... in the order things happened
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,                              -- id of the changed row
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_values JSONB,                                     -- NULL for INSERT
    new_values JSONB,                                     -- NULL for DELETE
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);

CREATE OR REPLACE FUNCTION log_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old  JSONB;
    v_new  JSONB;
    v_key  TEXT;
    v_user UUID;
BEGIN
    -- 04_sample_data.sql switches the log off while it loads thousands of sample rows
    IF current_setting('app.skip_audit', true) = 'on' THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
    ELSE
        -- UPDATE: keep only the columns whose value changed
        v_old := '{}';
        v_new := '{}';
        FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
            CONTINUE WHEN v_key = 'updated_at';
            IF to_jsonb(OLD) -> v_key IS DISTINCT FROM to_jsonb(NEW) -> v_key THEN
                v_old := v_old || jsonb_build_object(v_key, to_jsonb(OLD) -> v_key);
                v_new := v_new || jsonb_build_object(v_key, to_jsonb(NEW) -> v_key);
            END IF;
        END LOOP;
        IF v_new = '{}' THEN
            RETURN NULL;                     -- nothing real changed: nothing to log
        END IF;
    END IF;

    -- Who is logged in (only if that login really exists)
    SELECT u.id INTO v_user
    FROM users u
    WHERE u.id::text = NULLIF(current_setting('app.user_id', true), '');

    INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    VALUES (TG_TABLE_NAME,
            CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
            TG_OP, v_user, v_old, v_new);
    RETURN NULL;                             -- AFTER trigger: the return value is not used
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 4a. LATE FEES: the amount a customer owes for one bill
--     amount due = bill total + late fee - waiver ...   (bill_adjustments)
--     (Comes before part 2 because the statement and the reports use it.)
--
--     Sign rule for bill_adjustments.amount:
--       Penalty            -> more than 0 (the customer owes more)
--       Discount / Waiver / Rebate -> less than 0 (the customer owes less)
--       Correction         -> either way, but not 0
-- =====================================================================
ALTER TABLE bill_adjustments DROP CONSTRAINT IF EXISTS bill_adjustments_sign;
ALTER TABLE bill_adjustments ADD CONSTRAINT bill_adjustments_sign CHECK (
       (adjustment_type = 'Penalty' AND amount > 0)
    OR (adjustment_type IN ('Discount', 'Waiver', 'Rebate') AND amount < 0)
    OR (adjustment_type = 'Correction' AND amount <> 0)
);

-- At most ONE late fee and ONE waiver per bill (also stops a double fee if two
-- people open the website at the same moment)
CREATE UNIQUE INDEX IF NOT EXISTS bill_adjustments_one_late_fee
    ON bill_adjustments(bill_id) WHERE adjustment_type = 'Penalty';
CREATE UNIQUE INDEX IF NOT EXISTS bill_adjustments_one_waiver
    ON bill_adjustments(bill_id) WHERE adjustment_type = 'Waiver';

CREATE OR REPLACE VIEW bill_balance
WITH (security_invoker = true) AS
SELECT b.id AS bill_id,
       b.total_amount,
       COALESCE(a.late_fee, 0)                                      AS late_fee,
       COALESCE(a.waived, 0)                                        AS waived,
       b.total_amount + COALESCE(a.adjustments, 0)                  AS amount_due,
       COALESCE(p.paid, 0)                                          AS paid_amount,
       GREATEST(b.total_amount + COALESCE(a.adjustments, 0) - COALESCE(p.paid, 0), 0) AS balance
FROM bills b
LEFT JOIN (
    SELECT bill_id,
           SUM(amount)                                               AS adjustments,
           SUM(amount) FILTER (WHERE adjustment_type = 'Penalty')    AS late_fee,
           -SUM(amount) FILTER (WHERE adjustment_type = 'Waiver')    AS waived
    FROM bill_adjustments
    GROUP BY bill_id
) a ON a.bill_id = b.id
LEFT JOIN (
    SELECT bill_id, SUM(amount) AS paid
    FROM payments
    WHERE status = 'Completed'
    GROUP BY bill_id
) p ON p.bill_id = b.id;

-- Works out ONE bill's status from what is owed, what is paid and the due date
CREATE OR REPLACE FUNCTION refresh_bill_status(p_bill_id UUID)
RETURNS VOID AS $$
DECLARE
    v_amount_due DECIMAL(12,2);
    v_paid       DECIMAL(12,2);
    v_due_date   DATE;
    v_status     VARCHAR(20);
BEGIN
    SELECT b.total_amount + COALESCE((SELECT SUM(a.amount) FROM bill_adjustments a WHERE a.bill_id = b.id), 0),
           b.due_date
      INTO v_amount_due, v_due_date
    FROM bills b
    WHERE b.id = p_bill_id;

    IF NOT FOUND THEN
        RETURN;                                -- the bill itself is being deleted
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM payments
    WHERE bill_id = p_bill_id AND status = 'Completed';

    IF v_paid >= v_amount_due THEN
        v_status := 'Paid';
    ELSIF v_due_date < CURRENT_DATE THEN
        v_status := 'Overdue';
    ELSIF v_paid > 0 THEN
        v_status := 'Partially Paid';
    ELSE
        v_status := 'Unpaid';
    END IF;

    -- only write when the status really changes
    UPDATE bills SET status = v_status
    WHERE id = p_bill_id AND status IS DISTINCT FROM v_status;
END;
$$ LANGUAGE plpgsql;

-- The payment trigger from 03 now counts late fees too. It also runs for
-- bill_adjustments (both tables have a bill_id column), so adding or waiving
-- a late fee updates the bill's status straight away.
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    v_bill_id UUID;
BEGIN
    FOR v_bill_id IN
        SELECT DISTINCT x FROM unnest(ARRAY[
            CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.bill_id END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.bill_id END
        ]) AS x WHERE x IS NOT NULL
    LOOP
        PERFORM refresh_bill_status(v_bill_id);
    END LOOP;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bill_status_adjustments ON bill_adjustments;
CREATE TRIGGER trigger_update_bill_status_adjustments
AFTER INSERT OR UPDATE OR DELETE ON bill_adjustments
FOR EACH ROW EXECUTE FUNCTION update_bill_status();

-- 4b. Adds a one-time late fee to every Overdue bill that does not have one yet.
--     The fee is p_percent % of what was still unpaid (default 5 %).
--     Returns how many late fees were added.
CREATE OR REPLACE FUNCTION apply_late_fees(p_percent NUMERIC DEFAULT 5)
RETURNS INTEGER AS $$
DECLARE
    v_added INTEGER;
BEGIN
    INSERT INTO bill_adjustments (bill_id, adjustment_type, amount, reason)
    SELECT b.id,
           'Penalty',
           ROUND(bb.balance * p_percent / 100, 2),
           'Late fee: ' || TRIM(TO_CHAR(p_percent, 'FM990.##'), '.') || ' % of the unpaid amount, not paid by '
               || TO_CHAR(b.due_date, 'DD Mon YYYY')
    FROM bills b
    JOIN bill_balance bb ON bb.bill_id = b.id
    WHERE b.status = 'Overdue'
      AND ROUND(bb.balance * p_percent / 100, 2) >= 0.01
      AND NOT EXISTS (SELECT 1 FROM bill_adjustments a WHERE a.bill_id = b.id AND a.adjustment_type = 'Penalty')
    ON CONFLICT (bill_id) WHERE adjustment_type = 'Penalty' DO NOTHING;

    GET DIAGNOSTICS v_added = ROW_COUNT;
    RETURN v_added;
END;
$$ LANGUAGE plpgsql;

-- The overdue check from 03 (the backend already calls it before showing bills)
-- now also adds the late fees.
CREATE OR REPLACE FUNCTION check_overdue_bills()
RETURNS VOID AS $$
BEGIN
    UPDATE bills
    SET status = 'Overdue'
    WHERE status IN ('Unpaid', 'Partially Paid')
      AND due_date < CURRENT_DATE;

    PERFORM apply_late_fees();
END;
$$ LANGUAGE plpgsql;

-- The report view from 03, now with late fees in "billed" and "outstanding"
-- (same columns as before, so the Reports page keeps working)
CREATE OR REPLACE VIEW customer_billing_summary
WITH (security_invoker = true) AS
SELECT
    c.id AS customer_id,
    c.customer_number,
    c.full_name,
    c.customer_type,
    COUNT(b.id) AS total_bills,
    COUNT(b.id) FILTER (WHERE b.status IN ('Unpaid', 'Partially Paid', 'Overdue')) AS unpaid_bills,
    COALESCE(SUM(bb.amount_due), 0) AS total_billed,
    COALESCE(SUM(bb.balance) FILTER (WHERE b.status IN ('Unpaid', 'Partially Paid', 'Overdue')), 0) AS outstanding_amount,
    COALESCE(SUM(bb.paid_amount), 0) AS total_paid
FROM customers c
LEFT JOIN connections co ON co.customer_id = c.id
LEFT JOIN bills b ON b.connection_id = co.id
LEFT JOIN bill_balance bb ON bb.bill_id = b.id
GROUP BY c.id, c.customer_number, c.full_name, c.customer_type;


-- =====================================================================
-- 2. ACCOUNT STATEMENT: every bill, late fee and payment of a customer,
--    in date order, with the running balance (like a bank statement).
--    SUM(...) OVER (...) is a window function: it adds up all the rows
--    up to and including the current one, separately for each customer.
--      SELECT * FROM customer_statement WHERE customer_number = 'CUST-011';
-- =====================================================================
-- Which meter a connection had on a date. After a meter replacement the connection shows the NEW
-- number, so older readings and bills look up the old number in meter_replacements:
-- the old number of the first replacement on or after that date, else the current number.
-- (The old meter's final reading is dated the replacement day, so "on or after" is right.)
--   SELECT meter_number_on(id, '2026-06-01') FROM connections LIMIT 1;
CREATE OR REPLACE FUNCTION meter_number_on(p_connection_id UUID, p_date DATE)
RETURNS VARCHAR AS $$
DECLARE
    v_meter VARCHAR;
BEGIN
    SELECT old_meter_number INTO v_meter
    FROM meter_replacements
    WHERE connection_id = p_connection_id AND replaced_on >= p_date
    ORDER BY replaced_on
    LIMIT 1;

    IF v_meter IS NULL THEN
        SELECT meter_number INTO v_meter FROM connections WHERE id = p_connection_id;
    END IF;
    RETURN v_meter;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE VIEW customer_statement
WITH (security_invoker = true) AS
WITH entries AS (
    -- a bill: the customer owes more (dated the day of the reading it came from)
    SELECT co.customer_id,
           b.billing_period_end + 1                AS entry_date,
           1                                       AS sort_order,
           'Bill'::VARCHAR(30)                     AS entry_type,
           b.bill_number                           AS reference,
           b.id                                    AS bill_id,
           'Electricity ' || TO_CHAR(b.billing_period_end, 'Mon YYYY') || ', meter '
               || meter_number_on(co.id, b.billing_period_end) AS description,
           b.total_amount                          AS debit,
           0::DECIMAL(12,2)                        AS credit
    FROM bills b
    JOIN connections co ON co.id = b.connection_id

    UNION ALL
    -- a late fee (dated the day after the due date) or a waiver / discount
    SELECT co.customer_id,
           CASE WHEN a.adjustment_type = 'Penalty' THEN b.due_date + 1 ELSE a.created_at::date END,
           2,
           CASE WHEN a.adjustment_type = 'Penalty' THEN 'Late fee' ELSE a.adjustment_type END,
           b.bill_number,
           b.id,
           a.reason,
           GREATEST(a.amount, 0),
           GREATEST(-a.amount, 0)
    FROM bill_adjustments a
    JOIN bills b ON b.id = a.bill_id
    JOIN connections co ON co.id = b.connection_id

    UNION ALL
    -- a payment: the customer owes less
    SELECT co.customer_id,
           p.payment_date,
           3,
           'Payment',
           p.payment_number,
           b.id,
           p.method || ' for ' || b.bill_number,
           0,
           p.amount
    FROM payments p
    JOIN bills b ON b.id = p.bill_id
    JOIN connections co ON co.id = b.connection_id
    WHERE p.status = 'Completed'
)
SELECT c.customer_number,
       e.*,
       SUM(e.debit - e.credit) OVER (
           PARTITION BY e.customer_id
           ORDER BY e.entry_date, e.sort_order, e.reference
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS balance
FROM entries e
JOIN customers c ON c.id = e.customer_id;


-- =====================================================================
-- 3. UNUSUAL USAGE ALERTS: a reading whose usage per day is more than
--    double, or less than a third, of that meter's average over its
--    previous 3 readings. Catches typing mistakes and meter problems
--    before a wrong bill goes out.
--    Usage is compared PER DAY, so a short or long reading period
--    (e.g. the day a meter was replaced) does not cause a false alarm.
--    LAG() and AVG() OVER (... 3 PRECEDING ...) are window functions.
--      SELECT * FROM unusual_readings;
-- =====================================================================
CREATE OR REPLACE VIEW unusual_readings
WITH (security_invoker = true) AS
WITH usage AS (
    SELECT mr.id AS reading_id,
           mr.connection_id,
           mr.reading_date,
           mr.current_reading - mr.previous_reading AS consumption,
           mr.reading_date - LAG(mr.reading_date) OVER (PARTITION BY mr.connection_id ORDER BY mr.reading_date) AS days
    FROM meter_readings mr
    WHERE mr.status = 'Verified'
), per_day AS (
    SELECT u.*, ROUND(u.consumption::numeric / u.days, 2) AS daily_usage
    FROM usage u
    WHERE u.days > 0                          -- the very first reading has nothing to compare with
), compared AS (
    SELECT d.*,
           ROUND(AVG(d.daily_usage) OVER last_three, 2) AS usual_daily_usage,
           COUNT(*) OVER last_three                    AS readings_compared
    FROM per_day d
    WINDOW last_three AS (PARTITION BY d.connection_id ORDER BY d.reading_date
                          ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING)
)
SELECT x.reading_id,
       x.connection_id,
       meter_number_on(co.id, x.reading_date)::VARCHAR(20) AS meter_number,
       cu.id AS customer_id,
       cu.customer_number,
       cu.full_name AS customer_name,
       x.reading_date,
       x.days,
       x.consumption,
       x.daily_usage,
       x.usual_daily_usage,
       ROUND(x.daily_usage / x.usual_daily_usage, 1) AS times_usual,
       CASE WHEN x.daily_usage > 2 * x.usual_daily_usage THEN 'Very high' ELSE 'Very low' END AS alert
FROM compared x
JOIN connections co ON co.id = x.connection_id
JOIN customers cu ON cu.id = co.customer_id
WHERE x.readings_compared >= 2                -- needs some history first
  AND x.usual_daily_usage > 0
  AND (x.daily_usage > 2 * x.usual_daily_usage OR x.daily_usage < x.usual_daily_usage / 3);


-- =====================================================================
-- 5. OUTAGE NOTICES: planned power cuts posted by the office.
--    The news strip on the website shows the ones that have not ended yet.
-- =====================================================================
CREATE TABLE IF NOT EXISTS outage_notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(120) NOT NULL,
    area VARCHAR(150) NOT NULL,                 -- e.g. 'Mirpur 10, Dhaka'
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    details TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT outage_notices_valid_times CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_outage_notices_ends_at ON outage_notices(ends_at);
CREATE INDEX IF NOT EXISTS idx_outage_notices_created_by ON outage_notices(created_by);

DROP TRIGGER IF EXISTS update_outage_notices_updated_at ON outage_notices;
CREATE TRIGGER update_outage_notices_updated_at BEFORE UPDATE ON outage_notices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW current_outage_notices
WITH (security_invoker = true) AS
SELECT o.id, o.title, o.area, o.starts_at, o.ends_at, o.details,
       CASE WHEN o.starts_at <= NOW() THEN 'Happening now' ELSE 'Planned' END AS state
FROM outage_notices o
WHERE o.ends_at > NOW()
ORDER BY o.starts_at;


-- =====================================================================
-- 6. METER REPLACEMENT: a broken meter is swapped for a new one.
--    The connection (and the customer's bills) stay the same; only the
--    meter changes. The old meter's last reading is saved as a normal
--    reading (so those units are still billed), then the new meter
--    starts from its own reading (usually 0).
-- =====================================================================
CREATE TABLE IF NOT EXISTS meter_replacements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    old_meter_number VARCHAR(20) NOT NULL,
    new_meter_number VARCHAR(20) NOT NULL,
    old_meter_final_reading INTEGER NOT NULL CHECK (old_meter_final_reading >= 0),
    new_meter_start_reading INTEGER NOT NULL DEFAULT 0 CHECK (new_meter_start_reading >= 0),
    replaced_on DATE NOT NULL,
    reason TEXT,
    replaced_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT meter_replacements_different_meter CHECK (old_meter_number <> new_meter_number),
    CONSTRAINT meter_replacements_one_per_day UNIQUE (connection_id, replaced_on)
);
CREATE INDEX IF NOT EXISTS idx_meter_replacements_replaced_by ON meter_replacements(replaced_by);

-- The reading the NEXT reading must start from:
--   * normally the last verified reading
--   * but if the meter was replaced on/after that day, the new meter's start reading
--   * NULL if the meter has no reading yet
-- p_skip_reading_id: leave this reading out (used when a reading is being updated)
CREATE OR REPLACE FUNCTION expected_previous_reading(p_connection_id UUID, p_skip_reading_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_last_value INTEGER;
    v_last_date  DATE;
    v_start      INTEGER;
    v_replaced   DATE;
BEGIN
    SELECT current_reading, reading_date INTO v_last_value, v_last_date
    FROM meter_readings
    WHERE connection_id = p_connection_id
      AND status = 'Verified'
      AND (p_skip_reading_id IS NULL OR id <> p_skip_reading_id)
    ORDER BY reading_date DESC, created_at DESC
    LIMIT 1;

    SELECT new_meter_start_reading, replaced_on INTO v_start, v_replaced
    FROM meter_replacements
    WHERE connection_id = p_connection_id
    ORDER BY replaced_on DESC
    LIMIT 1;

    IF v_replaced IS NOT NULL AND (v_last_date IS NULL OR v_replaced >= v_last_date) THEN
        RETURN v_start;
    END IF;
    RETURN v_last_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- The reading-sequence trigger from 03, now aware of meter replacements
CREATE OR REPLACE FUNCTION check_reading_sequence()
RETURNS TRIGGER AS $$
DECLARE
    v_expected INTEGER;
BEGIN
    IF NEW.status = 'Verified' THEN
        v_expected := expected_previous_reading(NEW.connection_id, NEW.id);
        IF v_expected IS NOT NULL AND NEW.previous_reading <> v_expected THEN
            RAISE EXCEPTION 'Previous reading (%) does not match the last verified reading (%)', NEW.previous_reading, v_expected;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Does the whole replacement in one go (inside the caller's transaction):
--   1. saves the old meter's final reading   2. logs the replacement   3. puts the new number on the connection
-- Returns the id of the new meter_replacements row.
--   SELECT replace_meter(<connection id>, 'MET-0999', 15230, 0, CURRENT_DATE, 'Display broken', NULL);
CREATE OR REPLACE FUNCTION replace_meter(
    p_connection_id   UUID,
    p_new_meter       VARCHAR,
    p_final_reading   INTEGER,
    p_start_reading   INTEGER,
    p_replaced_on     DATE,
    p_reason          TEXT,
    p_user_id         UUID
)
RETURNS UUID AS $$
DECLARE
    v_connection  RECORD;
    v_previous    INTEGER;
    v_last_date   DATE;
    v_id          UUID;
BEGIN
    SELECT id, meter_number, status INTO v_connection
    FROM connections WHERE id = p_connection_id
    FOR UPDATE;                                     -- nobody else changes this meter meanwhile

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Connection not found';
    END IF;
    IF v_connection.status <> 'Active' THEN
        RAISE EXCEPTION 'Only an Active connection can get a new meter (this one is %)', v_connection.status;
    END IF;
    IF p_new_meter IS NULL OR TRIM(p_new_meter) = '' OR UPPER(TRIM(p_new_meter)) = v_connection.meter_number THEN
        RAISE EXCEPTION 'The new meter number must be different from the old one (%)', v_connection.meter_number;
    END IF;
    IF p_replaced_on > CURRENT_DATE + 1 THEN
        RAISE EXCEPTION 'Replacement date cannot be in the future';
    END IF;

    SELECT MAX(reading_date) INTO v_last_date
    FROM meter_readings WHERE connection_id = p_connection_id AND status = 'Verified';
    IF v_last_date IS NOT NULL AND p_replaced_on <= v_last_date THEN
        RAISE EXCEPTION 'Replacement date must be after the last reading (%)', TO_CHAR(v_last_date, 'DD Mon YYYY');
    END IF;

    v_previous := COALESCE(expected_previous_reading(p_connection_id), 0);
    IF p_final_reading < v_previous THEN
        RAISE EXCEPTION 'The old meter''s final reading (%) cannot be lower than its last reading (%)', p_final_reading, v_previous;
    END IF;

    -- 1. the old meter's last reading (billed like any other reading)
    INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, notes, recorded_by)
    VALUES (p_connection_id, v_previous, p_final_reading, p_replaced_on, 'Verified',
            'Final reading of old meter ' || v_connection.meter_number || ' (replaced)', p_user_id);

    -- 2. the history row
    INSERT INTO meter_replacements (connection_id, old_meter_number, new_meter_number, old_meter_final_reading,
                                    new_meter_start_reading, replaced_on, reason, replaced_by)
    VALUES (p_connection_id, v_connection.meter_number, UPPER(TRIM(p_new_meter)), p_final_reading,
            COALESCE(p_start_reading, 0), p_replaced_on, p_reason, p_user_id)
    RETURNING id INTO v_id;

    -- 3. the new meter number on the connection
    UPDATE connections SET meter_number = UPPER(TRIM(p_new_meter)) WHERE id = p_connection_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 7. FIX: the bill uses the tariff that was in force on the billing date
--    (before, it always used TODAY's tariff, so re-making an old month's
--    bill after a tariff change gave the new price).
--    calculate_bill_amount(type, connection type, units, DATE) is new.
--    The 3-value version still works and means "today".
--    Tip: when a tariff changes, give the old one an effective_to date and
--    keep it active, so old months still find it.
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_bill_amount(
    p_customer_type   VARCHAR,
    p_connection_type VARCHAR,
    p_consumption     INTEGER,
    p_on_date         DATE
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

    -- 1. The tariff in force on p_on_date. If the date is older than every tariff,
    --    use the oldest one (so a very early reading can still be billed).
    SELECT t.id, t.fixed_charge, t.tax_rate
      INTO v_tariff_id, v_fixed, v_tax_rate
    FROM tariffs t
    WHERE t.customer_type = p_customer_type
      AND t.connection_type = p_connection_type
      AND t.is_active = TRUE
      AND (t.effective_to IS NULL OR t.effective_to >= COALESCE(p_on_date, CURRENT_DATE))
    ORDER BY (t.effective_from <= COALESCE(p_on_date, CURRENT_DATE)) DESC,   -- in force on that date first
             CASE WHEN t.effective_from <= COALESCE(p_on_date, CURRENT_DATE) THEN t.effective_from END DESC,
             t.effective_from ASC
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
            v_units := v_remaining;
        ELSE
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

-- The old 3-value version now just asks for today's tariff
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
    SELECT * FROM calculate_bill_amount(p_customer_type, p_connection_type, p_consumption, CURRENT_DATE);
$$ LANGUAGE sql;


-- =====================================================================
-- 8. Switch the activity log on for the important tables
-- =====================================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'customers', 'connections', 'meter_readings', 'bills', 'payments',
        'service_requests', 'bill_adjustments', 'outage_notices', 'meter_replacements'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON %I', t, t);
        EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I
                        FOR EACH ROW EXECUTE FUNCTION log_change()', t, t);
    END LOOP;
END
$$;


-- =====================================================================
-- 9. Fixed search_path for the new functions (Supabase Security Advisor)
-- =====================================================================
ALTER FUNCTION log_change() SET search_path = public, pg_temp;
ALTER FUNCTION refresh_bill_status(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION update_bill_status() SET search_path = public, pg_temp;
ALTER FUNCTION apply_late_fees(NUMERIC) SET search_path = public, pg_temp;
ALTER FUNCTION check_overdue_bills() SET search_path = public, pg_temp;
ALTER FUNCTION expected_previous_reading(UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION meter_number_on(UUID, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION check_reading_sequence() SET search_path = public, pg_temp;
ALTER FUNCTION replace_meter(UUID, VARCHAR, INTEGER, INTEGER, DATE, TEXT, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION calculate_bill_amount(VARCHAR, VARCHAR, INTEGER, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION calculate_bill_amount(VARCHAR, VARCHAR, INTEGER) SET search_path = public, pg_temp;


-- =====================================================================
-- 10. Supabase only: keep the new tables, views and functions away from
--     the public Data API (same as 07, 09 and 10)
-- =====================================================================
DO $$
DECLARE
    f TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RAISE NOTICE 'Not a Supabase database - skipping the Supabase part.';
        RETURN;
    END IF;

    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.outage_notices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.meter_replacements ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.audit_log, public.outage_notices, public.meter_replacements FROM anon, authenticated;
    REVOKE ALL ON public.bill_balance, public.customer_statement, public.unusual_readings,
                  public.current_outage_notices, public.customer_billing_summary FROM anon, authenticated;

    FOREACH f IN ARRAY ARRAY[
        'public.log_change()', 'public.refresh_bill_status(uuid)', 'public.apply_late_fees(numeric)',
        'public.expected_previous_reading(uuid, uuid)', 'public.meter_number_on(uuid, date)',
        'public.replace_meter(uuid, varchar, integer, integer, date, text, uuid)',
        'public.calculate_bill_amount(varchar, varchar, integer, date)',
        'public.calculate_bill_amount(varchar, varchar, integer)'
    ]
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    END LOOP;
END
$$;


-- =====================================================================
-- Try it (pgAdmin -> Query Tool):
--   SELECT * FROM audit_log ORDER BY id DESC LIMIT 20;
--   SELECT * FROM customer_statement WHERE customer_number = 'CUST-011' ORDER BY entry_date, sort_order;
--   SELECT * FROM unusual_readings ORDER BY reading_date DESC;
--   SELECT check_overdue_bills();  SELECT * FROM bill_balance WHERE late_fee > 0;
--   SELECT * FROM current_outage_notices;
--   SELECT * FROM calculate_bill_amount('Residential', 'Single Phase', 250, '2026-07-31');
-- =====================================================================
