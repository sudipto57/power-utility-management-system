// Feature 8 (Meter Reading Entry)
// Staff readings are saved as Verified straight away.
// A customer can also send their own reading (POST /api/my/readings): it waits as Pending
// until staff Verify it (then it counts and can be billed) or Reject it.
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { notifyCustomer } from '../utils/notify.js';
import { formatDate } from '../utils/email.js';
import { clean, optionalOneOf, optionalText, requireDate, requireUuid, requireWholeNumber } from '../utils/validate.js';

const READING_STATUSES = ['Pending', 'Verified', 'Rejected'];

async function getLastVerifiedReading(connectionId) {
  const { rows } = await query(
    `SELECT id, current_reading, reading_date FROM meter_readings
     WHERE connection_id = $1 AND status = 'Verified'
     ORDER BY reading_date DESC, created_at DESC LIMIT 1`,
    [connectionId]
  );
  return rows[0] || null;
}

const READING_SELECT = `
  SELECT mr.id, mr.connection_id, mr.previous_reading, mr.current_reading,
         (mr.current_reading - mr.previous_reading) AS consumption,
         mr.reading_date, mr.status, mr.notes, mr.created_at,
         co.meter_number, co.connection_type, c.id AS customer_id, c.customer_number,
         c.full_name AS customer_name, c.customer_type, u.full_name AS recorded_by_name, u.role AS recorded_by_role,
         b.id AS bill_id, b.bill_number
  FROM meter_readings mr
  JOIN connections co ON co.id = mr.connection_id
  JOIN customers c ON c.id = co.customer_id
  LEFT JOIN users u ON u.id = mr.recorded_by
  LEFT JOIN bills b ON b.connection_id = mr.connection_id AND b.billing_period_end = mr.reading_date - 1`;

// GET /api/connections/:id/last-reading  -> fills "previous reading" on the entry form
export async function getLastReading(req, res) {
  const connectionId = requireUuid(req.params.id, 'connection id');
  const exists = await query('SELECT id FROM connections WHERE id = $1', [connectionId]);
  if (!exists.rows[0]) throw new ApiError(404, 'Connection not found');

  const last = await getLastVerifiedReading(connectionId);
  res.json({
    data: {
      previous_reading: last ? last.current_reading : 0,
      last_reading_date: last ? last.reading_date : null,
      is_first_reading: !last,
    },
  });
}

// GET /api/readings?connection_id=&search=&billed=yes|no&status=Pending
export async function listReadings(req, res) {
  const connectionId = clean(req.query.connection_id) ? requireUuid(req.query.connection_id, 'connection id') : null;
  const search = clean(req.query.search);
  const billed = clean(req.query.billed); // 'yes' = only billed, 'no' = only not billed yet
  const status = optionalOneOf(req.query.status, READING_STATUSES, 'status');

  const { rows } = await query(
    `${READING_SELECT}
     WHERE ($1::uuid IS NULL OR mr.connection_id = $1)
       AND ($2::text IS NULL OR co.meter_number ILIKE $2 OR c.full_name ILIKE $2 OR c.customer_number ILIKE $2)
       AND ($3::text IS NULL
            OR ($3 = 'yes' AND b.id IS NOT NULL)
            OR ($3 = 'no' AND b.id IS NULL AND mr.status = 'Verified'))
       AND ($4::text IS NULL OR mr.status = $4)
     ORDER BY mr.reading_date DESC, co.meter_number`,
    [connectionId, search ? `%${search}%` : null, billed, status]
  );
  res.json({ data: rows });
}

