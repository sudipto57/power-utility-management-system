// /api/readings  (admin only)
import { Router } from 'express';
import { createReading, listReadings, listUnusualReadings } from '../controllers/readings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listReadings);
router.get('/unusual', listUnusualReadings);
router.post('/', createReading);

export default router;
