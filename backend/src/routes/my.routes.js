// /api/my  (customer only) - every query uses the customer id from the login token
import { Router } from 'express';
import {
  createMyRequest,
  getMyBill,
  getMyBills,
  getMyDashboard,
  getMyProfile,
  getMyRequest,
  getMyRequests,
  updateMyProfile,
} from '../controllers/my.controller.js';
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

export default router;