// POST /api/readings
// body: { connection_id, current_reading, reading_date, previous_reading (only for the very first reading), notes }
export async function createReading(req, res) {
  const body = req.body || {};
  const connectionId = requireUuid(body.connection_id, 'connection');
  const currentReading = requireWholeNumber(body.current_reading, 'Current reading');
  const readingDate = requireDate(body.reading_date, 'Reading date');
  const notes = optionalText(body.notes, 'Notes');

  const connection = await query('SELECT id, status FROM connections WHERE id = $1', [connectionId]);
  if (!connection.rows[0]) throw new ApiError(404, 'Connection not found');
  if (connection.rows[0].status !== 'Active') {
    throw new ApiError(400, `This connection is ${connection.rows[0].status}. Readings can only be added to Active connections`);
  }

  // +1 day of tolerance: Supabase runs on UTC, which can be "yesterday" for users in Asia
  const future = await query('SELECT $1::date > CURRENT_DATE + 1 AS is_future', [readingDate]);
  if (future.rows[0].is_future) throw new ApiError(400, 'Reading date cannot be in the future');

  // The previous reading always comes from the last verified reading (the trigger checks this too)
  const last = await getLastVerifiedReading(connectionId);
  let previousReading;
  if (last) {
    previousReading = last.current_reading;
    if (readingDate <= last.reading_date) {
      throw new ApiError(400, `Reading date must be after the last reading (${last.reading_date})`);
    }
  } else {
    previousReading =
      body.previous_reading === undefined || body.previous_reading === '' || body.previous_reading === null
        ? 0
        : requireWholeNumber(body.previous_reading, 'Previous reading');
  }

  if (currentReading < previousReading) {
    throw new ApiError(400, `Current reading (${currentReading}) cannot be lower than the previous reading (${previousReading})`);
  }

  const sameDay = await query('SELECT status FROM meter_readings WHERE connection_id = $1 AND reading_date = $2', [
    connectionId,
    readingDate,
  ]);
  if (sameDay.rows[0]?.status === 'Pending') {
    throw new ApiError(409, 'The customer already sent a reading for this day. Verify or reject it on the Meter Readings page');
  }

  const { rows } = await query(
    `INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, notes, recorded_by)
     VALUES ($1, $2, $3, $4, 'Verified', $5, $6) RETURNING id`,
    [connectionId, previousReading, currentReading, readingDate, notes, req.user.id]
  );

  const created = await query(`${READING_SELECT} WHERE mr.id = $1`, [rows[0].id]);
  res.status(201).json({ data: created.rows[0] });
}

// ---------------------------------------------------------------------
// Customer readings (sent from "Meter & Usage"): staff check them here
// ---------------------------------------------------------------------

async function findPendingReading(id) {
  const { rows } = await query(
    `SELECT mr.id, mr.connection_id, mr.current_reading, mr.reading_date, mr.status, co.meter_number, co.customer_id
     FROM meter_readings mr JOIN connections co ON co.id = mr.connection_id
     WHERE mr.id = $1`,
    [id]
  );
  const reading = rows[0];
  if (!reading) throw new ApiError(404, 'Meter reading not found');
  if (reading.status !== 'Pending') throw new ApiError(409, `This reading is already ${reading.status.toLowerCase()}`);
  return reading;
}

// POST /api/readings/:id/verify
// The reading starts to count: its previous reading becomes the last verified one.
export async function verifyReading(req, res) {
  const id = requireUuid(req.params.id, 'reading id');
  const reading = await findPendingReading(id);

  const last = await getLastVerifiedReading(reading.connection_id);
  if (last && reading.reading_date <= last.reading_date) {
    throw new ApiError(400, `A newer reading (${formatDate(last.reading_date)}) is already verified. Please reject this one`);
  }
  const previousReading = last ? last.current_reading : 0;
  if (reading.current_reading < previousReading) {
    throw new ApiError(
      400,
      `This reading (${reading.current_reading}) is lower than the last verified reading (${previousReading}). Please reject it`
    );
  }

  await query(
    "UPDATE meter_readings SET status = 'Verified', previous_reading = $1, updated_at = NOW() WHERE id = $2",
    [previousReading, id]
  );
  await notifyCustomer(reading.customer_id, {
    kind: 'reading',
    title: 'Your meter reading was accepted',
    message: `Meter ${reading.meter_number}: ${reading.current_reading} kWh on ${formatDate(reading.reading_date)}. It will be used for your next bill.`,
    link: '/my/usage',
    refId: id,
  });

  const updated = await query(`${READING_SELECT} WHERE mr.id = $1`, [id]);
  res.json({ data: updated.rows[0] });
}

