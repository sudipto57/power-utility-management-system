// Feature 4 (Customer Management) + Feature 5 (Customer Profile) + Feature 14 (search & filter)
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../utils/constants.js';
import { readSqlFileStatus, saveCustomersToSqlFile, scheduleSave } from '../utils/saveCustomersToSql.js';
import env from '../config/env.js';
import {
  clean,
  optionalEmail,
  optionalOneOf,
  requireEmail,
  requireOneOf,
  requireNewPassword,
  requirePhone,
  requireText,
  requireUsername,
  requireUuid,
} from '../utils/validate.js';

// Shared by the list and the single-customer endpoints
const CUSTOMER_SELECT = `
  SELECT c.id, c.customer_number, c.full_name, c.phone, c.email, c.address,
         c.customer_type, c.status, c.user_id, c.created_at, c.updated_at,
         u.username, u.last_login,
         (SELECT COUNT(*) FROM connections co WHERE co.customer_id = c.id) AS connections_count,
         COALESCE(s.total_billed, 0)       AS total_billed,
         COALESCE(s.total_paid, 0)         AS total_paid,
         COALESCE(s.outstanding_amount, 0) AS outstanding_amount,
         COALESCE(s.unpaid_bills, 0)       AS unpaid_bills
  FROM customers c
  LEFT JOIN users u ON u.id = c.user_id
  LEFT JOIN customer_billing_summary s ON s.customer_id = c.id`;

async function findCustomer(id) {
  const { rows } = await query(`${CUSTOMER_SELECT} WHERE c.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found');
  return rows[0];
}

// GET /api/customers?search=&status=&type=   (newest customers first)
export async function listCustomers(req, res) {
  const search = clean(req.query.search);
  const status = optionalOneOf(req.query.status, CUSTOMER_STATUSES, 'status');
  const type = optionalOneOf(req.query.type, CUSTOMER_TYPES, 'type');

  const { rows } = await query(
    `${CUSTOMER_SELECT}
     WHERE ($1::text IS NULL OR c.customer_number ILIKE $1 OR c.full_name ILIKE $1
            OR c.phone ILIKE $1 OR c.email ILIKE $1 OR c.address ILIKE $1)
       AND ($2::text IS NULL OR c.status = $2)
       AND ($3::text IS NULL OR c.customer_type = $3)
     -- newest first: the number at the end of CUST-201 is compared as a number, so new sign-ups are on top
     ORDER BY COALESCE(substring(c.customer_number FROM '[0-9]+$')::int, 0) DESC`,
    [search ? `%${search}%` : null, status, type]
  );
  res.json({ data: rows });
}

// GET /api/customers/sql-file  -> is database/04_sample_data.sql up to date with the website sign-ups?
export async function getSqlFileStatus(req, res) {
  res.json({ data: await readSqlFileStatus() });
}

// POST /api/customers/sql-file  -> "Save now": copy the website customers into the file right away
export async function saveSqlFileNow(req, res) {
  if (!env.saveCustomersToSqlFile) {
    throw new ApiError(409, 'This server does not keep the SQL file. The laptop copies new sign-ups automatically when it is on.');
  }
  try {
    await saveCustomersToSqlFile();
  } catch (err) {
    throw new ApiError(409, `Could not save the file: ${err.message}`);
  }
  res.json({ data: await readSqlFileStatus() });
}

// GET /api/customers/:id  -> profile + connections + bills + service requests
export async function getCustomer(req, res) {
  const id = requireUuid(req.params.id, 'customer id');
  await query('SELECT check_overdue_bills()');
  const customer = await findCustomer(id);

  const [connections, bills, requests] = await Promise.all([
    query(
      `SELECT co.id, co.meter_number, co.connection_type, co.installation_date, co.status, co.notes,
              lr.current_reading AS last_reading, lr.reading_date AS last_reading_date
       FROM connections co
       LEFT JOIN LATERAL (
         SELECT mr.current_reading, mr.reading_date FROM meter_readings mr
         WHERE mr.connection_id = co.id AND mr.status = 'Verified'
         ORDER BY mr.reading_date DESC, mr.created_at DESC LIMIT 1
       ) lr ON TRUE
       WHERE co.customer_id = $1
       ORDER BY co.installation_date`,
      [id]
    ),
    query(
      `SELECT b.id, b.bill_number, b.billing_period_start, b.billing_period_end, b.due_date,
              b.total_amount, b.status, co.meter_number
       FROM bills b JOIN connections co ON co.id = b.connection_id
       WHERE co.customer_id = $1
       ORDER BY b.billing_period_start DESC, b.bill_number DESC`,
      [id]
    ),
    query(
      `SELECT id, request_number, category, priority, status, description, created_at
       FROM service_requests WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
  ]);

  res.json({ data: { ...customer, connections: connections.rows, bills: bills.rows, requests: requests.rows } });
}

