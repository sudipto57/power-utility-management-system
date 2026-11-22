// /api/bills  (admin only)
import { Router } from 'express';
import {
  generateBill,
  getBill,
  listBills,
  markBillPaid,
  markBillUnpaid,
  previewBill,
  waiveLateFee,
} from '../controllers/bills.controller.js';
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
router.post('/:id/waive-late-fee', waiveLateFee);

export default router;
