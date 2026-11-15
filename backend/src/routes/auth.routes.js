// /api/auth
import { Router } from 'express';
import { login, me, signup } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup); // customers only
router.get('/me', requireAuth, me);

export default router;
