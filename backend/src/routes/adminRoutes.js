// /api/admin  (admin only)
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// The same checks as every other admin route: a valid token, the account still active,
// the password not changed since the login, and the role is admin.
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/ping  ->  a quick "am I logged in as an admin?" test (used in Postman)
router.get('/ping', (req, res) => {
  res.json({ data: { message: `Hello ${req.user.name || 'admin'}` } });
});

export default router;
