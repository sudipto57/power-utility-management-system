// /api/feedback  (public: no login needed) - the feedback form on the website
import { Router } from 'express';
import { sendFeedback } from '../controllers/feedback.controller.js';
import { rateLimit } from '../middleware/security.js';

const router = Router();

// At most 5 messages an hour from one visitor, so nobody can flood the team's inbox
router.post('/', rateLimit({ max: 5, minutes: 60 }), sendFeedback);

export default router;
