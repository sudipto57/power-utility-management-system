import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

// GET /api/admin/ping  ->  only admins can use this
router.get('/ping', (req, res) => {
  // 1. Get the token from the header "Authorization: Bearer <token>"
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No token. Please log in first.' });
  }

  // 2. Check that the token is real and not expired
  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }

  // 3. Only admins are allowed
  const role = String(user.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Admins only.' });
  }

  res.json({ message: `Hello ${user.username || 'admin'}` });
});

export default router;
