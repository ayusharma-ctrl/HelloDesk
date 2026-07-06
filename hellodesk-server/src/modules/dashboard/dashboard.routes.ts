import { Router } from 'express';
import { requireAuth, requirePermission } from '../../lib/auth.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

router.get('/overview', requireAuth, requirePermission('dashboard:view'), dashboardController.getOverview);

export { router as dashboardRouter };
