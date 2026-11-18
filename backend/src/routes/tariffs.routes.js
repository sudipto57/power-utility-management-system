// /api/tariffs  (public: no login needed, used by the bill estimator on the first page)
import { Router } from 'express';
import { estimateBill } from '../controllers/tariffs.controller.js';

const router = Router();

router.get('/estimate', estimateBill);

export default router;
