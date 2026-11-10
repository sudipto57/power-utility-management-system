// /api/customers  (admin only)
import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../controllers/customers.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
