// /api/bills  (admin only)
import { Router } from 'express';
import {
  confirmPayment,
  generateBill,
  getBill,
  listBills,
  markBillPaid,
  markBillUnpaid,
  previewBill,
  rejectPayment,
  sendDueReminders,
  waiveLateFee,
} from '../controllers/bills.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listBills);
router.post('/preview', previewBill);
router.post('/generate', generateBill);
router.post('/send-reminders', sendDueReminders); // bills due in 3 days or overdue
router.get('/:id', getBill);
router.post('/:id/mark-paid', markBillPaid);
router.post('/:id/mark-unpaid', markBillUnpaid);
router.post('/:id/waive-late-fee', waiveLateFee);
router.post('/:id/payments/:paymentId/confirm', confirmPayment); // customer paid online
router.post('/:id/payments/:paymentId/reject', rejectPayment);

export default router;
