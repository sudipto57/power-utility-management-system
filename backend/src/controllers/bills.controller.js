// Feature 9 (Bill Generation) + Feature 10 (Bill List) + Feature 11 (Payment Status) + Feature 14 (search)
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { BILL_STATUSES, PAYMENT_METHODS } from '../utils/constants.js';
import { clean, optionalDate, optionalOneOf, optionalText, requireText, requireUuid } from '../utils/validate.js';
import { billEmail, formatDate, formatTaka, reminderEmail, sendEmail } from '../utils/email.js';
import { notifyCustomer } from '../utils/notify.js';

// One bill with its customer, meter, the reading it came from and how much is paid.
// A bill belongs to the reading taken the day after the billing period ends.
// Late fee, amount due, paid and balance come from the database view bill_balance
// (database/11_extra_features.sql), so the money maths stays in SQL.
export const BILL_SELECT = `
  SELECT b.id, b.bill_number, b.connection_id, b.billing_period_start, b.billing_period_end, b.due_date,
         b.fixed_charge, b.variable_charge, b.tax_amount, b.total_amount, b.status, b.notes, b.created_at,
         meter_number_on(co.id, b.billing_period_end) AS meter_number, co.connection_type,
         c.id AS customer_id, c.customer_number, c.full_name AS customer_name, c.customer_type,
         c.address AS customer_address, c.phone AS customer_phone, c.email AS customer_email,
         mr.id AS reading_id, mr.previous_reading, mr.current_reading,
         (mr.current_reading - mr.previous_reading) AS consumption, mr.reading_date,
         bb.late_fee, bb.waived, bb.amount_due, bb.paid_amount, bb.balance,
         (SELECT COUNT(*) FROM payments w WHERE w.bill_id = b.id AND w.status = 'Pending') AS waiting_payments
  FROM bills b
  JOIN bill_balance bb ON bb.bill_id = b.id
  JOIN connections co ON co.id = b.connection_id
  JOIN customers c ON c.id = co.customer_id
  LEFT JOIN meter_readings mr
         ON mr.connection_id = b.connection_id AND mr.reading_date = b.billing_period_end + 1 AND mr.status = 'Verified'`;

