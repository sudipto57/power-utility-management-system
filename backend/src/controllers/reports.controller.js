// Feature 15 (Basic Reports): customer, bill and payment summaries
import { query } from '../config/db.js';

// GET /api/reports/customers
export async function customerReport(req, res) {
  const [byType, byStatus, connectionsByType, topCustomers] = await Promise.all([
    query(
      `SELECT customer_type, COUNT(*) AS count, COUNT(*) FILTER (WHERE status = 'Active') AS active
       FROM customers GROUP BY customer_type ORDER BY customer_type`
    ),
    query('SELECT status, COUNT(*) AS count FROM customers GROUP BY status ORDER BY status'),
    query(
      `SELECT connection_type, status, COUNT(*) AS count
       FROM connections GROUP BY connection_type, status ORDER BY connection_type, status`
    ),
    // Uses the database view customer_billing_summary
    query(
      `SELECT customer_id, customer_number, full_name, customer_type, total_bills, total_billed, total_paid, outstanding_amount
       FROM customer_billing_summary ORDER BY total_billed DESC, customer_number LIMIT 5`
    ),
  ]);

  res.json({
    data: {
      by_type: byType.rows,
      by_status: byStatus.rows,
      connections_by_type: connectionsByType.rows,
      top_customers: topCustomers.rows,
    },
  });
}

// GET /api/reports/bills
export async function billReport(req, res) {
  await query('SELECT check_overdue_bills()');
  const [summary, byMonth, byStatus] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total_bills,
              COALESCE(SUM(b.total_amount), 0) AS total_billed,
              COALESCE(SUM(bb.paid_amount), 0) AS total_collected,
              COALESCE(SUM(bb.balance), 0) AS total_outstanding,
              COALESCE(SUM(bb.late_fee - bb.waived), 0) AS total_late_fees,
              COALESCE(SUM(b.tax_amount), 0) AS total_tax
       FROM bills b
       JOIN bill_balance bb ON bb.bill_id = b.id`
    ),
    query(
      `SELECT to_char(date_trunc('month', billing_period_start), 'Mon YYYY') AS month,
              date_trunc('month', billing_period_start) AS month_start,
              COUNT(*) AS bills, SUM(total_amount) AS billed
       FROM bills GROUP BY 1, 2 ORDER BY month_start`
    ),
    query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount
       FROM bills GROUP BY status ORDER BY status`
    ),
  ]);

  res.json({
    data: {
      ...summary.rows[0],
      by_month: byMonth.rows.map(({ month, bills, billed }) => ({ month, bills, billed })),
      by_status: byStatus.rows,
    },
  });
}

// GET /api/reports/payments
export async function paymentReport(req, res) {
  const [summary, byMonth, byMethod, recent] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total_payments, COALESCE(SUM(amount), 0) AS total_collected,
              COALESCE(AVG(amount), 0) AS average_payment
       FROM payments WHERE status = 'Completed'`
    ),
    query(
      `SELECT to_char(date_trunc('month', payment_date), 'Mon YYYY') AS month,
              date_trunc('month', payment_date) AS month_start,
              COUNT(*) AS payments, SUM(amount) AS collected
       FROM payments WHERE status = 'Completed' GROUP BY 1, 2 ORDER BY month_start`
    ),
    query(
      `SELECT method, COUNT(*) AS count, SUM(amount) AS amount
       FROM payments WHERE status = 'Completed' GROUP BY method ORDER BY amount DESC`
    ),
    query(
      `SELECT p.id, p.payment_number, p.amount, p.method, p.payment_date, b.id AS bill_id, b.bill_number,
              c.full_name AS customer_name
       FROM payments p JOIN bills b ON b.id = p.bill_id
       JOIN connections co ON co.id = b.connection_id JOIN customers c ON c.id = co.customer_id
       ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 10`
    ),
  ]);

  res.json({
    data: {
      ...summary.rows[0],
      average_payment: Math.round(summary.rows[0].average_payment * 100) / 100,
      by_month: byMonth.rows.map(({ month, payments, collected }) => ({ month, payments, collected })),
      by_method: byMethod.rows,
      recent: recent.rows,
    },
  });
}