// POST /api/customers
// body: { full_name, phone, email, address, customer_type, status, create_login, username, password }
export async function createCustomer(req, res) {
  const body = req.body || {};
  const fullName = requireText(body.full_name, 'Full name', 100);
  const phone = requirePhone(body.phone);
  const address = requireText(body.address, 'Address', 500);
  const customerType = requireOneOf(body.customer_type, CUSTOMER_TYPES, 'Customer type');
  const status = optionalOneOf(body.status, CUSTOMER_STATUSES, 'Status') || 'Active';
  const createLogin = body.create_login === true || body.create_login === 'true';

  // A login needs an email, a username and a password
  const email = createLogin ? requireEmail(body.email) : optionalEmail(body.email);
  let username = null;
  let passwordHash = null;
  if (createLogin) {
    // Same username and password rules as the website sign up
    username = requireUsername(body.username);
    const password = requireNewPassword(body.password, { username, email, fullName, phone });
    passwordHash = await bcrypt.hash(password, 10);
  }

  const newId = await withTransaction(async (client) => {
    const customerNumber = await generateNumber(client, 'customer');

    let userId = null;
    if (createLogin) {
      const userResult = await client.query(
        `INSERT INTO users (username, email, full_name, role, status, password_hash)
         VALUES ($1, $2, $3, 'customer', $4, $5) RETURNING id`,
        [username, email, fullName, status, passwordHash]
      );
      userId = userResult.rows[0].id;
    }

    const customerResult = await client.query(
      `INSERT INTO customers (customer_number, full_name, phone, email, address, customer_type, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [customerNumber, fullName, phone, email, address, customerType, status, userId]
    );
    const customerId = customerResult.rows[0].id;

    if (userId) {
      await client.query('UPDATE users SET customer_id = $1 WHERE id = $2', [customerId, userId]);
    }
    return customerId;
  }, req.user.id);

  res.status(201).json({ data: await findCustomer(newId) });
}

// PUT /api/customers/:id   (send only the fields you want to change)
export async function updateCustomer(req, res) {
  const id = requireUuid(req.params.id, 'customer id');
  const body = req.body || {};
  const existing = await findCustomer(id);

  const changes = {};
  if ('full_name' in body) changes.full_name = requireText(body.full_name, 'Full name', 100);
  if ('phone' in body) changes.phone = requirePhone(body.phone);
  if ('email' in body) changes.email = existing.user_id ? requireEmail(body.email) : optionalEmail(body.email);
  if ('address' in body) changes.address = requireText(body.address, 'Address', 500);
  if ('customer_type' in body) changes.customer_type = requireOneOf(body.customer_type, CUSTOMER_TYPES, 'Customer type');
  if ('status' in body) changes.status = requireOneOf(body.status, CUSTOMER_STATUSES, 'Status');

  const keys = Object.keys(changes);
  if (keys.length === 0) throw new ApiError(400, 'Nothing to update');

  await withTransaction(async (client) => {
    // Column names come from our own fixed list above, values are parameters
    const setSql = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    await client.query(`UPDATE customers SET ${setSql} WHERE id = $${keys.length + 1}`, [...keys.map((k) => changes[k]), id]);

    // Keep the customer's login (if any) in sync: name, email, active/inactive
    if (existing.user_id) {
      await client.query(
        `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), status = COALESCE($3, status)
         WHERE id = $4`,
        [changes.full_name ?? null, changes.email ?? null, changes.status ?? null, existing.user_id]
      );
    }
  }, req.user.id);

  res.json({ data: await findCustomer(id) });
}

// DELETE /api/customers/:id
// A customer with bills is NOT deleted (that would erase billing history). Deactivate instead.
export async function deleteCustomer(req, res) {
  const id = requireUuid(req.params.id, 'customer id');
  const customer = await findCustomer(id);

  const { rows } = await query(
    `SELECT COUNT(*) AS bill_count FROM bills b JOIN connections co ON co.id = b.connection_id WHERE co.customer_id = $1`,
    [id]
  );
  if (rows[0].bill_count > 0) {
    throw new ApiError(
      409,
      `${customer.full_name} has ${rows[0].bill_count} bill(s), so the record can't be deleted. Set the status to Inactive instead.`,
      'HAS_BILLS'
    );
  }

  await withTransaction(async (client) => {
    await client.query('DELETE FROM customers WHERE id = $1', [id]); // also removes connections, readings, requests
    await client.query("DELETE FROM users WHERE role = 'customer' AND (id = $1 OR customer_id = $2)", [customer.user_id, id]);
  }, req.user.id);

  res.json({ data: { id, deleted: true } });
}

