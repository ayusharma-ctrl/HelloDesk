import { Router } from 'express';
import { requireAuth } from '../../lib/auth.js';
import { rateLimiter } from '../../lib/rate-limiter.js';
import * as authController from './auth.controller.js';

const router = Router();

// Strict rate limiting on auth endpoints: 10 attempts per minute per IP
const authLimit = rateLimiter('auth', 10, 60_000);

router.post('/signup', authLimit, authController.signup);
router.post('/login', authLimit, authController.login);
router.get('/me', requireAuth, authController.getMe);

export { router as authRouter };
