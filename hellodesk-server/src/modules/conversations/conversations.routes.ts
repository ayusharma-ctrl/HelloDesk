import { Router } from 'express';
import { requireAuth, requirePermission } from '../../lib/auth.js';
import * as conversationsController from './conversations.controller.js';

const router = Router();

router.get('/', requireAuth, conversationsController.listConversations);
router.get('/:id', requireAuth, conversationsController.getConversation);
router.post('/:id/messages', requireAuth, requirePermission('conversation:reply'), conversationsController.addMessage);
router.post('/:id/messages/email', requireAuth, requirePermission('conversation:reply'), conversationsController.addEmailMessage);
router.patch('/:id/status', requireAuth, requirePermission('conversation:status:update'), conversationsController.updateStatus);
router.patch('/:id/reassign', requireAuth, requirePermission('conversation:reassign'), conversationsController.reassign);
router.patch('/:id/read', requireAuth, conversationsController.markRead);

router.get('/:id/ai-summary', requireAuth, conversationsController.getAiSummary);
router.get('/:id/ai-draft', requireAuth, conversationsController.getAiDraft);
router.post('/:id/rate', conversationsController.rateConversation);

export { router as conversationRouter };
