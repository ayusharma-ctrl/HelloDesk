import { Router } from 'express';
import { rateLimiter } from '../../lib/rate-limiter.js';
import * as webhooksController from './webhooks.controller.js';

const router = Router();

// Webhook endpoint — 20 calls/min per IP to guard against replay floods
const webhookLimit = rateLimiter('webhook', 20, 60_000);

router.post('/email/inbound', webhookLimit, webhooksController.inboundEmail);

export { router as webhookRouter };
