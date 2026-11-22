// /api/activity  (admin only) - the activity log: who changed what, and when
import { Router } from 'express';
import { listActivity } from '../controllers/activity.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listActivity);

export default router;
