/**
 * Health Chat Routes
 */

import { Router } from 'express';
import { healthChatController } from '../controllers/healthChatController';
import { authenticateUser } from '../../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Chat endpoint
router.post('/', (req, res) => healthChatController.chat(req, res));

// Session management
router.get('/sessions', (req, res) => healthChatController.getSessions(req, res));
router.post('/sessions', (req, res) => healthChatController.createSession(req, res));
router.get('/sessions/:sessionId', (req, res) => healthChatController.getSession(req, res));
router.delete('/sessions/:sessionId', (req, res) => healthChatController.deleteSession(req, res));

// Message feedback
router.post('/messages/:messageId/feedback', (req, res) => healthChatController.submitFeedback(req, res));

export default router;
