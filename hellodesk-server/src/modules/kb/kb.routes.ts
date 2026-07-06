import { Router } from 'express';
import { requireAuth, requirePermission } from '../../lib/auth.js';
import { rateLimiter } from '../../lib/rate-limiter.js';
import * as kbController from './kb.controller.js';

const router = Router();

// Public (rate-limited)
const publicKbLimit = rateLimiter('kb-public', 30, 60_000);
router.get('/public/search', publicKbLimit, kbController.publicSearch);
router.get('/public/articles/:slug', publicKbLimit, kbController.publicGetBySlug);

// Protected (kb:manage)
router.get('/categories', requireAuth, requirePermission('kb:manage'), kbController.listCategories);
router.post('/categories', requireAuth, requirePermission('kb:manage'), kbController.createCategory);
router.get('/articles', requireAuth, requirePermission('kb:manage'), kbController.listArticles);
router.post('/articles', requireAuth, requirePermission('kb:manage'), kbController.createArticle);
router.put('/articles/:id', requireAuth, requirePermission('kb:manage'), kbController.updateArticle);
router.delete('/articles/:id', requireAuth, requirePermission('kb:manage'), kbController.deleteArticle);

export { router as knowledgeBaseRouter };
