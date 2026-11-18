// /api/auth
import { Router } from 'express';
import {
  confirmEmail,
  forgotPassword,
  login,
  me,
  resendCode,
  resetPassword,
  signup,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/security.js';

const router = Router();

// Limits per visitor, so nobody can guess passwords/codes or make us send hundreds of emails
const loginLimit = rateLimit({ max: 20, minutes: 15 });
const signupLimit = rateLimit({ max: 10, minutes: 60 });
const codeLimit = rateLimit({ max: 15, minutes: 15 }); // typing a code
const emailLimit = rateLimit({ max: 5, minutes: 15 }); // asking for a new email

router.post('/login', loginLimit, login);
router.post('/signup', signupLimit, signup); // customers only
router.post('/confirm-email', codeLimit, confirmEmail);
router.post('/resend-code', emailLimit, resendCode);
router.post('/forgot-password', emailLimit, forgotPassword);
router.post('/reset-password', codeLimit, resetPassword);
router.get('/me', requireAuth, me);

export default router;
