// Checks the login token sent by the frontend:  Authorization: Bearer <token>
// If it is valid, the logged-in user is available as req.user in every controller.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { query } from '../config/db.js';

/**
 * A short "fingerprint" of the user's password hash. It goes inside the login token.
 * When the password changes (forgot password), the fingerprint changes too, so every
 * old token stops working: anyone who was logged in with the old password is logged out.
 */
export function passwordVersion(passwordHash) {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Please log in first'));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Your session has expired. Please log in again' : 'Invalid login token';
    return next(new ApiError(401, message));
  }

  try {
    // Check the account on every request, so a deactivated account or a changed
    // password takes effect straight away (not only when the token expires).
    const { rows } = await query('SELECT status, password_hash FROM users WHERE id = $1', [payload.id]);
    const user = rows[0];
    if (!user || user.status !== 'Active') {
      return next(new ApiError(401, 'Your account is no longer active. Please log in again'));
    }
    if (payload.pv !== passwordVersion(user.password_hash)) {
      return next(new ApiError(401, 'Your password was changed. Please log in again'));
    }
  } catch (err) {
    return next(err);
  }

  req.user = {
    id: payload.id,
    role: payload.role,
    customerId: payload.customerId || null,
    name: payload.name,
    previousLogin: payload.pl || null, // the login BEFORE this one (for "new since you last logged in")
  };
  return next();
}
