import { Router } from 'express';
import { requireAuth, requirePermission } from '../../lib/auth.js';
import * as domainsController from './domains.controller.js';

const router = Router();

router.get('/me', requireAuth, requirePermission('domain:manage'), domainsController.getMyDomain);
router.post('/', requireAuth, requirePermission('domain:manage'), domainsController.registerDomain);
router.get('/:id/verify', requireAuth, requirePermission('domain:manage'), domainsController.verifyDomain);

export { router as domainRouter };
