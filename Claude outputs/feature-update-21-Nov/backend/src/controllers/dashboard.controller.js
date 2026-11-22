// Feature 3 (Main Dashboard) - admin view
import { query } from '../config/db.js';
import { OPEN_BILL_STATUSES } from '../utils/constants.js';

// GET /api/dashboard/stats
export async function getStats(req, res) {
  await query('SELECT check_overdue_bills()');

  const [totals, monthly, billStatus] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM customers)                                AS total_customers,
         (SELECT COUNT(*) FROM customers WHERE status = 'Active')        AS active_customers,
         (SELECT COUNT(*) FROM connections)                              AS total_connections,
         (SELECT COUNT(*) FROM connections WHERE status = 'Active')      AS active_connections,
         (SELECT COUNT(*) FROM bills WHERE status = ANY($1))             AS unpaid_bills,
         (SELECT COUNT(*) FROM bills WHERE status = 'Overdue')           AS overdue_bills,
         (SELECT COALESCE(SUM(b.total_amount - COALESCE(
                    (SELECT SUM(p.amount) FROM payments p WHERE p.bill_id = b.id AND p.status = 'Completed'), 0)), 0)
            FROM bills b WHERE b.status = ANY($1))                       AS outstanding_amount,
         (SELECT COUNT(*) FROM service_requests WHERE status IN ('Pending', 'In Progress')) AS open_requests,
         (SELECT COUNT(*) FROM service_requests WHERE status = 'Pending')                   AS pending_requests,
         (SELECT COUNT(*) FROM profile_change_requests WHERE status = 'Pending')            AS pending_change_requests,
         (SELECT COUNT(*) FROM meter_readings WHERE status = 'Pending')                     AS pending_readings,
         (SELECT COUNT(*) FROM payments WHERE status = 'Pending')                           AS pending_payments,
         (SELECT COALESCE(SUM(amount), 0) FROM payments
            WHERE status = 'Completed' AND date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE)) AS collected_this_month`,
      [OPEN_BILL_STATUSES]
    ),
    // Last 6 months: amount billed (by billing period) and amount collected (by payment date)
    query(
      `SELECT to_char(m, 'Mon YYYY') AS month,
              COALESCE((SELECT SUM(b.total_amount) FROM bills b
                        WHERE date_trunc('month', b.billing_period_start) = m), 0) AS billed,
              COALESCE((SELECT SUM(p.amount) FROM payments p
                        WHERE p.status = 'Completed' AND date_trunc('month', p.payment_date) = m), 0) AS collected
       FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                            date_trunc('month', CURRENT_DATE), INTERVAL '1 month') AS m
       ORDER BY m`
    ),
    query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount
       FROM bills GROUP BY status ORDER BY status`
    ),
  ]);

  res.json({ data: { ...totals.rows[0], monthly: monthly.rows, bill_status: billStatus.rows } });
}

// GET /api/dashboard/recent-activity   -> latest 10 things that happened (no extra table needed)
export async function getRecentActivity(req, res) {
  const { rows } = await query(
    `SELECT * FROM (
       SELECT 'bill' AS type, b.id AS link_id, b.bill_number AS title, c.full_name AS subtitle,
              b.total_amount AS amount, b.status::text AS status, b.created_at AS happened_at
       FROM bills b JOIN connections co ON co.id = b.connection_id JOIN customers c ON c.id = co.customer_id
       UNION ALL
       SELECT 'payment', p.bill_id, p.payment_number, c.full_name, p.amount, p.method::text, p.created_at
       FROM payments p JOIN bills b ON b.id = p.bill_id
       JOIN connections co ON co.id = b.connection_id JOIN customers c ON c.id = co.customer_id
       UNION ALL
       SELECT 'request', r.id, r.request_number || ' - ' || r.category, c.full_name, NULL::numeric, r.status::text, r.created_at
       FROM service_requests r JOIN customers c ON c.id = r.customer_id
       UNION ALL
       SELECT 'reading', co.id, co.meter_number, c.full_name,
              (mr.current_reading - mr.previous_reading)::numeric, mr.status::text, mr.created_at
       FROM meter_readings mr JOIN connections co ON co.id = mr.connection_id JOIN customers c ON c.id = co.customer_id
       UNION ALL
       SELECT 'customer', c.id, c.customer_number, c.full_name, NULL::numeric, c.status::text, c.created_at
       FROM customers c
     ) activity
     ORDER BY happened_at DESC
     LIMIT 10`
  );
  res.json({ data: rows });
}
