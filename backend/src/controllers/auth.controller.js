// Feature 1 (Login System) + Feature 2 (Roles)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { requireText } from '../utils/validate.js';

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

// POST /api/auth/login   body: { login: "email or username", password: "..." }
export async function login(req, res) {
  const loginName = requireText(req.body?.login ?? req.body?.email ?? req.body?.username, 'Email or username');
  const password = requireText(req.body?.password, 'Password');

  const { rows } = await query(`${USER_SELECT} WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1) LIMIT 1`, [
    loginName,
  ]);
  const user = rows[0];

  // Same message for "no such user" and "wrong password" (don't tell attackers which one)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Wrong email/username or password');
  }
  if (user.status !== 'Active') {
    throw new ApiError(403, 'This account is inactive. Please contact the administrator');
  }
  if (user.role === 'customer' && !user.customer_id) {
    throw new ApiError(403, 'This login is not linked to a customer profile yet');
  }

  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  const token = jwt.sign({ id: user.id, role: user.role, customerId: user.customer_id, name: user.full_name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  res.json({ data: { token, user: publicUser(user) } });
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
