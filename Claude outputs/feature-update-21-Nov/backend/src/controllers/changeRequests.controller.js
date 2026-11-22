// Profile change requests.
// A customer changes their name and address alone (PUT /api/my/profile).
// Email, phone, customer type and connection type need an admin's OK:
// the customer sends a request, an admin approves or rejects it, and only then is it changed.
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { CONNECTION_TYPES, CUSTOMER_TYPES } from '../utils/constants.js';
import { changeDecisionEmail, sendEmail } from '../utils/email.js';
import { notifyCustomer } from '../utils/notify.js';
import {
  clean,
  optionalOneOf,
  optionalText,
  requireEmail,
  requireOneOf,
  requirePhone,
  requireUuid,
} from '../utils/validate.js';

export const CHANGE_FIELDS = {
  email: 'Email',
  phone: 'Phone number',
  customer_type: 'Customer type',
  connection_type: 'Connection type',
};
const CHANGE_STATUSES = ['Pending', 'Approved', 'Rejected'];

const CHANGE_SELECT = `
  SELECT r.id, r.customer_id, r.field, r.connection_id, r.old_value, r.new_value, r.reason, r.status,
         r.admin_note, r.decided_at, r.created_at,
         c.customer_number, c.full_name AS customer_name, c.email AS customer_email,
         co.meter_number, d.full_name AS decided_by_name
  FROM profile_change_requests r
  JOIN customers c ON c.id = r.customer_id
  LEFT JOIN connections co ON co.id = r.connection_id
  LEFT JOIN users d ON d.id = r.decided_by`;

function withLabel(row) {
  return { ...row, field_label: CHANGE_FIELDS[row.field] };
}

