// /api/customers  (admin only)
import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  deleteCustomerForever,
  getCustomer,
  getSqlFileStatus,
  listCustomers,
  saveSqlFileNow,
  updateCustomer,
} from '../controllers/customers.controller.js';
import { getCustomerStatement } from '../controllers/statement.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', listCustomers);
router.post('/', createCustomer);
// Website sign-ups copied into database/private/website_customers.sql (before '/:id' so "sql-file" is not read as an id)
router.get('/sql-file', getSqlFileStatus);
router.post('/sql-file', saveSqlFileNow);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.delete('/:id/permanent', deleteCustomerForever); // for ever, everywhere (type the customer number to confirm)
router.get('/:id/statement', getCustomerStatement); // bills, late fees and payments with a running balance

export default router;
