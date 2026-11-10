// /api/reports  (admin only)
import { Router } from 'express';
import { billReport, customerReport, paymentReport } from '../controllers/reports.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/customers', customerReport);
router.get('/bills', billReport);
router.get('/payments', paymentReport);

export default router;
