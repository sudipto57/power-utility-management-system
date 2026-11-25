// Support: anybody describes a problem on the first page (with one picture or PDF if they want).
//   1. POST /api/support             -> saved as "Unverified", a 4-digit code is emailed to the sender
//   2. POST /api/support/:id/verify  -> right code: the ticket is "Open", it is emailed to the office
//                                       (SUPPORT_EMAIL, pums.admins@gmail.com) and shows in the admin bell
//   3. Admins edit it, approve it ("In Progress") and solve it on the admin "Support" page.
//      When it becomes "Solved", the admin's reply is emailed to the sender automatically.
// Table: support_tickets (database/13_support_and_deletions.sql)
import crypto from 'node:crypto';
import { query } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES } from '../utils/constants.js';
import { sendEmail, supportCodeEmail, supportNewEmail, supportReceivedEmail, supportSolvedEmail } from '../utils/email.js';
import { clean, optionalOneOf, optionalText, requireEmail, requireOneOf, requireText, requireUuid } from '../utils/validate.js';

const CODE_MINUTES = 15;
const MAX_TRIES = 5;
const RESEND_SECONDS = 60;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

// Allowed files, checked by their first bytes too (a renamed .exe is not a picture)
const FILE_TYPES = {
  'image/png': (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'application/pdf': (bytes) => bytes.subarray(0, 4).toString('latin1') === '%PDF',
};

// Everything an admin sees (the file itself is downloaded separately)
const TICKET_SELECT = `
  SELECT t.id, t.ticket_number, t.name, t.email, t.category, t.subject, t.message, t.status, t.admin_reply,
         t.attachment_name, t.attachment_type, octet_length(t.attachment_data) AS attachment_size,
         t.verified_at, t.solved_at, t.created_at, t.updated_at, u.full_name AS solved_by_name
  FROM support_tickets t
  LEFT JOIN users u ON u.id = t.solved_by`;

const hashCode = (ticketId, code) => crypto.createHash('sha256').update(`support:${ticketId}:${code}`).digest('hex');

/** The optional attachment: { name, type, data (base64) } -> { name, type, bytes } or null */
function readAttachment(file) {
  if (!file || !file.data) return null;
  const name = requireText(file.name, 'File name', 255).replace(/[\\/]/g, '_');
  const type = requireOneOf(file.type, Object.keys(FILE_TYPES), 'File type (PNG, JPG or PDF)');
  const bytes = Buffer.from(String(file.data), 'base64');
  if (bytes.length === 0) throw new ApiError(400, 'The attached file is empty');
  if (bytes.length > MAX_FILE_BYTES) throw new ApiError(400, 'The attached file must be 2 MB or smaller');
  if (!FILE_TYPES[type](bytes)) throw new ApiError(400, 'The attached file is not a real PNG, JPG or PDF');
  return { name, type, bytes };
}

/** Makes a new code for the ticket and emails it. Returns true when the email went out. */
async function sendCode(ticket) {
  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  await query(
    `UPDATE support_tickets SET code_hash = $1, code_attempts = 0, code_sent_at = NOW(),
            code_expires_at = NOW() + make_interval(mins => $2) WHERE id = $3`,
    [hashCode(ticket.id, code), CODE_MINUTES, ticket.id]
  );
  const { subject, html } = supportCodeEmail(ticket.name, code);
  return sendEmail({ to: ticket.email, name: ticket.name, subject, html });
}

async function findTicket(id) {
  const { rows } = await query(`${TICKET_SELECT} WHERE t.id = $1 AND t.status <> 'Unverified'`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Support problem not found');
  return rows[0];
}

// ---------------------------------------------------------------------
// Public (the Support form)
// ---------------------------------------------------------------------

// POST /api/support   body: { name, email, category, subject, message, attachment?: { name, type, data } }
export async function createTicket(req, res) {
  const body = req.body || {};
  const name = requireText(body.name, 'Your name', 100);
  const email = requireEmail(body.email);
  const category = requireOneOf(body.category, SUPPORT_CATEGORIES, 'Category');
  const subject = requireText(body.subject, 'Subject', 150);
  const message = requireText(body.message, 'Problem', 3000);
  if (message.length < 20) throw new ApiError(400, 'Please describe the problem in at least 20 characters');
  const file = readAttachment(body.attachment);

  // Forms that were never confirmed are removed after a day
  await query("DELETE FROM support_tickets WHERE status = 'Unverified' AND created_at < NOW() - INTERVAL '1 day'");

  const { rows } = await query(
    `INSERT INTO support_tickets (name, email, category, subject, message, attachment_name, attachment_type, attachment_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email`,
    [name, email, category, subject, message, file?.name ?? null, file?.type ?? null, file?.bytes ?? null]
  );
  const emailSent = await sendCode(rows[0]);
  res.status(201).json({ data: { id: rows[0].id, email, email_sent: emailSent } });
}

// POST /api/support/:id/resend   -> a new code (at most one a minute)
export async function resendTicketCode(req, res) {
  const id = requireUuid(req.params.id, 'ticket id');
  const { rows } = await query(
    `SELECT id, name, email, code_sent_at > NOW() - make_interval(secs => $2) AS just_sent
     FROM support_tickets WHERE id = $1 AND status = 'Unverified'`,
    [id, RESEND_SECONDS]
  );
  const ticket = rows[0];
  if (!ticket) throw new ApiError(404, 'This form was already sent or is too old. Please fill it in again');
  if (ticket.just_sent) throw new ApiError(429, 'Please wait a minute before asking for another code');
  const emailSent = await sendCode(ticket);
  res.json({ data: { email_sent: emailSent } });
}

// POST /api/support/:id/verify   body: { code: "1234" }
export async function verifyTicket(req, res) {
  const id = requireUuid(req.params.id, 'ticket id');
  const code = String(req.body?.code ?? '').trim();
  if (!/^\d{4}$/.test(code)) throw new ApiError(400, 'Please enter the 4-digit code from the email');

  const { rows } = await query(
    `SELECT id, code_hash, code_attempts, code_expires_at < NOW() AS expired FROM support_tickets
     WHERE id = $1 AND status = 'Unverified'`,
    [id]
  );
  const saved = rows[0];
  if (!saved || !saved.code_hash) throw new ApiError(400, 'This form was already sent or is too old. Please fill it in again');
  if (saved.expired) throw new ApiError(400, 'This code has expired. Ask for a new code');
  if (saved.code_attempts >= MAX_TRIES) throw new ApiError(400, 'Too many wrong tries. Ask for a new code');

  const same = crypto.timingSafeEqual(Buffer.from(saved.code_hash), Buffer.from(hashCode(id, code)));
  if (!same) {
    await query('UPDATE support_tickets SET code_attempts = code_attempts + 1 WHERE id = $1', [id]);
    const left = MAX_TRIES - saved.code_attempts - 1;
    throw new ApiError(400, left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left` : 'Too many wrong tries. Ask for a new code');
  }

  // Confirmed: give it a number and open it
  const ticketNumber = await generateNumber({ query }, 'support');
  await query(
    `UPDATE support_tickets SET status = 'Open', ticket_number = $1, verified_at = NOW(),
            code_hash = NULL, code_expires_at = NULL WHERE id = $2`,
    [ticketNumber, id]
  );

  // Email the office (with the file) and a receipt to the sender
  const { rows: full } = await query('SELECT * FROM support_tickets WHERE id = $1', [id]);
  const ticket = full[0];
  const toOffice = supportNewEmail(ticket);
  await sendEmail({
    to: env.email.supportTo,
    subject: toOffice.subject,
    html: toOffice.html,
    replyTo: ticket.email,
    attachments: ticket.attachment_data ? [{ name: ticket.attachment_name, content: ticket.attachment_data.toString('base64') }] : [],
  });
  const receipt = supportReceivedEmail(ticket);
  await sendEmail({ to: ticket.email, name: ticket.name, subject: receipt.subject, html: receipt.html, replyTo: env.email.supportTo });

  res.json({ data: { ticket_number: ticketNumber } });
}

// ---------------------------------------------------------------------
// Admin (the "Support" page)
// ---------------------------------------------------------------------

// GET /api/support?status=&search=
export async function listTickets(req, res) {
  const status = optionalOneOf(req.query.status, SUPPORT_STATUSES, 'Status');
  const search = clean(req.query.search);
  const { rows } = await query(
    `${TICKET_SELECT}
     WHERE t.status <> 'Unverified'
       AND ($1::text IS NULL OR t.status = $1)
       AND ($2::text IS NULL OR t.ticket_number ILIKE $2 OR t.name ILIKE $2 OR t.email ILIKE $2 OR t.subject ILIKE $2)
     ORDER BY (t.status = 'Solved'), t.verified_at DESC`,
    [status, search ? `%${search}%` : null]
  );
  res.json({ data: rows });
}

// GET /api/support/:id
export async function getTicket(req, res) {
  res.json({ data: await findTicket(requireUuid(req.params.id, 'ticket id')) });
}

// GET /api/support/:id/attachment   -> the file itself
export async function getTicketAttachment(req, res) {
  const id = requireUuid(req.params.id, 'ticket id');
  const { rows } = await query(
    "SELECT attachment_name, attachment_type, attachment_data FROM support_tickets WHERE id = $1 AND status <> 'Unverified'",
    [id]
  );
  const file = rows[0];
  if (!file?.attachment_data) throw new ApiError(404, 'This problem has no attached file');
  res.set('Content-Type', file.attachment_type);
  res.set('Content-Disposition', `attachment; filename="${file.attachment_name.replace(/"/g, '')}"`);
  res.send(file.attachment_data);
}

// PUT /api/support/:id   body: { category?, subject?, message?, status?, admin_reply? }
// Changing the status to "Solved" needs a reply: it is emailed to the sender at once.
export async function updateTicket(req, res) {
  const id = requireUuid(req.params.id, 'ticket id');
  const body = req.body || {};
  const ticket = await findTicket(id);

  const category = 'category' in body ? requireOneOf(body.category, SUPPORT_CATEGORIES, 'Category') : ticket.category;
  const subject = 'subject' in body ? requireText(body.subject, 'Subject', 150) : ticket.subject;
  const message = 'message' in body ? requireText(body.message, 'Problem', 3000) : ticket.message;
  const status = 'status' in body ? requireOneOf(body.status, SUPPORT_STATUSES, 'Status') : ticket.status;
  const reply = 'admin_reply' in body ? optionalText(body.admin_reply, 'Reply', 3000) : ticket.admin_reply;

  const nowSolved = status === 'Solved' && ticket.status !== 'Solved';
  if (status === 'Solved' && !reply) throw new ApiError(400, 'Write a reply for the customer before marking it solved');

  await query(
    `UPDATE support_tickets
     SET category = $1, subject = $2, message = $3, status = $4::varchar, admin_reply = $5,
         solved_at = CASE WHEN $4::varchar = 'Solved' THEN COALESCE(solved_at, NOW()) ELSE NULL END,
         solved_by = CASE WHEN $4::varchar = 'Solved' THEN COALESCE(solved_by, $6::uuid) ELSE NULL END
     WHERE id = $7`,
    [category, subject, message, status, reply, req.user.id, id]
  );

  const saved = await findTicket(id);
  let emailSent = null;
  if (nowSolved) {
    const { subject: mailSubject, html } = supportSolvedEmail(saved);
    emailSent = await sendEmail({ to: saved.email, name: saved.name, subject: mailSubject, html, replyTo: env.email.supportTo });
  }
  res.json({ data: { ...saved, email_sent: emailSent } });
}
