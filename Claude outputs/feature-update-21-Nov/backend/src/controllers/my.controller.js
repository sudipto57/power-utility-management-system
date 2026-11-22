// Customer portal: a logged-in customer sees ONLY their own data.
// Features 3 (customer dashboard), 5 (own profile), 10/11 (own bills), 12 (service requests),
// plus meter & usage, online payment, payment history and the inbox.
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { BILL_STATUSES, OPEN_BILL_STATUSES, REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '../utils/constants.js';
import { clean, optionalOneOf, requireOneOf, requireText, requireUuid } from '../utils/validate.js';
import { BILL_SELECT, findBill } from './bills.controller.js';
import { REQUEST_SELECT, findRequest } from './requests.controller.js';
import { activeSlabs } from './tariffs.controller.js';
import { formatTaka } from '../utils/email.js';

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

// PUT /api/my/profile   body: { full_name, address }
// The customer can change these alone. Email, phone and the types need an admin (change requests).
export async function updateMyProfile(req, res) {
  const customerId = myCustomerId(req);
  const body = req.body || {};
  if ('email' in body || 'phone' in body || 'customer_type' in body) {
    throw new ApiError(400, 'Email, phone and customer type change only after an admin approves. Please send a change request');
  }
  const fullName = requireText(body.full_name, 'Full name', 100);
  const address = requireText(body.address, 'Address', 500);

  await withTransaction(async (client) => {
    await client.query('UPDATE customers SET full_name = $1, address = $2 WHERE id = $3', [fullName, address, customerId]);
    await client.query('UPDATE users SET full_name = $1 WHERE id = $2', [fullName, req.user.id]); // name shown after login
  });
  return getMyProfile(req, res);
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

  const [alerts, notices] = await Promise.all([myAlerts(customerId, req.user.previousLogin), myNotices(customerId)]);

  res.json({
    data: {
      ...summary.rows[0],
      ...requests.rows[0],
      connections_total: connections.rows[0].total,
      connections_active: connections.rows[0].active,
      latest_bill: latestBill.rows[0] || null,
      usage: usage.rows.reverse().map((row) => ({ month: row.month, units: row.units })),
      alerts,
      notices,
    },
  });
}

/**
 * Short messages for the "Alerts" box on My Dashboard. Worked out every time (nothing is stored):
 *  - an unpaid bill is overdue, or due in the next 3 days
 *  - a new unpaid bill came since the customer last logged in
 *  - staff answered or changed one of their requests since then
 *  - an online payment is still waiting for staff to confirm it
 * tone: 'danger' (red), 'warning' (amber) or 'info' (blue)
 */
async function myAlerts(customerId, previousLogin) {
  const since = previousLogin || null; // first login ever: show the last 7 days
  const [bills, requests, payments] = await Promise.all([
    query(
      `SELECT b.id, b.bill_number, b.status, b.due_date, (b.due_date - CURRENT_DATE) AS days_left,
              b.created_at > COALESCE($2::timestamptz, NOW() - INTERVAL '7 days') AS is_new,
              GREATEST(b.total_amount - COALESCE(p.paid, 0), 0) AS balance
       FROM bills b JOIN connections co ON co.id = b.connection_id
       LEFT JOIN LATERAL (SELECT SUM(amount) AS paid FROM payments WHERE bill_id = b.id AND status = 'Completed') p ON TRUE
       WHERE co.customer_id = $1 AND b.status = ANY($3)
         -- a bill with an online payment being checked gets the payment alert below instead
         AND NOT EXISTS (SELECT 1 FROM payments w WHERE w.bill_id = b.id AND w.status = 'Pending')
       ORDER BY b.due_date`,
      [customerId, since, OPEN_BILL_STATUSES]
    ),
    query(
      `SELECT r.id, r.request_number, r.status
       FROM service_requests r
       WHERE r.customer_id = $1
         AND EXISTS (SELECT 1 FROM service_request_comments rc JOIN users u ON u.id = rc.user_id
                     WHERE rc.request_id = r.id AND u.role = 'admin'
                       AND rc.created_at > COALESCE($2::timestamptz, NOW() - INTERVAL '7 days'))`,
      [customerId, since]
    ),
    query(
      `SELECT pay.payment_number, b.bill_number, b.id AS bill_id
       FROM payments pay JOIN bills b ON b.id = pay.bill_id JOIN connections co ON co.id = b.connection_id
       WHERE co.customer_id = $1 AND pay.status = 'Pending'`,
      [customerId]
    ),
  ]);

  const alerts = [];
  for (const bill of bills.rows) {
    const link = `/my/bills/${bill.id}`;
    if (bill.status === 'Overdue') {
      alerts.push({ tone: 'danger', text: `${bill.bill_number} is overdue. Please pay as soon as you can`, link, amount: bill.balance });
    } else if (OPEN_BILL_STATUSES.includes(bill.status) && bill.days_left >= 0 && bill.days_left <= 3) {
      const when = bill.days_left === 0 ? 'today' : bill.days_left === 1 ? 'tomorrow' : `in ${bill.days_left} days`;
      alerts.push({ tone: 'warning', text: `${bill.bill_number} is due ${when}`, link, amount: bill.balance });
    } else if (bill.is_new) {
      // came since the customer last logged in
      alerts.push({ tone: 'info', text: `New bill ${bill.bill_number} is ready`, link, amount: bill.balance });
    }
  }
  for (const payment of payments.rows) {
    alerts.push({
      tone: 'info',
      text: `Your payment ${payment.payment_number} for ${payment.bill_number} is waiting for the office to confirm it`,
      link: `/my/bills/${payment.bill_id}`,
    });
  }
  for (const request of requests.rows) {
    alerts.push({
      tone: 'info',
      text: `${request.request_number} has an update from the office (${request.status})`,
      link: `/my/requests/${request.id}`,
    });
  }
  return alerts;
}

// Power cuts and maintenance for the customer's area that have not ended yet
// (the notice area must appear in the customer's address, or be "All areas")
async function myNotices(customerId) {
  const { rows } = await query(
    `SELECT n.id, n.title, n.notice_type, n.area, n.message, n.starts_at, n.ends_at,
            n.starts_at <= NOW() AS is_now
     FROM outage_notices n, customers c
     WHERE c.id = $1 AND n.ends_at > NOW()
       AND (n.area = 'All areas' OR c.address ILIKE '%' || n.area || '%')
     ORDER BY n.starts_at
     LIMIT 5`,
    [customerId]
  );
  return rows;
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

// POST /api/my/requests/:id/comments   body: { comment }   -> the customer answers the office
export async function addMyRequestComment(req, res) {
  const customerId = myCustomerId(req);
  const id = requireUuid(req.params.id, 'request id');
  const comment = requireText(req.body?.comment, 'Message', 2000);
  const request = await findRequest(id);
  if (request.customer_id !== customerId) throw new ApiError(404, 'Service request not found');
  if (!['Pending', 'In Progress'].includes(request.status)) {
    throw new ApiError(400, `This request is ${request.status.toLowerCase()}. Please send a new request if you still need help`);
  }
  await query('INSERT INTO service_request_comments (request_id, user_id, comment) VALUES ($1, $2, $3)', [id, req.user.id, comment]);
  res.status(201).json({ data: await findRequest(id) });
}

// ---------------------------------------------------------------------
// Meter & Usage page
// ---------------------------------------------------------------------

/**
 * Price warning for the current month.
 * slabs: price bands of the tariff. A unit count belongs to the last band that starts at or below it.
 */
function slabWarning(slabs, unitsSoFar, projectedUnits) {
  if (!slabs.length || unitsSoFar === null) return null;
  const bandOf = (units) => slabs.filter((slab) => slab.start_unit <= units).pop() || slabs[0];
  const now = bandOf(unitsSoFar);
  const next = slabs.find((slab) => slab.slab_order > now.slab_order);
  if (!next) return null; // already in the last (most expensive) band

  if (projectedUnits !== null && bandOf(projectedUnits).slab_order > now.slab_order) {
    const later = bandOf(projectedUnits);
    return `At this pace you will use about ${projectedUnits} kWh this month. Above ${now.end_unit} kWh each unit costs ${formatTaka(later.rate_per_unit)} instead of ${formatTaka(now.rate_per_unit)}.`;
  }
  const left = now.end_unit - unitsSoFar;
  if (left <= 15) {
    return `Only ${left} kWh left before the price goes up from ${formatTaka(now.rate_per_unit)} to ${formatTaka(next.rate_per_unit)} per kWh.`;
  }
  return null;
}

// GET /api/my/usage   -> for every meter: last official reading, the customer's own newer reading,
// units used so far, a projection for the whole month (30 days) and the bill for it.
export async function getMyUsage(req, res) {
  const customerId = myCustomerId(req);
  const { rows: meters } = await query(
    `SELECT co.id, co.meter_number, co.connection_type, co.status, c.customer_type
     FROM connections co JOIN customers c ON c.id = co.customer_id
     WHERE co.customer_id = $1 ORDER BY co.installation_date, co.meter_number`,
    [customerId]
  );

  const result = [];
  for (const meter of meters) {
    const { rows: readings } = await query(
      `SELECT mr.id, mr.previous_reading, mr.current_reading, (mr.current_reading - mr.previous_reading) AS consumption,
              mr.reading_date, mr.status, mr.notes, u.role AS recorded_by_role
       FROM meter_readings mr LEFT JOIN users u ON u.id = mr.recorded_by
       WHERE mr.connection_id = $1
       ORDER BY mr.reading_date DESC, mr.created_at DESC
       LIMIT 12`,
      [meter.id]
    );
    const official = readings.find((r) => r.status === 'Verified') || null;
    // the customer's newest reading after the official one (still waiting for staff)
    const own = official ? readings.find((r) => r.status === 'Pending' && r.reading_date > official.reading_date) || null : null;

    let unitsSoFar = null;
    let days = null;
    let projectedUnits = null;
    let projectedBill = null;
    if (official && own) {
      unitsSoFar = own.current_reading - official.current_reading;
      const gap = await query('SELECT $1::date - $2::date AS days', [own.reading_date, official.reading_date]);
      days = gap.rows[0].days;
      projectedUnits = Math.round((unitsSoFar / days) * 30);
      const bill = await query('SELECT * FROM calculate_bill_amount($1, $2, $3)', [
        meter.customer_type,
        meter.connection_type,
        projectedUnits,
      ]);
      projectedBill = bill.rows[0];
    }
    const slabs = await activeSlabs(meter.customer_type, meter.connection_type);

    result.push({
      ...meter,
      official_reading: official,
      own_reading: own,
      units_so_far: unitsSoFar,
      days_so_far: days,
      projected_units: projectedUnits,
      projected_bill: projectedBill,
      last_month_units: official ? official.consumption : null,
      slabs,
      warning: slabWarning(slabs, unitsSoFar, projectedUnits),
      readings,
    });
  }
  res.json({ data: result });
}

// ---------------------------------------------------------------------
// Pay now (demo): the customer pays the full balance by Mobile Banking or Card.
// No card number is ever asked or saved: only the transaction reference.
// The payment waits as Pending until staff confirm it; then the trigger marks the bill Paid.
// ---------------------------------------------------------------------
const ONLINE_METHODS = ['Mobile Banking', 'Card'];

// POST /api/my/bills/:id/pay   body: { method, reference }
export async function payMyBill(req, res) {
  const customerId = myCustomerId(req);
  const id = requireUuid(req.params.id, 'bill id');
  const method = requireOneOf(req.body?.method, ONLINE_METHODS, 'Payment method');
  const reference = requireText(req.body?.reference, 'Transaction reference', 50);
  if (reference.length < 4) throw new ApiError(400, 'Please type the transaction reference from your payment message');

  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT b.id, b.total_amount FROM bills b JOIN connections co ON co.id = b.connection_id
       WHERE b.id = $1 AND co.customer_id = $2 FOR UPDATE OF b`,
      [id, customerId]
    );
    const bill = rows[0];
    if (!bill) throw new ApiError(404, 'Bill not found');

    const paid = await client.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'Completed'), 0) AS paid,
              COUNT(*) FILTER (WHERE status = 'Pending') AS waiting
       FROM payments WHERE bill_id = $1`,
      [id]
    );
    if (paid.rows[0].waiting > 0) throw new ApiError(409, 'A payment for this bill is already waiting for the office to confirm it');
    const balance = Math.round((bill.total_amount - paid.rows[0].paid) * 100) / 100;
    if (balance <= 0) throw new ApiError(409, 'This bill is already fully paid');

    const paymentNumber = await generateNumber(client, 'payment');
    await client.query(
      `INSERT INTO payments (payment_number, bill_id, amount, method, payment_date, reference, status, notes, recorded_by)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'Pending', 'Paid online by the customer', $6)`,
      [paymentNumber, id, balance, method, reference, req.user.id]
    );
    await client.query('SELECT check_overdue_bills()'); // the payment trigger ran: keep Overdue bills Overdue
  });

  res.status(201).json({ data: await findBill(id) });
}

