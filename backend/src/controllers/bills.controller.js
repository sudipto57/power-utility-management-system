// Feature 9 (Bill Generation) + Feature 10 (Bill List) + Feature 11 (Payment Status) + Feature 14 (search)
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { BILL_STATUSES, PAYMENT_METHODS } from '../utils/constants.js';
import { clean, optionalDate, optionalOneOf, optionalText, requireUuid } from '../utils/validate.js';
import { billEmail, sendEmail } from '../utils/email.js';

// One bill with its customer, meter, the reading it came from and how much is paid.
// A bill belongs to the reading taken the day after the billing period ends.
export const BILL_SELECT = `
  SELECT b.id, b.bill_number, b.connection_id, b.billing_period_start, b.billing_period_end, b.due_date,
         b.fixed_charge, b.variable_charge, b.tax_amount, b.total_amount, b.status, b.notes, b.created_at,
         co.meter_number, co.connection_type,
         c.id AS customer_id, c.customer_number, c.full_name AS customer_name, c.customer_type,
         c.address AS customer_address, c.phone AS customer_phone, c.email AS customer_email,
         mr.id AS reading_id, mr.previous_reading, mr.current_reading,
         (mr.current_reading - mr.previous_reading) AS consumption, mr.reading_date,
         COALESCE(p.paid, 0) AS paid_amount,
         GREATEST(b.total_amount - COALESCE(p.paid, 0), 0) AS balance
  FROM bills b
  JOIN connections co ON co.id = b.connection_id
  JOIN customers c ON c.id = co.customer_id
  LEFT JOIN meter_readings mr
         ON mr.connection_id = b.connection_id AND mr.reading_date = b.billing_period_end + 1 AND mr.status = 'Verified'
  LEFT JOIN LATERAL (
    SELECT SUM(pay.amount) AS paid FROM payments pay WHERE pay.bill_id = b.id AND pay.status = 'Completed'
  ) p ON TRUE`;

/** Loads one bill (+ its payments). Throws 404 if it does not exist. */
export async function findBill(id) {
  const { rows } = await query(`${BILL_SELECT} WHERE b.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Bill not found');
  const payments = await query(
    `SELECT pay.id, pay.payment_number, pay.amount, pay.method, pay.payment_date, pay.reference, pay.status,
            u.full_name AS recorded_by_name
     FROM payments pay LEFT JOIN users u ON u.id = pay.recorded_by
     WHERE pay.bill_id = $1 ORDER BY pay.payment_date, pay.created_at`,
    [id]
  );
  return { ...rows[0], payments: payments.rows };
}

/**
 * Works out a bill for one meter reading WITHOUT saving it.
 * Uses the database function calculate_bill_amount() so the maths lives in one place.
 */
async function calculateFromReading(db, readingId, { lock = false } = {}) {
  const readingResult = await db.query(
    `SELECT mr.id, mr.connection_id, mr.previous_reading, mr.current_reading, mr.reading_date, mr.status,
            (mr.current_reading - mr.previous_reading) AS consumption,
            co.meter_number, co.connection_type, c.full_name AS customer_name, c.customer_number, c.customer_type
     FROM meter_readings mr
     JOIN connections co ON co.id = mr.connection_id
     JOIN customers c ON c.id = co.customer_id
     WHERE mr.id = $1 ${lock ? 'FOR UPDATE OF mr' : ''}`,
    [readingId]
  );
  const reading = readingResult.rows[0];
  if (!reading) throw new ApiError(404, 'Meter reading not found');
  if (reading.status !== 'Verified') throw new ApiError(400, 'Only verified readings can be billed');

  const existing = await db.query(
    'SELECT bill_number FROM bills WHERE connection_id = $1 AND billing_period_end = $2::date - 1',
    [reading.connection_id, reading.reading_date]
  );
  if (existing.rows[0]) {
    throw new ApiError(409, `This reading is already billed (${existing.rows[0].bill_number})`, 'ALREADY_BILLED');
  }

  // Billing period: from the previous reading date up to the day before this reading
  const periodResult = await db.query(
    `SELECT COALESCE(
              (SELECT MAX(prev.reading_date) FROM meter_readings prev
               WHERE prev.connection_id = $1 AND prev.status = 'Verified' AND prev.reading_date < $2::date),
              ($2::date - INTERVAL '1 month')::date
            ) AS period_start,
            ($2::date - 1) AS period_end,
            to_char(($2::date - 1), 'Mon YYYY') AS period_label`,
    [reading.connection_id, reading.reading_date]
  );
  const period = periodResult.rows[0];

  const calcResult = await db.query('SELECT * FROM calculate_bill_amount($1, $2, $3)', [
    reading.customer_type,
    reading.connection_type,
    reading.consumption,
  ]);
  const amounts = calcResult.rows[0];

  return {
    reading,
    billing_period_start: period.period_start,
    billing_period_end: period.period_end,
    notes: `${period.period_label} - ${reading.consumption} kWh`,
    ...amounts,
  };
}

// GET /api/bills?search=&status=&customer_id=
export async function listBills(req, res) {
  const search = clean(req.query.search);
  const status = optionalOneOf(req.query.status, BILL_STATUSES, 'status');
  const customerId = clean(req.query.customer_id) ? requireUuid(req.query.customer_id, 'customer id') : null;

  await query('SELECT check_overdue_bills()'); // keep Overdue status up to date
  const { rows } = await query(
    `${BILL_SELECT}
     WHERE ($1::text IS NULL OR b.bill_number ILIKE $1 OR c.full_name ILIKE $1
            OR c.customer_number ILIKE $1 OR co.meter_number ILIKE $1)
       AND ($2::text IS NULL OR b.status = $2)
       AND ($3::uuid IS NULL OR c.id = $3)
     ORDER BY b.billing_period_start DESC, b.bill_number DESC`,
    [search ? `%${search}%` : null, status, customerId]
  );
  res.json({ data: rows });
}

// GET /api/bills/:id
export async function getBill(req, res) {
  const id = requireUuid(req.params.id, 'bill id');
  await query('SELECT check_overdue_bills()');
  res.json({ data: await findBill(id) });
}

// POST /api/bills/preview   body: { reading_id }   -> shows the amounts, saves nothing
export async function previewBill(req, res) {
  const readingId = requireUuid(req.body?.reading_id, 'reading');
  const result = await calculateFromReading({ query }, readingId);
  res.json({ data: result });
}

// POST /api/bills/generate   body: { reading_id, due_date (optional, default today + 20 days) }
export async function generateBill(req, res) {
  const readingId = requireUuid(req.body?.reading_id, 'reading');
  const dueDate = optionalDate(req.body?.due_date, 'Due date');

  const billId = await withTransaction(async (client) => {
    const calc = await calculateFromReading(client, readingId, { lock: true });

    const dueResult = await client.query(
      'SELECT COALESCE($1::date, CURRENT_DATE + 20) AS due_date, COALESCE($1::date, CURRENT_DATE + 20) < CURRENT_DATE AS in_past',
      [dueDate]
    );
    if (dueResult.rows[0].in_past) throw new ApiError(400, 'Due date cannot be in the past');

    const billNumber = await generateNumber(client, 'bill');
    const { rows } = await client.query(
      `INSERT INTO bills (bill_number, connection_id, billing_period_start, billing_period_end, due_date,
                          fixed_charge, variable_charge, tax_amount, total_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Unpaid', $10) RETURNING id`,
      [
        billNumber,
        calc.reading.connection_id,
        calc.billing_period_start,
        calc.billing_period_end,
        dueResult.rows[0].due_date,
        calc.fixed_charge,
        calc.variable_charge,
        calc.tax_amount,
        calc.total_amount,
        calc.notes,
      ]
    );
    return rows[0].id;
  });

  // Email the new bill to the customer (if they have an email address).
  // The bill is already saved, so an email problem never undoes it.
  const bill = await findBill(billId);
  let emailSent = false;
  if (bill.customer_email) {
    const { subject, html } = billEmail(bill);
    emailSent = await sendEmail({ to: bill.customer_email, name: bill.customer_name, subject, html });
  }
  res.status(201).json({ data: { ...bill, email_sent: emailSent } });
}