async function findChangeRequest(id) {
  const { rows } = await query(`${CHANGE_SELECT} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Change request not found');
  return withLabel(rows[0]);
}

// ---------------------------------------------------------------------
// Customer side  (/api/my/change-requests)
// ---------------------------------------------------------------------

// GET /api/my/change-requests
export async function getMyChangeRequests(req, res) {
  const { rows } = await query(`${CHANGE_SELECT} WHERE r.customer_id = $1 ORDER BY r.created_at DESC`, [req.user.customerId]);
  res.json({ data: rows.map(withLabel) });
}

// POST /api/my/change-requests   body: { field, new_value, connection_id (only for connection_type), reason }
export async function createMyChangeRequest(req, res) {
  const customerId = req.user.customerId;
  const body = req.body || {};
  const field = requireOneOf(body.field, Object.keys(CHANGE_FIELDS), 'What to change');
  const reason = optionalText(body.reason, 'Reason', 500);

  const { rows } = await query('SELECT id, email, phone, customer_type FROM customers WHERE id = $1', [customerId]);
  const customer = rows[0];
  if (!customer) throw new ApiError(404, 'Customer profile not found');

  let newValue;
  let oldValue;
  let connectionId = null;

  if (field === 'email') {
    newValue = requireEmail(body.new_value, 'New email');
    oldValue = customer.email;
    const taken = await query(
      'SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 AND (customer_id IS NULL OR customer_id <> $3)',
      [newValue, req.user.id, customerId]
    );
    if (taken.rows[0]) throw new ApiError(409, 'That email is already used by another account');
  } else if (field === 'phone') {
    newValue = requirePhone(body.new_value, 'New phone number');
    oldValue = customer.phone;
  } else if (field === 'customer_type') {
    newValue = requireOneOf(body.new_value, CUSTOMER_TYPES, 'New customer type');
    oldValue = customer.customer_type;
  } else {
    if (!clean(body.connection_id)) throw new ApiError(400, 'Please choose which meter to change');
    connectionId = requireUuid(body.connection_id, 'meter');
    newValue = requireOneOf(body.new_value, CONNECTION_TYPES, 'New connection type');
    const connection = await query('SELECT connection_type FROM connections WHERE id = $1 AND customer_id = $2', [
      connectionId,
      customerId,
    ]);
    if (!connection.rows[0]) throw new ApiError(404, 'Meter not found'); // not your meter
    oldValue = connection.rows[0].connection_type;
  }

  if (String(oldValue ?? '').toLowerCase() === newValue.toLowerCase()) {
    throw new ApiError(400, `That is already your ${CHANGE_FIELDS[field].toLowerCase()}`);
  }

  const inserted = await query(
    `INSERT INTO profile_change_requests (customer_id, field, connection_id, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [customerId, field, connectionId, oldValue, newValue, reason]
  );
  res.status(201).json({ data: await findChangeRequest(inserted.rows[0].id) });
}

// ---------------------------------------------------------------------
// Admin side  (/api/change-requests)
// ---------------------------------------------------------------------

// GET /api/change-requests?status=Pending
export async function listChangeRequests(req, res) {
  const status = optionalOneOf(req.query.status, CHANGE_STATUSES, 'status');
  const { rows } = await query(
    `${CHANGE_SELECT} WHERE ($1::text IS NULL OR r.status = $1)
     ORDER BY (r.status = 'Pending') DESC, r.created_at DESC LIMIT 100`,
    [status]
  );
  res.json({ data: rows.map(withLabel) });
}

// POST /api/change-requests/:id/approve   body: { note } (optional)
// Makes the change and marks the request Approved - both or neither (one transaction).
export async function approveChangeRequest(req, res) {
  const id = requireUuid(req.params.id, 'change request id');
  const note = optionalText(req.body?.note, 'Note', 500);

  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM profile_change_requests WHERE id = $1 FOR UPDATE', [id]);
    const request = rows[0];
    if (!request) throw new ApiError(404, 'Change request not found');
    if (request.status !== 'Pending') throw new ApiError(409, `This request was already ${request.status.toLowerCase()}`);

    if (request.field === 'email') {
      const customer = await client.query('SELECT user_id FROM customers WHERE id = $1', [request.customer_id]);
      await client.query('UPDATE customers SET email = $1 WHERE id = $2', [request.new_value, request.customer_id]);
      // The login email changes too (the unique rule stops a duplicate with a clear message)
      await client.query('UPDATE users SET email = $1 WHERE id = $2 OR customer_id = $3', [
        request.new_value,
        customer.rows[0]?.user_id ?? null,
        request.customer_id,
      ]);
    } else if (request.field === 'connection_type') {
      await client.query('UPDATE connections SET connection_type = $1 WHERE id = $2 AND customer_id = $3', [
        request.new_value,
        request.connection_id,
        request.customer_id,
      ]);
    } else {
      // phone or customer_type: the column name comes from our own fixed list, never from the user
      const column = request.field === 'phone' ? 'phone' : 'customer_type';
      await client.query(`UPDATE customers SET ${column} = $1 WHERE id = $2`, [request.new_value, request.customer_id]);
    }

    await client.query(
      `UPDATE profile_change_requests SET status = 'Approved', admin_note = $1, decided_by = $2, decided_at = NOW()
       WHERE id = $3`,
      [note, req.user.id, id]
    );
  });

  const result = await findChangeRequest(id);
  await tellCustomer(result, true);
  res.json({ data: result });
}

// POST /api/change-requests/:id/reject   body: { note } (optional, shown to the customer)
export async function rejectChangeRequest(req, res) {
  const id = requireUuid(req.params.id, 'change request id');
  const note = optionalText(req.body?.note, 'Note', 500);

  const { rows } = await query(
    `UPDATE profile_change_requests SET status = 'Rejected', admin_note = $1, decided_by = $2, decided_at = NOW()
     WHERE id = $3 AND status = 'Pending' RETURNING id`,
    [note, req.user.id, id]
  );
  if (!rows[0]) {
    const existing = await findChangeRequest(id); // 404 if it does not exist
    throw new ApiError(409, `This request was already ${existing.status.toLowerCase()}`);
  }

  const result = await findChangeRequest(id);
  await tellCustomer(result, false);
  res.json({ data: result });
}

// Email the customer the answer (after an approved email change, this goes to the NEW address)
async function tellCustomer(request, approved) {
  await notifyCustomer(request.customer_id, {
    kind: 'profile',
    title: `${request.field_label} change ${approved ? 'approved' : 'not approved'}`,
    message: approved
      ? `Your ${request.field_label.toLowerCase()} is now ${request.new_value}.`
      : `Your ${request.field_label.toLowerCase()} stays the same.${request.admin_note ? ` Office note: ${request.admin_note}` : ''}`,
    link: '/my/profile',
    refId: request.id,
  });
  const to = clean(request.customer_email);
  if (!to) return;
  const { subject, html } = changeDecisionEmail(request.customer_name, request.field_label, request.new_value, approved, request.admin_note);
  await sendEmail({ to, name: request.customer_name, subject, html });
}
