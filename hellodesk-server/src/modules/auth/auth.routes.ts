import { Router } from 'express';
import { requireAuth } from '../../lib/auth.js';
import { fixedWindowRateLimiter } from '../../lib/rate-limiter.js';
import * as authController from './auth.controller.js';

const router = Router();

// Strict rate limiting on auth endpoints: 5 attempts per minute per IP
const authLimit = fixedWindowRateLimiter('auth', 5, 60_000);

router.post('/signup', authLimit, authController.signup);
router.post('/login', authLimit, authController.login);
router.get('/me', requireAuth, authController.getMe);

export { router as authRouter };
