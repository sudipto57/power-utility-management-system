// Feature 8 (Meter Reading Entry)
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { clean, optionalText, requireDate, requireUuid, requireWholeNumber } from '../utils/validate.js';

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
         c.full_name AS customer_name, c.customer_type, u.full_name AS recorded_by_name,
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

// GET /api/readings?connection_id=&search=&billed=yes|no
export async function listReadings(req, res) {
  const connectionId = clean(req.query.connection_id) ? requireUuid(req.query.connection_id, 'connection id') : null;
  const search = clean(req.query.search);
  const billed = clean(req.query.billed); // 'yes' = only billed, 'no' = only not billed yet

  const { rows } = await query(
    `${READING_SELECT}
     WHERE ($1::uuid IS NULL OR mr.connection_id = $1)
       AND ($2::text IS NULL OR co.meter_number ILIKE $2 OR c.full_name ILIKE $2 OR c.customer_number ILIKE $2)
       AND ($3::text IS NULL
            OR ($3 = 'yes' AND b.id IS NOT NULL)
            OR ($3 = 'no' AND b.id IS NULL AND mr.status = 'Verified'))
     ORDER BY mr.reading_date DESC, co.meter_number`,
    [connectionId, search ? `%${search}%` : null, billed]
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

  const { rows } = await query(
    `INSERT INTO meter_readings (connection_id, previous_reading, current_reading, reading_date, status, notes, recorded_by)
     VALUES ($1, $2, $3, $4, 'Verified', $5, $6) RETURNING id`,
    [connectionId, previousReading, currentReading, readingDate, notes, req.user.id]
  );

  const created = await query(`${READING_SELECT} WHERE mr.id = $1`, [rows[0].id]);
  res.status(201).json({ data: created.rows[0] });
}
