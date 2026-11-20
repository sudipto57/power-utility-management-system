// Extra feature: outage notices (planned power cuts posted by the office)
// Table outage_notices and view current_outage_notices: database/11_extra_features.sql
import { query, queryAs } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { optionalText, requireText, requireUuid } from '../utils/validate.js';

/** A date and time from the form, e.g. "2026-11-21T10:00:00.000Z". Returns a Date. */
function requireDateTime(value, label) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new ApiError(400, `${label} must be a date and time`);
  return date;
}

/** Reads and checks the form fields (used by create and update). */
function readNotice(body = {}) {
  const notice = {
    title: requireText(body.title, 'Title', 120),
    area: requireText(body.area, 'Area', 150),
    startsAt: requireDateTime(body.starts_at, 'Start'),
    endsAt: requireDateTime(body.ends_at, 'End'),
    details: optionalText(body.details, 'Details', 1000),
  };
  if (notice.endsAt <= notice.startsAt) throw new ApiError(400, 'The end must be after the start');
  return notice;
}

const NOTICE_SELECT = `
  SELECT o.id, o.title, o.area, o.starts_at, o.ends_at, o.details, o.created_at, u.full_name AS created_by_name,
         CASE WHEN o.ends_at <= NOW() THEN 'Ended'
              WHEN o.starts_at <= NOW() THEN 'Happening now'
              ELSE 'Planned' END AS state
  FROM outage_notices o LEFT JOIN users u ON u.id = o.created_by`;

async function findNotice(id) {
  const { rows } = await query(`${NOTICE_SELECT} WHERE o.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Outage notice not found');
  return rows[0];
}

// GET /api/outages/current   (anyone who is logged in) -> notices that have not ended yet, for the news strip
export async function listCurrentOutages(req, res) {
  const { rows } = await query('SELECT id, title, area, starts_at, ends_at, details, state FROM current_outage_notices');
  res.json({ data: rows });
}

// GET /api/outages   (admin) -> every notice, newest first
export async function listOutages(req, res) {
  const { rows } = await query(`${NOTICE_SELECT} ORDER BY o.starts_at DESC`);
  res.json({ data: rows });
}

// POST /api/outages   body: { title, area, starts_at, ends_at, details }
export async function createOutage(req, res) {
  const n = readNotice(req.body);
  const { rows } = await queryAs(
    req.user.id,
    `INSERT INTO outage_notices (title, area, starts_at, ends_at, details, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [n.title, n.area, n.startsAt, n.endsAt, n.details, req.user.id]
  );
  res.status(201).json({ data: await findNotice(rows[0].id) });
}

// PUT /api/outages/:id   body: same as POST
export async function updateOutage(req, res) {
  const id = requireUuid(req.params.id, 'outage notice id');
  const n = readNotice(req.body);
  await findNotice(id);
  await queryAs(
    req.user.id,
    'UPDATE outage_notices SET title = $1, area = $2, starts_at = $3, ends_at = $4, details = $5 WHERE id = $6',
    [n.title, n.area, n.startsAt, n.endsAt, n.details, id]
  );
  res.json({ data: await findNotice(id) });
}

// DELETE /api/outages/:id
export async function deleteOutage(req, res) {
  const id = requireUuid(req.params.id, 'outage notice id');
  await findNotice(id);
  await queryAs(req.user.id, 'DELETE FROM outage_notices WHERE id = $1', [id]);
  res.json({ data: { id, deleted: true } });
}
