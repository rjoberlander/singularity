/**
 * Telegram Bot Admin Routes
 * All endpoints require JWT authentication
 */

import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { telegramAdminController } from './telegramAdminController';

const router = Router();

// All admin endpoints require auth
router.use(authenticateUser);

router.get('/status', telegramAdminController.getStatus);
router.post('/start', telegramAdminController.startBot);
router.post('/stop', telegramAdminController.stopBot);
router.post('/notify', telegramAdminController.sendNotify);

export default router;
