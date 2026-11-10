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
} from '../controllers/my.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

router.get('/profile', getMyProfile);
router.get('/dashboard', getMyDashboard);
router.get('/bills', getMyBills);
router.get('/bills/:id', getMyBill);
router.get('/requests', getMyRequests);
router.post('/requests', createMyRequest);
router.get('/requests/:id', getMyRequest);

export default router;