// POST /api/bills/:id/mark-paid   body: { method, reference, payment_date }  (all optional)
// Records ONE payment for the remaining balance; the database trigger then sets status = Paid.
export async function markBillPaid(req, res) {
  const id = requireUuid(req.params.id, 'bill id');
  const method = optionalOneOf(req.body?.method, PAYMENT_METHODS, 'Payment method') || 'Cash';
  const reference = optionalText(req.body?.reference, 'Reference', 100);
  const paymentDate = optionalDate(req.body?.payment_date, 'Payment date');

  await withTransaction(async (client) => {
    const billResult = await client.query('SELECT id, total_amount FROM bills WHERE id = $1 FOR UPDATE', [id]);
    const bill = billResult.rows[0];
    if (!bill) throw new ApiError(404, 'Bill not found');

    const paidResult = await client.query(
      "SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE bill_id = $1 AND status = 'Completed'",
      [id]
    );
    const balance = Math.round((bill.total_amount - paidResult.rows[0].paid) * 100) / 100;
    if (balance <= 0) throw new ApiError(409, 'This bill is already fully paid');

    const paymentNumber = await generateNumber(client, 'payment');
    await client.query(
      `INSERT INTO payments (payment_number, bill_id, amount, method, payment_date, reference, status, recorded_by)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, 'Completed', $7)`,
      [paymentNumber, id, balance, method, paymentDate, reference, req.user.id]
    );
  });

  res.json({ data: await findBill(id) });
}

// POST /api/bills/:id/mark-unpaid
// Removes the bill's payments; the trigger sets status back to Unpaid (or Overdue if late).
export async function markBillUnpaid(req, res) {
  const id = requireUuid(req.params.id, 'bill id');

  await withTransaction(async (client) => {
    const billResult = await client.query('SELECT id FROM bills WHERE id = $1 FOR UPDATE', [id]);
    if (!billResult.rows[0]) throw new ApiError(404, 'Bill not found');

    const deleted = await client.query('DELETE FROM payments WHERE bill_id = $1', [id]);
    if (deleted.rowCount === 0) throw new ApiError(409, 'This bill has no payments to remove');

    await client.query('SELECT check_overdue_bills()');
  });

  res.json({ data: await findBill(id) });
}
