// Feature 1 (Login System) + Feature 2 (Roles) + Customer Sign Up
// + email confirmation and forgot password (6-digit codes sent by email)
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { CUSTOMER_TYPES } from '../utils/constants.js';
import { codeEmail, sendEmail } from '../utils/email.js';
import { passwordVersion } from '../middleware/auth.js';
import {
  optionalOneOf,
  requireEmail,
  requireOneOf,
  requirePassword,
  requirePhone,
  requireText,
} from '../utils/validate.js';

// Finds the customer profile that belongs to a login (checks both link columns).
const USER_SELECT = `
  SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.password_hash, u.last_login,
         COALESCE(u.customer_id, (SELECT c.id FROM customers c WHERE c.user_id = u.id LIMIT 1)) AS customer_id
  FROM users u`;

const CODE_MINUTES = 15; // a code works for 15 minutes
const MAX_TRIES = 5; // then the customer must ask for a new code
const RESEND_SECONDS = 60; // at most one new code per minute

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    customer_id: user.customer_id,
    last_login: user.last_login,
  };
}

// The login "ticket" the frontend keeps and sends with every request.
// pv = password fingerprint: the ticket stops working when the password changes.
function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, customerId: user.customer_id, name: user.full_name, pv: passwordVersion(user.password_hash) },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' }
  );
}

