import { Router } from 'express';
import { requireAuth } from '../../lib/auth.js';
import * as agentsController from './agents.controller.js';

const router = Router();

router.get('/me/status', requireAuth, agentsController.getMyStatus);
router.patch('/me/status', requireAuth, agentsController.setMyStatus);
router.get('/presence', requireAuth, agentsController.listPresence);

export { router as agentRouter };
