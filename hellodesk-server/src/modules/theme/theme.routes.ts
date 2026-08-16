import { Router } from 'express';
import { requireAuth } from '../../lib/auth.js';
import * as themeController from './theme.controller.js';

const router = Router();

router.put('/', requireAuth, themeController.updateTheme);
router.put('/details', requireAuth, themeController.updateWorkspaceDetails);

export { router as themeRouter };
