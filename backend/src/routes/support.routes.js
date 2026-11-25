// /api/support  - the Support form on the first page
//   POST /, /:id/verify, /:id/resend -> public (anybody, no login), with limits per visitor
//   everything else                    -> admin only (the admin "Support" page)
import { Router } from 'express';
import {
  createTicket,
  getTicket,
  getTicketAttachment,
  listTickets,
  resendTicketCode,
  updateTicket,
  verifyTicket,
} from '../controllers/support.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { rateLimit } from '../middleware/security.js';

const router = Router();

router.post('/', rateLimit({ max: 5, minutes: 60 }), createTicket); // at most 5 problems an hour per visitor
router.post('/:id/verify', rateLimit({ max: 15, minutes: 15 }), verifyTicket);
router.post('/:id/resend', rateLimit({ max: 5, minutes: 15 }), resendTicketCode);

router.get('/', requireAuth, requireRole('admin'), listTickets);
router.get('/:id', requireAuth, requireRole('admin'), getTicket);
router.get('/:id/attachment', requireAuth, requireRole('admin'), getTicketAttachment);
router.put('/:id', requireAuth, requireRole('admin'), updateTicket);

export default router;
