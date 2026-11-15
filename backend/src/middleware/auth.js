// Checks the login token sent by the frontend:  Authorization: Bearer <token>
// If it is valid, the logged-in user is available as req.user in every controller.
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function requireLogin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Please log in' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, log in again' });
  }
}

export function requireRole(role) {
  return (req, res, next) => (req.user.role === role ? next() : res.status(403).json({ message: 'Not allowed' }));
}

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
