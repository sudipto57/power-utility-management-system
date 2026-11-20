// /api/outages  - planned power cuts
//   GET /current  -> anyone who is logged in (admin or customer): shown in the news strip
//   everything else -> admin only
import { Router } from 'express';
import {
  createOutage,
  deleteOutage,
  listCurrentOutages,
  listOutages,
  updateOutage,
} from '../controllers/outages.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth);

router.get('/current', listCurrentOutages);

router.get('/', requireRole('admin'), listOutages);
router.post('/', requireRole('admin'), createOutage);
router.put('/:id', requireRole('admin'), updateOutage);
router.delete('/:id', requireRole('admin'), deleteOutage);

export default router;
