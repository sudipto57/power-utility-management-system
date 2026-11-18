// /api/change-requests  (admin only) - approve or reject customers' profile change requests
import { Router } from 'express';
import {
  approveChangeRequest,
  listChangeRequests,
  rejectChangeRequest,
} from '../controllers/changeRequests.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listChangeRequests);
router.post('/:id/approve', approveChangeRequest);
router.post('/:id/reject', rejectChangeRequest);

export default router;
