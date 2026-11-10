// /api/connections  (admin only)
import { Router } from 'express';
import { createConnection, getConnection, listConnections, updateConnection } from '../controllers/connections.controller.js';
import { getLastReading } from '../controllers/readings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listConnections);
router.post('/', createConnection);
router.get('/:id', getConnection);
router.put('/:id', updateConnection);
router.get('/:id/last-reading', getLastReading);

export default router;
