import { Router } from 'express';
import { tokenBucketRateLimiter } from '../../lib/rate-limiter.js';
import * as webhooksController from './webhooks.controller.js';

const router = Router();

// Webhook endpoint — burst of 20 requests and then 20 requests per minute per IP to guard against replay floods
const webhookLimit = tokenBucketRateLimiter('webhook', 20, 1/3);

router.post('/email/inbound', webhookLimit, webhooksController.inboundEmail);

export { router as webhookRouter };
