// Checks the login token sent by the frontend:  Authorization: Bearer <token>
// If it is valid, the logged-in user is available as req.user in every controller.
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Please log in first'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.id,
      role: payload.role,
      customerId: payload.customerId || null,
      name: payload.name,
    };
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Your session has expired. Please log in again' : 'Invalid login token';
    return next(new ApiError(401, message));
  }
}
