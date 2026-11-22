// /api/readings  (admin only)
import { Router } from 'express';
import { createReading, listReadings, listUnusualReadings, rejectReading, verifyReading } from '../controllers/readings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listReadings);
router.get('/unusual', listUnusualReadings);
router.post('/', createReading);
router.post('/:id/verify', verifyReading); // customer readings: Pending -> Verified
router.post('/:id/reject', rejectReading);

export default router;
