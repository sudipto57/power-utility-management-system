// Outage and maintenance notices (table outage_notices, from database/11_notices_and_inbox.sql).
// Staff post a notice for one area (a place name from the customers' addresses, e.g. "Gazipur")
// or for "All areas". Customers see it on My Dashboard and get a message in their inbox.
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { clean, requireOneOf, requireText, requireUuid } from '../utils/validate.js';

const NOTICE_TYPES = ['Outage', 'Maintenance'];
const ALL_AREAS = 'All areas';

// A customer is in the area when the area name is part of their address
const IN_AREA = `(n.area = '${ALL_AREAS}' OR c.address ILIKE '%' || n.area || '%')`;

const NOTICE_SELECT = `
  SELECT n.id, n.title, n.notice_type, n.area, n.message, n.starts_at, n.ends_at, n.created_at,
         u.full_name AS created_by_name,
         CASE WHEN n.ends_at <= NOW() THEN 'Ended' WHEN n.starts_at <= NOW() THEN 'Now' ELSE 'Upcoming' END AS state,
         (SELECT COUNT(*) FROM customers c WHERE ${IN_AREA}) AS customers_reached
  FROM outage_notices n
  LEFT JOIN users u ON u.id = n.created_by`;

/** A date and time sent by the browser, e.g. "2026-11-25T03:00:00.000Z" */
function requireDateTime(value, label) {
  const text = clean(value);
  const date = text ? new Date(text) : null;
  if (!date || Number.isNaN(date.getTime())) throw new ApiError(400, `${label} must be a valid date and time`);
  return date.toISOString();
}

function readNotice(body = {}) {
  const notice = {
    title: requireText(body.title, 'Title', 150),
    noticeType: requireOneOf(body.notice_type, NOTICE_TYPES, 'Type'),
    area: clean(body.area) ? requireText(body.area, 'Area', 100) : ALL_AREAS,
    message: requireText(body.message, 'Message', 2000),
    startsAt: requireDateTime(body.starts_at, 'Start'),
    endsAt: requireDateTime(body.ends_at, 'End'),
  };
  if (notice.endsAt <= notice.startsAt) throw new ApiError(400, 'The notice must end after it starts');
  return notice;
}

async function findNotice(id) {
  const { rows } = await query(`${NOTICE_SELECT} WHERE n.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Notice not found');
  return rows[0];
}

// GET /api/notices   -> newest first
export async function listNotices(req, res) {
  const { rows } = await query(`${NOTICE_SELECT} ORDER BY n.ends_at <= NOW(), n.starts_at DESC`);
  res.json({ data: rows });
}

// GET /api/notices/areas   -> the districts found in the customers' addresses ("Road, Area, District, Division")
export async function listAreas(req, res) {
  const { rows } = await query(
    `SELECT area, COUNT(*) AS customers
     FROM (SELECT trim(parts[array_length(parts, 1) - 1]) AS area
           FROM (SELECT string_to_array(address, ',') AS parts FROM customers) split
           WHERE array_length(parts, 1) >= 2) places
     WHERE area <> ''
     GROUP BY area ORDER BY area`
  );
  res.json({ data: rows });
}

// POST /api/notices   body: { title, notice_type, area, message, starts_at, ends_at }
export async function createNotice(req, res) {
  const notice = readNotice(req.body);
  if (new Date(notice.endsAt) <= new Date()) throw new ApiError(400, 'This notice has already ended. Please check the end time');

  const { rows } = await query(
    `INSERT INTO outage_notices (title, notice_type, area, message, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [notice.title, notice.noticeType, notice.area, notice.message, notice.startsAt, notice.endsAt, req.user.id]
  );
  const id = rows[0].id;

  // One inbox message for every customer in the area (one SQL statement)
  await query(
    `INSERT INTO notifications (customer_id, kind, title, message, link, ref_id)
     SELECT c.id, 'notice', n.notice_type || ': ' || n.title, n.message, '/my', n.id
     FROM outage_notices n
     JOIN customers c ON ${IN_AREA}
     WHERE n.id = $1`,
    [id]
  );
  res.status(201).json({ data: await findNotice(id) });
}

// PUT /api/notices/:id   (same body as create; customers are not messaged again)
export async function updateNotice(req, res) {
  const id = requireUuid(req.params.id, 'notice id');
  const notice = readNotice(req.body);
  await findNotice(id);
  await query(
    `UPDATE outage_notices SET title = $1, notice_type = $2, area = $3, message = $4, starts_at = $5, ends_at = $6
     WHERE id = $7`,
    [notice.title, notice.noticeType, notice.area, notice.message, notice.startsAt, notice.endsAt, id]
  );
  res.json({ data: await findNotice(id) });
}

// DELETE /api/notices/:id
export async function deleteNotice(req, res) {
  const id = requireUuid(req.params.id, 'notice id');
  const result = await query('DELETE FROM outage_notices WHERE id = $1', [id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Notice not found');
  res.json({ data: { id } });
}