// POST /api/readings/:id/reject   body: { note } (optional, shown to the customer)
export async function rejectReading(req, res) {
  const id = requireUuid(req.params.id, 'reading id');
  const note = optionalText(req.body?.note, 'Note', 500);
  const reading = await findPendingReading(id);

  await query(
    `UPDATE meter_readings
     SET status = 'Rejected', notes = CONCAT_WS(' | Staff: ', notes, $1::text), updated_at = NOW()
     WHERE id = $2`,
    [note, id]
  );
  await notifyCustomer(reading.customer_id, {
    kind: 'reading',
    title: 'Your meter reading was not accepted',
    message: `Meter ${reading.meter_number}, ${formatDate(reading.reading_date)}.${note ? ` Staff note: ${note}` : ' Please check the meter and send it again.'}`,
    link: '/my/usage',
    refId: id,
  });

  const updated = await query(`${READING_SELECT} WHERE mr.id = $1`, [id]);
  res.json({ data: updated.rows[0] });
}

// POST /api/my/readings   (customer)   body: { connection_id, current_reading, reading_date?, notes? }
// Saved as Pending. Sending again on the same day replaces the customer's own Pending reading.
export async function createMyReading(req, res) {
  const customerId = req.user.customerId;
  if (!customerId) throw new ApiError(403, 'Your login is not linked to a customer profile');
  const body = req.body || {};
  const connectionId = requireUuid(body.connection_id, 'meter');
  const currentReading = requireWholeNumber(body.current_reading, 'Meter reading');
  const readingDate = clean(body.reading_date) ? requireDate(body.reading_date, 'Reading date') : null;
  const notes = optionalText(body.notes, 'Notes', 500);

  const connection = await query('SELECT id, status, meter_number FROM connections WHERE id = $1 AND customer_id = $2', [
    connectionId,
    customerId,
  ]);
  if (!connection.rows[0]) throw new ApiError(404, 'Meter not found'); // never another customer's meter
  if (connection.rows[0].status !== 'Active') throw new ApiError(400, 'Readings can only be sent for an active meter');

  const dates = await query(
    'SELECT COALESCE($1::date, CURRENT_DATE) AS reading_date, COALESCE($1::date, CURRENT_DATE) > CURRENT_DATE + 1 AS is_future',
    [readingDate]
  );
  const date = dates.rows[0].reading_date;
  if (dates.rows[0].is_future) throw new ApiError(400, 'Reading date cannot be in the future');

  const last = await getLastVerifiedReading(connectionId);
  if (!last) throw new ApiError(400, 'This meter has no official reading yet. Please wait for the first staff reading');
  if (date <= last.reading_date) {
    throw new ApiError(400, `The date must be after the last official reading (${formatDate(last.reading_date)})`);
  }
  if (currentReading < last.current_reading) {
    throw new ApiError(400, `The reading cannot be lower than the last official reading (${last.current_reading} kWh)`);
  }

  // One reading per meter per day: the customer may correct their own Pending one
  const sameDay = await query('SELECT id, status, recorded_by FROM meter_readings WHERE connection_id = $1 AND reading_date = $2', [
    connectionId,
    date,
  ]);
  const existing = sameDay.rows[0];
  let id;
  if (existing) {
    if (existing.status !== 'Pending' || existing.recorded_by !== req.user.id) {
      throw new ApiError(409, 'This meter already has a reading on that date');
    }
    await query(
      'UPDATE meter_readings SET current_reading = $1, previous_reading = $2, notes = $3, updated_at = NOW() WHERE id = $4',
      [currentReading, last.current_reading, notes, existing.id]
    );
    id = existing.id;
  } else {
    const { rows } = await query(
      `INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, notes, recorded_by)
       VALUES ($1, $2, $3, $4, 'Pending', $5, $6) RETURNING id`,
      [connectionId, last.current_reading, currentReading, date, notes, req.user.id]
    );
    id = rows[0].id;
  }

  const created = await query(`${READING_SELECT} WHERE mr.id = $1`, [id]);
  res.status(existing ? 200 : 201).json({ data: created.rows[0] });
}
