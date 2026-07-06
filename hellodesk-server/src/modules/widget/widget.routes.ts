import { Router } from 'express';
import { rateLimiter } from '../../lib/rate-limiter.js';
import * as widgetController from './widget.controller.js';

const router = Router();

// Public widget endpoints — generous limit (60/min) but still protected
const widgetLimit = rateLimiter('widget', 60, 60_000);

router.post('/conversations', widgetLimit, widgetController.startConversation);
router.post('/messages', widgetLimit, widgetController.sendMessage);
router.get('/history', widgetLimit, widgetController.getHistory);
router.get('/kb-suggestions', widgetLimit, widgetController.kbSuggestions);
router.get('/status', widgetLimit, widgetController.getStatus);

export { router as widgetRouter };
