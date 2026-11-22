// Extra feature: account statement (every bill, late fee and payment with a running balance)
// The rows and the running balance come from the database view customer_statement
// (database/11_extra_features.sql). This file only reads it.
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { requireUuid } from '../utils/validate.js';

/** Statement lines of one customer, oldest first, plus totals. */
async function loadStatement(customerId) {
  await query('SELECT check_overdue_bills()'); // also adds late fees that are due

  const customer = await query(
    'SELECT id, customer_number, full_name, customer_type, address FROM customers WHERE id = $1',
    [customerId]
  );
  if (!customer.rows[0]) throw new ApiError(404, 'Customer not found');

  const { rows } = await query(
    `SELECT entry_date, entry_type, reference, bill_id, description, debit, credit, balance
     FROM customer_statement
     WHERE customer_id = $1
     ORDER BY entry_date, sort_order, reference`,
    [customerId]
  );

  const lines = rows.map((row, index) => ({ id: index + 1, ...row }));
  const totalCharged = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalPaid = lines.reduce((sum, line) => sum + line.credit, 0);

  return {
    customer: customer.rows[0],
    lines,
    total_charged: Math.round(totalCharged * 100) / 100,
    total_paid: Math.round(totalPaid * 100) / 100,
    balance: lines.length ? lines[lines.length - 1].balance : 0, // the running balance of the last line
  };
}

// GET /api/customers/:id/statement   (admin)
export async function getCustomerStatement(req, res) {
  const id = requireUuid(req.params.id, 'customer id');
  res.json({ data: await loadStatement(id) });
}

// GET /api/my/statement   (customer: always their own, the id comes from the login token)
export async function getMyStatement(req, res) {
  if (!req.user.customerId) throw new ApiError(403, 'Your login is not linked to a customer profile');
  res.json({ data: await loadStatement(req.user.customerId) });
}
