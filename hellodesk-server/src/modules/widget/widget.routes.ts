import { Router } from 'express';
import { tokenBucketRateLimiter } from '../../lib/rate-limiter.js';
import * as widgetController from './widget.controller.js';

const router = Router();

// Public widget endpoints — generous limit (70/min - burst of 10 and then 1 per second)
const widgetLimit = tokenBucketRateLimiter('widget', 10, 1);

router.post('/conversations', widgetLimit, widgetController.startConversation);
router.post('/messages', widgetLimit, widgetController.sendMessage);
router.get('/history', widgetLimit, widgetController.getHistory);
router.get('/kb-suggestions', widgetLimit, widgetController.kbSuggestions);
router.get('/status', widgetLimit, widgetController.getStatus);

export { router as widgetRouter };
