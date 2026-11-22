// /api/my  (customer only) - every query uses the customer id from the login token
import { Router } from 'express';
import {
  addMyRequestComment,
  createMyRequest,
  getMyBill,
  getMyBills,
  getMyDashboard,
  getMyNotifications,
  getMyPayment,
  getMyPayments,
  getMyProfile,
  getMyRequest,
  getMyRequests,
  getMyUsage,
  payMyBill,
  readMyNotification,
  updateMyProfile,
} from '../controllers/my.controller.js';
import { createMyReading } from '../controllers/readings.controller.js';
import { createMyChangeRequest, getMyChangeRequests } from '../controllers/changeRequests.controller.js';
import { getMyStatement } from '../controllers/statement.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile); // name and address only
router.get('/change-requests', getMyChangeRequests); // email, phone, types: admin must approve
router.post('/change-requests', createMyChangeRequest);
router.get('/dashboard', getMyDashboard);
router.get('/bills', getMyBills);
router.get('/bills/:id', getMyBill);
router.get('/statement', getMyStatement); // bills, late fees and payments with a running balance
router.get('/requests', getMyRequests);
router.post('/requests', createMyRequest);
router.get('/requests/:id', getMyRequest);
router.post('/requests/:id/comments', addMyRequestComment); // reply to the office
router.get('/usage', getMyUsage); // meters, own readings, this month so far, projected bill
router.post('/readings', createMyReading); // own meter reading (Pending until staff verify it)
router.post('/bills/:id/pay', payMyBill); // demo online payment (Pending until staff confirm it)
router.get('/payments', getMyPayments);
router.get('/payments/:id', getMyPayment); // receipt
router.get('/notifications', getMyNotifications); // inbox
router.post('/notifications/:id/read', readMyNotification); // id = a message id, or "all"

export default router;