// DELETE /api/customers/:id/permanent   body: { confirm: "CUST-207" }   (admin only)
// Deletes the customer FOR EVER: profile, login, meters, readings, bills, payments, requests,
// inbox messages and their activity-log history. The admin must type the customer number to confirm.
// Afterwards the customer also leaves database/04_sample_data.sql (see utils/saveCustomersToSql.js).
export async function deleteCustomerForever(req, res) {
  const id = requireUuid(req.params.id, 'customer id');
  const customer = await findCustomer(id);
  if (clean(req.body?.confirm)?.toUpperCase() !== customer.customer_number) {
    throw new ApiError(400, `Type the customer number ${customer.customer_number} to confirm`);
  }

  await withTransaction(async (client) => {
    // Every row that belongs to this customer, so its old history can leave the activity log too
    const { rows } = await client.query(
      `SELECT id FROM customers WHERE id = $1
       UNION ALL SELECT id FROM connections WHERE customer_id = $1
       UNION ALL SELECT mr.id FROM meter_readings mr JOIN connections co ON co.id = mr.connection_id WHERE co.customer_id = $1
       UNION ALL SELECT mp.id FROM meter_replacements mp JOIN connections co ON co.id = mp.connection_id WHERE co.customer_id = $1
       UNION ALL SELECT b.id FROM bills b JOIN connections co ON co.id = b.connection_id WHERE co.customer_id = $1
       UNION ALL SELECT p.id FROM payments p JOIN bills b ON b.id = p.bill_id JOIN connections co ON co.id = b.connection_id WHERE co.customer_id = $1
       UNION ALL SELECT a.id FROM bill_adjustments a JOIN bills b ON b.id = a.bill_id JOIN connections co ON co.id = b.connection_id WHERE co.customer_id = $1
       UNION ALL SELECT id FROM service_requests WHERE customer_id = $1`,
      [id]
    );
    const rowIds = rows.map((r) => r.id);

    // Switch the activity log off for this delete (it would copy all the personal data into audit_log)
    await client.query("SELECT set_config('app.skip_audit', 'on', true)");
    await client.query('DELETE FROM audit_log WHERE record_id = ANY($1::uuid[])', [rowIds]);
    // Deleting the customer also deletes (ON DELETE CASCADE) meters, readings, bills, payments,
    // late fees, requests, comments, change requests and inbox messages
    await client.query('DELETE FROM customers WHERE id = $1', [id]);
    // Their login (and its email codes)
    await client.query("DELETE FROM users WHERE role = 'customer' AND (id = $1 OR customer_id = $2)", [customer.user_id, id]);
    await client.query("SELECT set_config('app.skip_audit', 'off', true)");

    // Remember only the number, so the customer also leaves 04_sample_data.sql
    await client.query(
      'INSERT INTO deleted_customers (customer_number, deleted_by) VALUES ($1, $2) ON CONFLICT (customer_number) DO NOTHING',
      [customer.customer_number, req.user.id]
    );
    // One line in the activity log, without any personal details
    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values)
       VALUES ('customers', $1, 'DELETE', $2, $3)`,
      [id, req.user.id, JSON.stringify({ customer_number: customer.customer_number, deleted_for_ever: true })]
    );
  }, req.user.id);

  scheduleSave(); // take the customer out of database/04_sample_data.sql as well
  res.json({ data: { id, customer_number: customer.customer_number, deleted: true } });
}
