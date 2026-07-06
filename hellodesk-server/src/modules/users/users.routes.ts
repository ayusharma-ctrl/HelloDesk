import { Router } from 'express';
import { requireAuth, requirePermission } from '../../lib/auth.js';
import * as usersController from './users.controller.js';

const router = Router();

router.get('/', requireAuth, requirePermission('team:view'), usersController.listUsers);
router.post('/invite', requireAuth, requirePermission('agent:manage'), usersController.inviteUser);
router.patch('/:id/role', requireAuth, requirePermission('agent:manage'), usersController.updateRole);
router.patch('/:id/status', requireAuth, requirePermission('agent:manage'), usersController.updateStatus);

export { router as userRouter };
