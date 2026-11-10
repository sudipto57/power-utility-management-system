// /api/requests  (admin only) - complaint management
import { Router } from 'express';
import { addComment, getRequest, listRequests, listStaff, updateRequestStatus } from '../controllers/requests.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listRequests);
router.get('/staff', listStaff); // must stay ABOVE '/:id'
router.get('/:id', getRequest);
router.patch('/:id/status', updateRequestStatus);
router.post('/:id/comments', addComment);

export default router;