// ---------------------------------------------------------------------
// Payment history and receipts
// ---------------------------------------------------------------------
const PAYMENT_SELECT = `
  SELECT pay.id, pay.payment_number, pay.amount, pay.method, pay.payment_date, pay.reference, pay.status, pay.notes,
         pay.created_at, pay.updated_at,
         b.id AS bill_id, b.bill_number, b.billing_period_start, b.billing_period_end, b.total_amount AS bill_total,
         co.meter_number, co.connection_type,
         c.id AS customer_id, c.customer_number, c.full_name AS customer_name, c.address AS customer_address,
         c.phone AS customer_phone
  FROM payments pay
  JOIN bills b ON b.id = pay.bill_id
  JOIN connections co ON co.id = b.connection_id
  JOIN customers c ON c.id = co.customer_id`;

// GET /api/my/payments
export async function getMyPayments(req, res) {
  const customerId = myCustomerId(req);
  const { rows } = await query(`${PAYMENT_SELECT} WHERE c.id = $1 ORDER BY pay.payment_date DESC, pay.created_at DESC`, [
    customerId,
  ]);
  res.json({ data: rows });
}

// GET /api/my/payments/:id   -> one payment (the receipt page)
export async function getMyPayment(req, res) {
  const customerId = myCustomerId(req);
  const id = requireUuid(req.params.id, 'payment id');
  const { rows } = await query(`${PAYMENT_SELECT} WHERE pay.id = $1 AND c.id = $2`, [id, customerId]);
  if (!rows[0]) throw new ApiError(404, 'Payment not found');
  res.json({ data: rows[0] });
}

// ---------------------------------------------------------------------
// Inbox (the bell)
// ---------------------------------------------------------------------

// GET /api/my/notifications   -> the newest 30 messages and how many are unread
export async function getMyNotifications(req, res) {
  const customerId = myCustomerId(req);
  const [list, unread] = await Promise.all([
    query(
      `SELECT id, kind, title, message, link, is_read, created_at FROM notifications
       WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [customerId]
    ),
    query('SELECT COUNT(*) AS unread FROM notifications WHERE customer_id = $1 AND is_read = FALSE', [customerId]),
  ]);
  res.json({ data: { items: list.rows, unread: unread.rows[0].unread } });
}

// POST /api/my/notifications/:id/read   (id = "all" marks every message as read)
export async function readMyNotification(req, res) {
  const customerId = myCustomerId(req);
  const id = clean(req.params.id);
  if (id === 'all') {
    await query('UPDATE notifications SET is_read = TRUE WHERE customer_id = $1 AND is_read = FALSE', [customerId]);
  } else {
    const result = await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND customer_id = $2', [
      requireUuid(id, 'message id'),
      customerId,
    ]);
    if (result.rowCount === 0) throw new ApiError(404, 'Message not found');
  }
  return getMyNotifications(req, res);
}
