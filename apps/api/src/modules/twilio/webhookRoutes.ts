/**
 * Twilio Webhook Routes
 * These routes are called by Twilio — NO auth required
 */

import { Router } from 'express';
import { handleIncomingSMS, handleStatusCallback } from './webhookController';

const router = Router();

// Twilio SMS webhooks (no auth — called by Twilio)
router.post('/sms/incoming', handleIncomingSMS);
router.post('/sms/status', handleStatusCallback);

export default router;
