/**
 * AI API Keys Routes
 */

import { Router } from 'express';
import { AIAPIKeyController } from '../controllers/aiAPIKeyController';
import { authenticateUser } from '../../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// GET /api/v1/ai-api-keys - List all keys (masked)
router.get('/', AIAPIKeyController.getAIAPIKeys);

// POST /api/v1/ai-api-keys/health-check-all - Health check all user keys (must be before /:id routes)
router.post('/health-check-all', AIAPIKeyController.healthCheckAllUserKeys);

// GET /api/v1/ai-api-keys/:id - Get single key (decrypted)
router.get('/:id', AIAPIKeyController.getAIAPIKey);

// POST /api/v1/ai-api-keys - Create new key
router.post('/', AIAPIKeyController.createAIAPIKey);

// PATCH /api/v1/ai-api-keys/:id - Update key
router.patch('/:id', AIAPIKeyController.updateAIAPIKey);

// DELETE /api/v1/ai-api-keys/:id - Delete key
router.delete('/:id', AIAPIKeyController.deleteAIAPIKey);

// POST /api/v1/ai-api-keys/:id/test - Test connection
router.post('/:id/test', AIAPIKeyController.testAIAPIConnection);

// POST /api/v1/ai-api-keys/:id/toggle-primary - Toggle primary/backup
router.post('/:id/toggle-primary', AIAPIKeyController.togglePrimaryKey);

export default router;
