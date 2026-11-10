// Feature 6 (Electricity Service Management) + Feature 7 (Meter Information)
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { CONNECTION_STATUSES, CONNECTION_TYPES } from '../utils/constants.js';
import { clean, optionalOneOf, optionalText, requireDate, requireOneOf, requireText, requireUuid } from '../utils/validate.js';

const CONNECTION_SELECT = `
  SELECT co.id, co.customer_id, co.meter_number, co.connection_type, co.installation_date,
         co.status, co.notes, co.created_at, co.updated_at,
         c.customer_number, c.full_name AS customer_name, c.customer_type, c.phone AS customer_phone,
         lr.current_reading AS last_reading, lr.reading_date AS last_reading_date,
         (SELECT COUNT(*) FROM meter_readings mr WHERE mr.connection_id = co.id) AS readings_count
  FROM connections co
  JOIN customers c ON c.id = co.customer_id
  LEFT JOIN LATERAL (
    SELECT mr.current_reading, mr.reading_date FROM meter_readings mr
    WHERE mr.connection_id = co.id AND mr.status = 'Verified'
    ORDER BY mr.reading_date DESC, mr.created_at DESC LIMIT 1
  ) lr ON TRUE`;

async function findConnection(id) {
  const { rows } = await query(`${CONNECTION_SELECT} WHERE co.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Connection not found');
  return rows[0];
}

// GET /api/connections?search=&status=&type=&customer_id=
export async function listConnections(req, res) {
  const search = clean(req.query.search);
  const status = optionalOneOf(req.query.status, CONNECTION_STATUSES, 'status');
  const type = optionalOneOf(req.query.type, CONNECTION_TYPES, 'type');
  const customerId = clean(req.query.customer_id) ? requireUuid(req.query.customer_id, 'customer id') : null;

  const { rows } = await query(
    `${CONNECTION_SELECT}
     WHERE ($1::text IS NULL OR co.meter_number ILIKE $1 OR c.full_name ILIKE $1 OR c.customer_number ILIKE $1)
       AND ($2::text IS NULL OR co.status = $2)
       AND ($3::text IS NULL OR co.connection_type = $3)
       AND ($4::uuid IS NULL OR co.customer_id = $4)
     ORDER BY co.meter_number`,
    [search ? `%${search}%` : null, status, type, customerId]
  );
  res.json({ data: rows });
}

// GET /api/connections/:id  -> connection + meter info + readings + bills
export async function getConnection(req, res) {
  const id = requireUuid(req.params.id, 'connection id');
  await query('SELECT check_overdue_bills()');
  const connection = await findConnection(id);

  const [readings, bills] = await Promise.all([
    query(
      `SELECT mr.id, mr.previous_reading, mr.current_reading, (mr.current_reading - mr.previous_reading) AS consumption,
              mr.reading_date, mr.status, mr.notes, u.full_name AS recorded_by_name,
              b.id AS bill_id, b.bill_number
       FROM meter_readings mr
       LEFT JOIN users u ON u.id = mr.recorded_by
       LEFT JOIN bills b ON b.connection_id = mr.connection_id AND b.billing_period_end = mr.reading_date - 1
       WHERE mr.connection_id = $1
       ORDER BY mr.reading_date DESC, mr.created_at DESC`,
      [id]
    ),
    query(
      `SELECT id, bill_number, billing_period_start, billing_period_end, due_date, total_amount, status
       FROM bills WHERE connection_id = $1 ORDER BY billing_period_start DESC`,
      [id]
    ),
  ]);

  res.json({ data: { ...connection, readings: readings.rows, bills: bills.rows } });
}

// POST /api/connections
// body: { customer_id, meter_number (optional, auto if empty), connection_type, installation_date, status, notes }
export async function createConnection(req, res) {
  const body = req.body || {};
  const customerId = requireUuid(body.customer_id, 'customer');
  const connectionType = requireOneOf(body.connection_type, CONNECTION_TYPES, 'Connection type');
  const installationDate = requireDate(body.installation_date, 'Installation date');
  const status = optionalOneOf(body.status, CONNECTION_STATUSES, 'Status') || 'Active';
  const notes = optionalText(body.notes, 'Notes');

  const customer = await query('SELECT id, status FROM customers WHERE id = $1', [customerId]);
  if (!customer.rows[0]) throw new ApiError(404, 'Customer not found');

  let meterNumber = clean(body.meter_number);
  if (meterNumber) {
    meterNumber = requireText(meterNumber, 'Meter number', 20).toUpperCase();
  } else {
    meterNumber = await generateNumber({ query }, 'meter');
  }

  const { rows } = await query(
    `INSERT INTO connections (customer_id, meter_number, connection_type, installation_date, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [customerId, meterNumber, connectionType, installationDate, status, notes]
  );
  res.status(201).json({ data: await findConnection(rows[0].id) });
}

// PUT /api/connections/:id   (send only the fields you want to change)
export async function updateConnection(req, res) {
  const id = requireUuid(req.params.id, 'connection id');
  const body = req.body || {};
  await findConnection(id);

  const changes = {};
  if ('meter_number' in body) changes.meter_number = requireText(body.meter_number, 'Meter number', 20).toUpperCase();
  if ('connection_type' in body)
    changes.connection_type = requireOneOf(body.connection_type, CONNECTION_TYPES, 'Connection type');
  if ('installation_date' in body) changes.installation_date = requireDate(body.installation_date, 'Installation date');
  if ('status' in body) changes.status = requireOneOf(body.status, CONNECTION_STATUSES, 'Status');
  if ('notes' in body) changes.notes = optionalText(body.notes, 'Notes');

  const keys = Object.keys(changes);
  if (keys.length === 0) throw new ApiError(400, 'Nothing to update');

  const setSql = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  await query(`UPDATE connections SET ${setSql} WHERE id = $${keys.length + 1}`, [...keys.map((k) => changes[k]), id]);

  res.json({ data: await findConnection(id) });
}
