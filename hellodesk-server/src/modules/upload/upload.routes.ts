import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../lib/auth.js';
import * as uploadController from './upload.controller.js';

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max
const router = Router();

router.post('/', upload.single('file'), uploadController.uploadMedia);

export { router as uploadRouter };
