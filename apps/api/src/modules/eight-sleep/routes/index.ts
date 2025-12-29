/**
 * Eight Sleep Routes
 *
 * API routes for Eight Sleep integration.
 */

import { Router } from 'express';
import { EightSleepController } from '../controllers/eightSleepController';

const router = Router();

// Connection management
router.post('/connect', EightSleepController.connect);
router.delete('/disconnect', EightSleepController.disconnect);
router.get('/status', EightSleepController.getStatus);

// Sync operations
router.post('/sync', EightSleepController.sync);

// Sleep data
router.get('/sessions', EightSleepController.getSessions);
router.get('/sessions/:id', EightSleepController.getSession);

// Analysis
router.get('/analysis', EightSleepController.getAnalysis);
router.get('/trends', EightSleepController.getTrends);

// Correlations
router.get('/correlations', EightSleepController.getCorrelations);
router.get('/correlations/summary', EightSleepController.getCorrelationSummary);
router.get('/correlations/factors', EightSleepController.getDailyFactorCorrelations);
router.post('/correlations/build', EightSleepController.buildCorrelations);

// Settings
router.patch('/settings', EightSleepController.updateSettings);
router.get('/timezones', EightSleepController.getTimezones);

export default router;
