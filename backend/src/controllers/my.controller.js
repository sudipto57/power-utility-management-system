// Customer portal: a logged-in customer sees ONLY their own data.
// Features 3 (customer dashboard), 5 (own profile), 10/11 (own bills), 12 (service requests)
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { BILL_STATUSES, OPEN_BILL_STATUSES, REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '../utils/constants.js';
import { optionalOneOf, requireOneOf, requireText, requireUuid } from '../utils/validate.js';
import { BILL_SELECT, findBill } from './bills.controller.js';
import { REQUEST_SELECT, findRequest } from './requests.controller.js';

function myCustomerId(req) {
  if (!req.user.customerId) throw new ApiError(403, 'Your login is not linked to a customer profile');
  return req.user.customerId;
}

// GET /api/my/profile
export async function getMyProfile(req, res) {
  const customerId = myCustomerId(req);
  const { rows } = await query(
    `SELECT c.id, c.customer_number, c.full_name, c.phone, c.email, c.address, c.customer_type, c.status, c.created_at,
            u.username, u.last_login
     FROM customers c LEFT JOIN users u ON u.id = $2
     WHERE c.id = $1`,
    [customerId, req.user.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Customer profile not found');

  const connections = await query(
    `SELECT co.id, co.meter_number, co.connection_type, co.installation_date, co.status,
            lr.current_reading AS last_reading, lr.reading_date AS last_reading_date
     FROM connections co
     LEFT JOIN LATERAL (
       SELECT mr.current_reading, mr.reading_date FROM meter_readings mr
       WHERE mr.connection_id = co.id AND mr.status = 'Verified'
       ORDER BY mr.reading_date DESC, mr.created_at DESC LIMIT 1
     ) lr ON TRUE
     WHERE co.customer_id = $1 ORDER BY co.installation_date`,
    [customerId]
  );
  res.json({ data: { ...rows[0], connections: connections.rows } });
}

// GET /api/my/dashboard
export async function getMyDashboard(req, res) {
  const customerId = myCustomerId(req);
  await query('SELECT check_overdue_bills()');

  const [summary, latestBill, requests, connections, usage] = await Promise.all([
    query(
      `SELECT COUNT(*) FILTER (WHERE b.status = ANY($2)) AS unpaid_bills,
              COALESCE(SUM(b.total_amount - COALESCE(p.paid, 0)) FILTER (WHERE b.status = ANY($2)), 0) AS outstanding_amount,
              COUNT(*) FILTER (WHERE b.status = 'Overdue') AS overdue_bills
       FROM bills b
       JOIN connections co ON co.id = b.connection_id
       LEFT JOIN LATERAL (SELECT SUM(amount) AS paid FROM payments WHERE bill_id = b.id AND status = 'Completed') p ON TRUE
       WHERE co.customer_id = $1`,
      [customerId, OPEN_BILL_STATUSES]
    ),
    query(`${BILL_SELECT} WHERE c.id = $1 ORDER BY b.billing_period_start DESC, b.bill_number DESC LIMIT 1`, [customerId]),
    query(
      `SELECT COUNT(*) FILTER (WHERE status IN ('Pending', 'In Progress')) AS open_requests, COUNT(*) AS total_requests
       FROM service_requests WHERE customer_id = $1`,
      [customerId]
    ),
    query(
      "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'Active') AS active FROM connections WHERE customer_id = $1",
      [customerId]
    ),
    // kWh used per month (all meters together), last 6 readings months
    query(
      `SELECT to_char(mr.reading_date - 1, 'Mon YYYY') AS month, date_trunc('month', mr.reading_date - 1) AS month_start,
              SUM(mr.current_reading - mr.previous_reading) AS units
       FROM meter_readings mr JOIN connections co ON co.id = mr.connection_id
       WHERE co.customer_id = $1 AND mr.status = 'Verified'
       GROUP BY 1, 2 ORDER BY month_start DESC LIMIT 6`,
      [customerId]
    ),
  ]);

  res.json({
    data: {
      ...summary.rows[0],
      ...requests.rows[0],
      connections_total: connections.rows[0].total,
      connections_active: connections.rows[0].active,
      latest_bill: latestBill.rows[0] || null,
      usage: usage.rows.reverse().map((row) => ({ month: row.month, units: row.units })),
    },
  });
}

// GET /api/my/bills?status=
export async function getMyBills(req, res) {
  const customerId = myCustomerId(req);
  const status = optionalOneOf(req.query.status, BILL_STATUSES, 'status');
  await query('SELECT check_overdue_bills()');
  const { rows } = await query(
    `${BILL_SELECT} WHERE c.id = $1 AND ($2::text IS NULL OR b.status = $2)
     ORDER BY b.billing_period_start DESC, b.bill_number DESC`,
    [customerId, status]
  );
  res.json({ data: rows });
}

// GET /api/my/bills/:id
export async function getMyBill(req, res) {
  const customerId = myCustomerId(req);
  const id = requireUuid(req.params.id, 'bill id');
  await query('SELECT check_overdue_bills()');
  const bill = await findBill(id);
  if (bill.customer_id !== customerId) throw new ApiError(404, 'Bill not found'); // never show other people's bills
  res.json({ data: bill });
}

// GET /api/my/requests
export async function getMyRequests(req, res) {
  const customerId = myCustomerId(req);
  const { rows } = await query(`${REQUEST_SELECT} WHERE r.customer_id = $1 ORDER BY r.created_at DESC`, [customerId]);
  res.json({ data: rows });
}

// GET /api/my/requests/:id
export async function getMyRequest(req, res) {
  const customerId = myCustomerId(req);
  const id = requireUuid(req.params.id, 'request id');
  const request = await findRequest(id);
  if (request.customer_id !== customerId) throw new ApiError(404, 'Service request not found');
  res.json({ data: request });
}

// POST /api/my/requests   body: { category, priority, description }
export async function createMyRequest(req, res) {
  const customerId = myCustomerId(req);
  const category = requireOneOf(req.body?.category, REQUEST_CATEGORIES, 'Category');
  const priority = optionalOneOf(req.body?.priority, REQUEST_PRIORITIES, 'Priority') || 'Medium';
  const description = requireText(req.body?.description, 'Description', 2000);
  if (description.length < 10) throw new ApiError(400, 'Please describe the problem in at least 10 characters');

  const requestNumber = await generateNumber({ query }, 'request');
  const { rows } = await query(
    `INSERT INTO service_requests (request_number, customer_id, category, priority, status, description)
     VALUES ($1, $2, $3, $4, 'Pending', $5) RETURNING id`,
    [requestNumber, customerId, category, priority, description]
  );
  res.status(201).json({ data: await findRequest(rows[0].id) });
}
