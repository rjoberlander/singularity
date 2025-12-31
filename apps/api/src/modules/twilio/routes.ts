/**
 * Twilio Routes
 */

import { Router } from 'express';
import { TwilioController } from './twilioController';

const router = Router();

// Twilio Configuration
router.get('/config', TwilioController.getConfig);
router.post('/config', TwilioController.saveConfig);
router.delete('/config', TwilioController.deleteConfig);
router.post('/test', TwilioController.testConnection);

// SMS Reminder Settings
router.get('/reminders', TwilioController.getReminderSettings);
router.post('/reminders', TwilioController.saveReminderSettings);
router.post('/reminders/test', TwilioController.sendTestReminder);
router.post('/reminders/send', TwilioController.sendSegmentReminder);

export default router;