/** Loads one bill (+ its payments and late fee / waiver). Throws 404 if it does not exist. */
export async function findBill(id) {
  const { rows } = await query(`${BILL_SELECT} WHERE b.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Bill not found');
  const adjustments = await query(
    `SELECT a.id, a.adjustment_type, a.amount, a.reason, a.created_at, u.full_name AS approved_by_name
     FROM bill_adjustments a LEFT JOIN users u ON u.id = a.approved_by
     WHERE a.bill_id = $1 ORDER BY a.created_at`,
    [id]
  );
  const payments = await query(
    `SELECT pay.id, pay.payment_number, pay.amount, pay.method, pay.payment_date, pay.reference, pay.status,
            u.full_name AS recorded_by_name
     FROM payments pay LEFT JOIN users u ON u.id = pay.recorded_by
     WHERE pay.bill_id = $1 ORDER BY pay.payment_date, pay.created_at`,
    [id]
  );
  return { ...rows[0], payments: payments.rows, adjustments: adjustments.rows };
}

/**
 * Works out a bill for one meter reading WITHOUT saving it.
 * Uses the database function calculate_bill_amount() so the maths lives in one place.
 */
async function calculateFromReading(db, readingId, { lock = false } = {}) {
  const readingResult = await db.query(
    `SELECT mr.id, mr.connection_id, mr.previous_reading, mr.current_reading, mr.reading_date, mr.status,
            (mr.current_reading - mr.previous_reading) AS consumption,
            meter_number_on(co.id, mr.reading_date) AS meter_number, co.connection_type,
            c.full_name AS customer_name, c.customer_number, c.customer_type
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

  // The tariff in force at the end of the billing period (not today's), see 11_extra_features.sql
  const calcResult = await db.query('SELECT * FROM calculate_bill_amount($1, $2, $3, $4::date)', [
    reading.customer_type,
    reading.connection_type,
    reading.consumption,
    period.period_end,
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

// GET /api/bills?search=&status=&customer_id=&waiting=yes   (waiting=yes: a customer paid online, staff must confirm)
export async function listBills(req, res) {
  const waiting = clean(req.query.waiting) === 'yes';
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
       AND (NOT $4::boolean OR EXISTS (SELECT 1 FROM payments w WHERE w.bill_id = b.id AND w.status = 'Pending'))
     ORDER BY b.billing_period_start DESC, b.bill_number DESC`,
    [search ? `%${search}%` : null, status, customerId, waiting]
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
  }, req.user.id);

  // Email the new bill to the customer (if they have an email address).
  // The bill is already saved, so an email problem never undoes it.
  const bill = await findBill(billId);
  let emailSent = false;
  if (bill.customer_email) {
    const { subject, html } = billEmail(bill);
    emailSent = await sendEmail({ to: bill.customer_email, name: bill.customer_name, subject, html });
  }
  await notifyCustomer(bill.customer_id, {
    kind: 'bill',
    title: `New bill ${bill.bill_number}`,
    message: `${bill.notes}. Total ${formatTaka(bill.total_amount)}, please pay by ${formatDate(bill.due_date)}.`,
    link: `/my/bills/${bill.id}`,
    refId: bill.id,
  });
  res.status(201).json({ data: { ...bill, email_sent: emailSent } });
}

// POST /api/bills/:id/mark-paid   body: { method, reference, payment_date }  (all optional)
// Records ONE payment for the remaining balance (late fee included); the database trigger then sets status = Paid.
export async function markBillPaid(req, res) {
  const id = requireUuid(req.params.id, 'bill id');
  const method = optionalOneOf(req.body?.method, PAYMENT_METHODS, 'Payment method') || 'Cash';
  const reference = optionalText(req.body?.reference, 'Reference', 100);
  const paymentDate = optionalDate(req.body?.payment_date, 'Payment date');

  await withTransaction(async (client) => {
    const billResult = await client.query('SELECT id FROM bills WHERE id = $1 FOR UPDATE', [id]);
    if (!billResult.rows[0]) throw new ApiError(404, 'Bill not found');

    // A customer's online payment must be confirmed or rejected first
    const waiting = await client.query("SELECT 1 FROM payments WHERE bill_id = $1 AND status = 'Pending'", [id]);
    if (waiting.rows[0]) {
      throw new ApiError(409, 'The customer paid online and it is waiting. Confirm or reject that payment first');
    }

    // A bill that became late since anyone last opened it gets its late fee first
    await client.query('SELECT check_overdue_bills()');

    // What is still owed (bill + late fee - waiver - payments) comes from the bill_balance view
    const balanceResult = await client.query('SELECT balance FROM bill_balance WHERE bill_id = $1', [id]);
    const balance = balanceResult.rows[0].balance;
    if (balance <= 0) throw new ApiError(409, 'This bill is already fully paid');

    const paymentNumber = await generateNumber(client, 'payment');
    await client.query(
      `INSERT INTO payments (payment_number, bill_id, amount, method, payment_date, reference, status, recorded_by)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, 'Completed', $7)`,
      [paymentNumber, id, balance, method, paymentDate, reference, req.user.id]
    );
  }, req.user.id);

  res.json({ data: await findBill(id) });
}

// POST /api/bills/:id/mark-unpaid
// Removes the bill's completed payments; the trigger sets status back to Unpaid (or Overdue if late).
// Failed online payments stay as history.
export async function markBillUnpaid(req, res) {
  const id = requireUuid(req.params.id, 'bill id');

  await withTransaction(async (client) => {
    const billResult = await client.query('SELECT id FROM bills WHERE id = $1 FOR UPDATE', [id]);
    if (!billResult.rows[0]) throw new ApiError(404, 'Bill not found');

    const deleted = await client.query("DELETE FROM payments WHERE bill_id = $1 AND status = 'Completed'", [id]);
    if (deleted.rowCount === 0) throw new ApiError(409, 'This bill has no payments to remove');

    await client.query('SELECT check_overdue_bills()');
  }, req.user.id);

  res.json({ data: await findBill(id) });
}

// POST /api/bills/:id/waive-late-fee   body: { reason }
// Cancels the bill's late fee by adding a 'Waiver' row of the same amount (minus) to bill_adjustments.
// The late fee row stays, so the history shows both. The trigger then updates the bill's status.
export async function waiveLateFee(req, res) {
  const id = requireUuid(req.params.id, 'bill id');
  const reason = requireText(req.body?.reason, 'Reason', 500);

  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT late_fee, waived FROM bill_balance WHERE bill_id = $1', [id]);
    if (!rows[0]) throw new ApiError(404, 'Bill not found');
    if (rows[0].late_fee <= 0) throw new ApiError(409, 'This bill has no late fee');
    if (rows[0].waived > 0) throw new ApiError(409, 'The late fee of this bill is already waived');

    await client.query(
      `INSERT INTO bill_adjustments (bill_id, adjustment_type, amount, reason, approved_by)
       VALUES ($1, 'Waiver', -$2::numeric, $3, $4)`,
      [id, rows[0].late_fee, reason, req.user.id]
    );
  }, req.user.id);

  res.json({ data: await findBill(id) });
}

// ---------------------------------------------------------------------
// Online payments from customers ("Pay now" on My Bills) wait as Pending.
// ---------------------------------------------------------------------

async function findPendingPayment(client, billId, paymentId) {
  const { rows } = await client.query(
    `SELECT pay.id, pay.payment_number, pay.amount, pay.status, b.bill_number, co.customer_id
     FROM payments pay JOIN bills b ON b.id = pay.bill_id JOIN connections co ON co.id = b.connection_id
     WHERE pay.id = $1 AND pay.bill_id = $2 FOR UPDATE OF pay`,
    [paymentId, billId]
  );
  const payment = rows[0];
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status !== 'Pending') throw new ApiError(409, `This payment is already ${payment.status.toLowerCase()}`);
  return payment;
}

// POST /api/bills/:id/payments/:paymentId/confirm   -> Completed; the trigger marks the bill Paid
export async function confirmPayment(req, res) {
  const billId = requireUuid(req.params.id, 'bill id');
  const paymentId = requireUuid(req.params.paymentId, 'payment id');

  const payment = await withTransaction(async (client) => {
    const found = await findPendingPayment(client, billId, paymentId);
    await client.query(
      "UPDATE payments SET status = 'Completed', notes = CONCAT_WS('. ', notes, 'Confirmed by ' || $1::text), updated_at = NOW() WHERE id = $2",
      [req.user.name, paymentId]
    );
    return found;
  }, req.user.id); // req.user.id: the activity log shows who confirmed it

  await notifyCustomer(payment.customer_id, {
    kind: 'payment',
    title: `Payment ${payment.payment_number} confirmed`,
    message: `Thank you! ${formatTaka(payment.amount)} for ${payment.bill_number} is received. Your receipt is ready.`,
    link: `/my/payments/${paymentId}`,
    refId: paymentId,
  });
  res.json({ data: await findBill(billId) });
}

// POST /api/bills/:id/payments/:paymentId/reject   body: { note }  -> Failed; the bill stays unpaid
export async function rejectPayment(req, res) {
  const billId = requireUuid(req.params.id, 'bill id');
  const paymentId = requireUuid(req.params.paymentId, 'payment id');
  const note = optionalText(req.body?.note, 'Note', 500);

  const payment = await withTransaction(async (client) => {
    const found = await findPendingPayment(client, billId, paymentId);
    await client.query(
      "UPDATE payments SET status = 'Failed', notes = CONCAT_WS('. ', notes, 'Not received: ' || $1::text), updated_at = NOW() WHERE id = $2",
      [note || 'reference not found', paymentId]
    );
    await client.query('SELECT check_overdue_bills()');
    return found;
  }, req.user.id);

  await notifyCustomer(payment.customer_id, {
    kind: 'payment',
    title: `Payment ${payment.payment_number} was not received`,
    message: `We could not find your payment for ${payment.bill_number}.${note ? ` Office note: ${note}.` : ''} Please check the reference and pay again.`,
    link: `/my/bills/${billId}`,
    refId: paymentId,
  });
  res.json({ data: await findBill(billId) });
}

// POST /api/bills/send-reminders
// Every bill that is overdue or due in the next 3 days gets an inbox message (and an email
// when the customer has one). A bill gets at most one reminder every 3 days.
export async function sendDueReminders(req, res) {
  await query('SELECT check_overdue_bills()');
  const { rows: bills } = await query(
    `${BILL_SELECT}
     WHERE b.status IN ('Unpaid', 'Partially Paid', 'Overdue') AND b.due_date <= CURRENT_DATE + 3
       AND NOT EXISTS (SELECT 1 FROM notifications n
                       WHERE n.ref_id = b.id AND n.kind = 'reminder' AND n.created_at > NOW() - INTERVAL '3 days')
     ORDER BY b.due_date`
  );

  let emailed = 0;
  for (const bill of bills) {
    const late = bill.status === 'Overdue';
    await notifyCustomer(bill.customer_id, {
      kind: 'reminder',
      title: late ? `${bill.bill_number} is overdue` : `${bill.bill_number} is due soon`,
      message: `${formatTaka(bill.balance)} to pay, due ${formatDate(bill.due_date)}. You can pay online from My Bills.`,
      link: `/my/bills/${bill.id}`,
      refId: bill.id,
    });
    if (bill.customer_email) {
      const { subject, html } = reminderEmail(bill);
      if (await sendEmail({ to: bill.customer_email, name: bill.customer_name, subject, html })) emailed += 1;
    }
  }
  res.json({ data: { reminded: bills.length, emailed } });
}
