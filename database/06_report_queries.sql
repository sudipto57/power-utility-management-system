-- =====================================================================
-- Sparkility - 06_report_queries.sql
-- The SQL behind the Dashboard and Reports pages.
-- These are SELECT-only practice queries: run any of them in pgAdmin's
-- Query Tool to see the same numbers the website shows. Nothing is changed.
-- =====================================================================

-- Keep Overdue status up to date first (the backend does this too)
SELECT check_overdue_bills();

-- 1. Dashboard: the main numbers -----------------------------------------
SELECT
    (SELECT COUNT(*) FROM customers)                                   AS total_customers,
    (SELECT COUNT(*) FROM customers WHERE status = 'Active')           AS active_customers,
    (SELECT COUNT(*) FROM connections WHERE status = 'Active')         AS active_connections,
    (SELECT COUNT(*) FROM bills WHERE status IN ('Unpaid', 'Partially Paid', 'Overdue')) AS unpaid_bills,
    (SELECT COUNT(*) FROM service_requests WHERE status IN ('Pending', 'In Progress'))   AS open_requests;

-- 2. Dashboard: billed vs collected for the last 6 months ----------------
SELECT to_char(m, 'Mon YYYY') AS month,
       COALESCE((SELECT SUM(b.total_amount) FROM bills b
                 WHERE date_trunc('month', b.billing_period_start) = m), 0) AS billed,
       COALESCE((SELECT SUM(p.amount) FROM payments p
                 WHERE p.status = 'Completed' AND date_trunc('month', p.payment_date) = m), 0) AS collected
FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                     date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS m
ORDER BY m;

-- 3. Dashboard: recent activity (UNION ALL of the latest events) ---------
SELECT * FROM (
    SELECT 'bill' AS type, b.bill_number AS title, c.full_name AS customer, b.created_at AS happened_at
    FROM bills b JOIN connections co ON co.id = b.connection_id JOIN customers c ON c.id = co.customer_id
    UNION ALL
    SELECT 'payment', p.payment_number, c.full_name, p.created_at
    FROM payments p JOIN bills b ON b.id = p.bill_id
    JOIN connections co ON co.id = b.connection_id JOIN customers c ON c.id = co.customer_id
    UNION ALL
    SELECT 'request', r.request_number, c.full_name, r.created_at
    FROM service_requests r JOIN customers c ON c.id = r.customer_id
) activity
ORDER BY happened_at DESC
LIMIT 10;

-- 4. Customer report: how many of each type, and how many active ---------
SELECT customer_type, COUNT(*) AS customers, COUNT(*) FILTER (WHERE status = 'Active') AS active
FROM customers
GROUP BY customer_type
ORDER BY customer_type;

-- 5. Customer report: top 5 customers by amount billed (uses the VIEW) ---
SELECT customer_number, full_name, total_bills, total_billed, total_paid, outstanding_amount
FROM customer_billing_summary
ORDER BY total_billed DESC
LIMIT 5;

-- 6. Bill report: bills per billing month --------------------------------
SELECT to_char(date_trunc('month', billing_period_start), 'Mon YYYY') AS month,
       COUNT(*) AS bills,
       SUM(total_amount) AS billed
FROM bills
GROUP BY date_trunc('month', billing_period_start)
ORDER BY date_trunc('month', billing_period_start);

-- 7. Bill report: count and amount by status ----------------------------
SELECT status, COUNT(*) AS bills, SUM(total_amount) AS amount
FROM bills
GROUP BY status
ORDER BY status;

-- 8. Payment report: money collected per month and by method ------------
SELECT to_char(date_trunc('month', payment_date), 'Mon YYYY') AS month, COUNT(*) AS payments, SUM(amount) AS collected
FROM payments
WHERE status = 'Completed'
GROUP BY date_trunc('month', payment_date)
ORDER BY date_trunc('month', payment_date);

SELECT method, COUNT(*) AS payments, SUM(amount) AS collected
FROM payments
WHERE status = 'Completed'
GROUP BY method
ORDER BY collected DESC;

-- 9. Consumption history of one meter (uses the VIEW) --------------------
SELECT meter_number, customer_name, reading_date, previous_reading, current_reading, consumption
FROM connection_consumption
WHERE meter_number = 'MET-0045';

-- 10. Try the bill calculator yourself -----------------------------------
SELECT * FROM calculate_bill_amount('Residential', 'Single Phase', 250);  -- total 1537.00
SELECT * FROM calculate_bill_amount('Commercial',  'Three Phase', 1000);
