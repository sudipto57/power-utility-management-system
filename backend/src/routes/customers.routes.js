// /api/customers  (admin only)
import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getSqlFileStatus,
  listCustomers,
  saveSqlFileNow,
  updateCustomer,
} from '../controllers/customers.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listCustomers);
router.post('/', createCustomer);
// Website sign-ups copied into database/04_sample_data.sql (before '/:id' so "sql-file" is not read as an id)
router.get('/sql-file', getSqlFileStatus);
router.post('/sql-file', saveSqlFileNow);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
