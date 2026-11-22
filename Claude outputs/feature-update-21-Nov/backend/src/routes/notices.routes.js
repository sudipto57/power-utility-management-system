// /api/notices  (admin only) - outage and maintenance notices
import { Router } from 'express';
import { createNotice, deleteNotice, listAreas, listNotices, updateNotice } from '../controllers/notices.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listNotices);
router.get('/areas', listAreas); // must stay ABOVE '/:id'
router.post('/', createNotice);
router.put('/:id', updateNotice);
router.delete('/:id', deleteNotice);

export default router;
