// Feature 1 (Login System) + Feature 2 (Roles) + Customer Sign Up
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { generateNumber } from '../utils/generateNumber.js';
import { CUSTOMER_TYPES } from '../utils/constants.js';
import { optionalOneOf, requireEmail, requireOneOf, requireText } from '../utils/validate.js';

// Finds the customer profile that belongs to a login (checks both link columns).
const USER_SELECT = `
  SELECT u.id, u.username, u.email, u.full_name, u.role, u.status, u.password_hash, u.last_login,
         COALESCE(u.customer_id, (SELECT c.id FROM customers c WHERE c.user_id = u.id LIMIT 1)) AS customer_id
  FROM users u`;

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

// The login "ticket" the frontend keeps and sends with every request
function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role, customerId: user.customer_id, name: user.full_name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

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

  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  res.json({ data: { token: makeToken(user), user: publicUser(user) } });
}

// POST /api/auth/signup   (CUSTOMERS ONLY - admin accounts are never created here)
// body: { full_name, phone, email, address, customer_type, username, password }
export async function signup(req, res) {
  const body = req.body || {};
  const fullName = requireText(body.full_name, 'Full name', 100);
  const phone = requireText(body.phone, 'Phone', 20);
  const email = requireEmail(body.email);
  const address = requireText(body.address, 'Address', 500);
  const customerType = requireOneOf(body.customer_type, CUSTOMER_TYPES, 'Customer type');

  const username = requireText(body.username, 'Username', 50).toLowerCase();
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new ApiError(400, 'Username must be 3-50 characters: letters, numbers, dot, dash or underscore');
  }
  const password = requireText(body.password, 'Password', 100);
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  const passwordHash = await bcrypt.hash(password, 10);

  // Create the login + the customer profile together (both succeed or neither is saved)
  const user = await withTransaction(async (client) => {
    const customerNumber = await generateNumber(client, 'customer');

    const userResult = await client.query(
      `INSERT INTO users (username, email, full_name, role, status, password_hash)
       VALUES ($1, $2, $3, 'customer', 'Active', $4) RETURNING id`,
      [username, email, fullName, passwordHash]
    );
    const userId = userResult.rows[0].id;

    const customerResult = await client.query(
      `INSERT INTO customers (customer_number, full_name, phone, email, address, customer_type, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7) RETURNING id`,
      [customerNumber, fullName, phone, email, address, customerType, userId]
    );

    await client.query('UPDATE users SET customer_id = $1, last_login = NOW() WHERE id = $2', [customerResult.rows[0].id, userId]);

    const { rows } = await client.query(`${USER_SELECT} WHERE u.id = $1`, [userId]);
    return rows[0];
  });

  // Logged in straight away after signing up
  res.status(201).json({ data: { token: makeToken(user), user: publicUser(user) } });
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
