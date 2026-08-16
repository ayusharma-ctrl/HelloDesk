import { Router } from 'express';
import { requireAuth } from '../../lib/auth.js';
import * as llmController from './llm.controller.js';

const router = Router();

router.get('/models', requireAuth, llmController.listModels);
router.post('/verify', requireAuth, llmController.verifyModel);
router.post('/models', requireAuth, llmController.addModel);
router.patch('/models/:id/default', requireAuth, llmController.setDefaultModel);
router.delete('/models/:id', requireAuth, llmController.deleteModel);
router.patch('/settings', requireAuth, llmController.updateAiSettings);
router.get('/logs', requireAuth, llmController.getObservabilityLogs);

export { router as llmRouter };
