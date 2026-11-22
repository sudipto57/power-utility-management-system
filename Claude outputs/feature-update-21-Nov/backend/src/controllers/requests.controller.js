// Feature 13 (Complaint Management) - admin side of service requests
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES, REQUEST_STATUSES } from '../utils/constants.js';
import { clean, optionalOneOf, optionalText, requireOneOf, requireText, requireUuid } from '../utils/validate.js';
import { notifyCustomer } from '../utils/notify.js';

export const REQUEST_SELECT = `
  SELECT r.id, r.request_number, r.customer_id, r.category, r.priority, r.status, r.description,
         r.assigned_to, r.resolution_notes, r.resolved_at, r.created_at, r.updated_at,
         c.customer_number, c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
         a.full_name AS assigned_to_name,
         (SELECT COUNT(*) FROM service_request_comments rc WHERE rc.request_id = r.id) AS comments_count
  FROM service_requests r
  JOIN customers c ON c.id = r.customer_id
  LEFT JOIN users a ON a.id = r.assigned_to`;

/** One request with its comments. Throws 404 if missing. */
export async function findRequest(id) {
  const { rows } = await query(`${REQUEST_SELECT} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Service request not found');
  const comments = await query(
    `SELECT rc.id, rc.comment, rc.created_at, u.full_name AS user_name, u.role AS user_role
     FROM service_request_comments rc JOIN users u ON u.id = rc.user_id
     WHERE rc.request_id = $1 ORDER BY rc.created_at`,
    [id]
  );
  return { ...rows[0], comments: comments.rows };
}

// GET /api/requests?search=&status=&priority=&category=
export async function listRequests(req, res) {
  const search = clean(req.query.search);
  const status = optionalOneOf(req.query.status, REQUEST_STATUSES, 'status');
  const priority = optionalOneOf(req.query.priority, REQUEST_PRIORITIES, 'priority');
  const category = optionalOneOf(req.query.category, REQUEST_CATEGORIES, 'category');

  const { rows } = await query(
    `${REQUEST_SELECT}
     WHERE ($1::text IS NULL OR r.request_number ILIKE $1 OR c.full_name ILIKE $1
            OR c.customer_number ILIKE $1 OR r.description ILIKE $1)
       AND ($2::text IS NULL OR r.status = $2)
       AND ($3::text IS NULL OR r.priority = $3)
       AND ($4::text IS NULL OR r.category = $4)
     ORDER BY CASE r.status WHEN 'Pending' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
              CASE r.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
              r.created_at DESC`,
    [search ? `%${search}%` : null, status, priority, category]
  );
  res.json({ data: rows });
}

// GET /api/requests/staff  -> admin users that a complaint can be assigned to
export async function listStaff(req, res) {
  const { rows } = await query(
    "SELECT id, full_name, username FROM users WHERE role = 'admin' AND status = 'Active' ORDER BY full_name"
  );
  res.json({ data: rows });
}

// GET /api/requests/:id
export async function getRequest(req, res) {
  const id = requireUuid(req.params.id, 'request id');
  res.json({ data: await findRequest(id) });
}

// PATCH /api/requests/:id/status   body: { status, priority?, assigned_to?, resolution_notes? }
export async function updateRequestStatus(req, res) {
  const id = requireUuid(req.params.id, 'request id');
  const body = req.body || {};
  const status = requireOneOf(body.status, REQUEST_STATUSES, 'Status');
  const priority = optionalOneOf(body.priority, REQUEST_PRIORITIES, 'Priority');
  const resolutionNotes = optionalText(body.resolution_notes, 'Resolution notes', 2000);

  let assignedTo = null;
  const assignProvided = 'assigned_to' in body;
  if (assignProvided && clean(body.assigned_to)) {
    assignedTo = requireUuid(body.assigned_to, 'staff member');
    const staff = await query("SELECT id FROM users WHERE id = $1 AND role = 'admin'", [assignedTo]);
    if (!staff.rows[0]) throw new ApiError(400, 'Requests can only be assigned to staff (admin) users');
  }

  const current = await findRequest(id);
  if (status === 'Resolved' && !resolutionNotes && !current.resolution_notes) {
    throw new ApiError(400, 'Please write a short resolution note when resolving a request');
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE service_requests SET
         status = $1::text,
         priority = COALESCE($2::text, priority),
         assigned_to = CASE WHEN $3::boolean THEN $4::uuid
                            WHEN assigned_to IS NULL AND $1::text = 'In Progress' THEN $6::uuid
                            ELSE assigned_to END,
         resolution_notes = COALESCE($5::text, resolution_notes),
         resolved_at = CASE WHEN $1::text = 'Resolved' THEN COALESCE(resolved_at, NOW()) ELSE NULL END
       WHERE id = $7::uuid`,
      [status, priority, assignProvided, assignedTo, resolutionNotes, req.user.id, id]
    );

    if (status !== current.status) {
      await client.query('INSERT INTO service_request_comments (request_id, user_id, comment) VALUES ($1, $2, $3)', [
        id,
        req.user.id,
        `Status changed from ${current.status} to ${status}`,
      ]);
    }
  });

  if (status !== current.status) {
    await notifyCustomer(current.customer_id, {
      kind: 'request',
      title: `${current.request_number} is now ${status}`,
      message: status === 'Resolved' ? `Solved: ${resolutionNotes || current.resolution_notes}` : `Your ${current.category.toLowerCase()} request moved from ${current.status} to ${status}.`,
      link: `/my/requests/${id}`,
      refId: id,
    });
  }
  res.json({ data: await findRequest(id) });
}

// POST /api/requests/:id/comments   body: { comment }
export async function addComment(req, res) {
  const id = requireUuid(req.params.id, 'request id');
  const comment = requireText(req.body?.comment, 'Comment', 2000);
  const request = await findRequest(id);
  await query('INSERT INTO service_request_comments (request_id, user_id, comment) VALUES ($1, $2, $3)', [
    id,
    req.user.id,
    comment,
  ]);
  await notifyCustomer(request.customer_id, {
    kind: 'request',
    title: `New reply on ${request.request_number}`,
    message: comment.length > 140 ? `${comment.slice(0, 140)}...` : comment,
    link: `/my/requests/${id}`,
    refId: id,
  });
  res.status(201).json({ data: await findRequest(id) });
}
