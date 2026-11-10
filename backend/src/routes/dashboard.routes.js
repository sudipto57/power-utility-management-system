// /api/dashboard  (admin only)
import { Router } from 'express';
import { getRecentActivity, getStats } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/stats', getStats);
router.get('/recent-activity', getRecentActivity);

export default router;
