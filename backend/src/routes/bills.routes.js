// /api/bills  (admin only)
import { Router } from 'express';
import { generateBill, getBill, listBills, markBillPaid, markBillUnpaid, previewBill } from '../controllers/bills.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listBills);
router.post('/preview', previewBill);
router.post('/generate', generateBill);
router.get('/:id', getBill);
router.post('/:id/mark-paid', markBillPaid);
router.post('/:id/mark-unpaid', markBillUnpaid);

export default router;