// ---------------------------------------------------------------------
// 6-digit codes (stored only as a SHA-256 hash, like a password)
// ---------------------------------------------------------------------
function hashCode(userId, code) {
  return crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

/** Makes a new code for the user (old unused codes for the same purpose stop working). */
async function createCode(db, userId, purpose) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await db.query('DELETE FROM account_codes WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL', [userId, purpose]);
  await db.query(
    `INSERT INTO account_codes (user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [userId, purpose, hashCode(userId, code), CODE_MINUTES]
  );
  return code;
}

/** Throws a clear 400 error unless the code is right, then marks it as used. */
async function useCode(userId, purpose, typedCode) {
  const code = String(typedCode ?? '').trim();
  if (!/^\d{6}$/.test(code)) throw new ApiError(400, 'Please enter the 6-digit code from the email');

  const { rows } = await query(
    `SELECT id, code_hash, attempts, expires_at < NOW() AS expired FROM account_codes
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose]
  );
  const saved = rows[0];
  if (!saved) throw new ApiError(400, 'Wrong or old code. Ask for a new code');
  if (saved.expired) throw new ApiError(400, 'This code has expired. Ask for a new code');
  if (saved.attempts >= MAX_TRIES) throw new ApiError(400, 'Too many wrong tries. Ask for a new code');

  // timingSafeEqual compares in constant time, so the answer time gives nothing away
  const same = crypto.timingSafeEqual(Buffer.from(saved.code_hash), Buffer.from(hashCode(userId, code)));
  if (!same) {
    await query('UPDATE account_codes SET attempts = attempts + 1 WHERE id = $1', [saved.id]);
    const left = MAX_TRIES - saved.attempts - 1;
    throw new ApiError(400, left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left` : 'Too many wrong tries. Ask for a new code');
  }
  await query('UPDATE account_codes SET used_at = NOW() WHERE id = $1', [saved.id]);
}

/** True while the customer has not confirmed their email yet (an unused confirm code exists). */
async function needsEmailConfirmation(userId) {
  const { rows } = await query(
    "SELECT 1 FROM account_codes WHERE user_id = $1 AND purpose = 'confirm_email' AND used_at IS NULL LIMIT 1",
    [userId]
  );
  return rows.length > 0;
}

/** Was a code for this purpose sent less than a minute ago? */
async function sentRecently(userId, purpose) {
  const { rows } = await query(
    `SELECT 1 FROM account_codes WHERE user_id = $1 AND purpose = $2
       AND created_at > NOW() - make_interval(secs => $3) LIMIT 1`,
    [userId, purpose, RESEND_SECONDS]
  );
  return rows.length > 0;
}

async function emailCode(user, purpose, code) {
  const { subject, html } = codeEmail(user.full_name, code, purpose);
  return sendEmail({ to: user.email, name: user.full_name, subject, html });
}

/**
 * Finds ONE customer login by email, username or phone number
 * (phone: the last 10 digits are compared, so 01712345678 = +8801712345678).
 */
async function findCustomerLogin(login) {
  const text = String(login ?? '').trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, '');
  const phone = !/[a-z@]/i.test(text) && digits.length >= 10 ? digits.slice(-10) : null;

  const { rows } = await query(
    `${USER_SELECT}
     LEFT JOIN customers c ON c.id = COALESCE(u.customer_id, (SELECT c2.id FROM customers c2 WHERE c2.user_id = u.id LIMIT 1))
     WHERE u.role = 'customer' AND u.status = 'Active'
       AND (LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1)
            OR ($2::text IS NOT NULL AND RIGHT(regexp_replace(c.phone, '\\D', '', 'g'), 10) = $2))
     LIMIT 2`,
    [text, phone]
  );
  return rows.length === 1 ? rows[0] : null; // two accounts with one phone: ask for the email instead
}

// ---------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------

// POST /api/auth/login
// body: { login: "email or username", password: "...", role: "admin" | "customer" }
// role comes from the Customer / Admin switch on the login page (optional, so Postman still works without it)
export async function login(req, res) {
  const loginName = requireText(req.body?.login ?? req.body?.email ?? req.body?.username, 'Email or username');
  const password = requireText(req.body?.password, 'Password');
  const role = optionalOneOf(req.body?.role, ['admin', 'customer'], 'Role');

  const { rows } = await query(`${USER_SELECT} WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1) LIMIT 1`, [
    loginName,
  ]);
  const user = rows[0];

  // Same message for "no such user" and "wrong password" (don't tell attackers which one)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Wrong email/username or password');
  }
  // Role Based Login: the account must match the tab that was chosen
  if (role && user.role !== role) {
    throw new ApiError(
      403,
      role === 'admin'
        ? 'This is not an admin account. Switch to the Customer tab to log in.'
        : 'This is an admin account. Switch to the Admin tab to log in.'
    );
  }
  if (user.status !== 'Active') {
    throw new ApiError(403, 'This account is inactive. Please contact the administrator');
  }
  if (user.role === 'customer' && !user.customer_id) {
    throw new ApiError(403, 'This login is not linked to a customer profile yet');
  }
  if (user.role === 'customer' && (await needsEmailConfirmation(user.id))) {
    throw new ApiError(403, `Please confirm your email first. Enter the 6-digit code we sent to ${user.email}.`, 'EMAIL_NOT_CONFIRMED');
  }

  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  res.json({ data: { token: makeToken(user), user: publicUser(user) } });
}

// POST /api/auth/signup   (CUSTOMERS ONLY - admin accounts are never created here)
// body: { full_name, phone, email, address, customer_type, username, password }
// The account works after the customer types the 6-digit code from the email (confirm-email).
export async function signup(req, res) {
  const body = req.body || {};
  const fullName = requireText(body.full_name, 'Full name', 100);
  const phone = requirePhone(body.phone);
  const email = requireEmail(body.email);
  const address = requireText(body.address, 'Address', 500);
  const customerType = requireOneOf(body.customer_type, CUSTOMER_TYPES, 'Customer type');

  const username = requireText(body.username, 'Username', 50).toLowerCase();
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new ApiError(400, 'Username must be 3-50 characters: letters, numbers, dot, dash or underscore');
  }
  const password = requirePassword(body.password);
  const passwordHash = await bcrypt.hash(password, 10);

  // Create the login + the customer profile + the code together (all succeed or nothing is saved)
  const { user, code } = await withTransaction(async (client) => {
    const customerNumber = await generateNumber(client, 'customer');

    const userResult = await client.query(
      `INSERT INTO users (username, email, full_name, role, status, password_hash)
       VALUES ($1, $2, $3, 'customer', 'Active', $4) RETURNING id, email, full_name`,
      [username, email, fullName, passwordHash]
    );
    const newUser = userResult.rows[0];

    const customerResult = await client.query(
      `INSERT INTO customers (customer_number, full_name, phone, email, address, customer_type, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7) RETURNING id`,
      [customerNumber, fullName, phone, email, address, customerType, newUser.id]
    );
    await client.query('UPDATE users SET customer_id = $1 WHERE id = $2', [customerResult.rows[0].id, newUser.id]);

    return { user: newUser, code: await createCode(client, newUser.id, 'confirm_email') };
  });

  const emailSent = await emailCode(user, 'confirm_email', code);
  res.status(201).json({ data: { needs_confirmation: true, email: user.email, email_sent: emailSent } });
}

// POST /api/auth/confirm-email   body: { login: "email or username", code: "123456" }
// Right code -> the email is confirmed and the customer is logged in.
export async function confirmEmail(req, res) {
  const loginName = requireText(req.body?.login, 'Email or username');
  const user = await findCustomerLogin(loginName);
  if (!user) throw new ApiError(400, 'Wrong or old code. Ask for a new code');
  if (!(await needsEmailConfirmation(user.id))) {
    throw new ApiError(400, 'This email is already confirmed. Please log in', 'ALREADY_CONFIRMED');
  }

  await useCode(user.id, 'confirm_email', req.body?.code);
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  res.json({ data: { token: makeToken(user), user: publicUser(user) } });
}

// POST /api/auth/resend-code   body: { login }   -> a new confirmation code
export async function resendCode(req, res) {
  const loginName = requireText(req.body?.login, 'Email or username');
  const user = await findCustomerLogin(loginName);

  if (user && (await needsEmailConfirmation(user.id))) {
    if (await sentRecently(user.id, 'confirm_email')) {
      throw new ApiError(429, 'Please wait a minute before asking for another code');
    }
    const code = await createCode({ query }, user.id, 'confirm_email');
    await emailCode(user, 'confirm_email', code);
  }
  // Same answer every time, so nobody can test which emails have an account
  res.json({ data: { message: 'If this account still needs confirming, a new code is on its way.' } });
}

// POST /api/auth/forgot-password   body: { login: "email, username or phone number" }
// The code always goes to the email saved on the account.
export async function forgotPassword(req, res) {
  const loginName = requireText(req.body?.login, 'Email or phone number');
  const user = await findCustomerLogin(loginName);

  if (user?.email) {
    if (await sentRecently(user.id, 'reset_password')) {
      throw new ApiError(429, 'Please wait a minute before asking for another code');
    }
    const code = await createCode({ query }, user.id, 'reset_password');
    await emailCode(user, 'reset_password', code);
  }
  res.json({ data: { message: 'If an account matches, we sent a 6-digit code to the email address saved on it.' } });
}

// POST /api/auth/reset-password   body: { login, code, password }
export async function resetPassword(req, res) {
  const loginName = requireText(req.body?.login, 'Email or phone number');
  const password = requirePassword(req.body?.password, 'New password');
  const user = await findCustomerLogin(loginName);
  if (!user) throw new ApiError(400, 'Wrong or old code. Ask for a new code');

  await useCode(user.id, 'reset_password', req.body?.code);

  const passwordHash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
  // The code came by email, so the email is confirmed too
  await query("UPDATE account_codes SET used_at = NOW() WHERE user_id = $1 AND purpose = 'confirm_email' AND used_at IS NULL", [user.id]);

  res.json({ data: { message: 'Your password was changed. You can log in now.' } });
}

// GET /api/auth/me   (used by the frontend after a page refresh)
export async function me(req, res) {
  const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [req.user.id]);
  const user = rows[0];
  if (!user || user.status !== 'Active') {
    throw new ApiError(401, 'Your account is no longer active. Please log in again');
  }
  res.json({ data: publicUser(user) });
}
