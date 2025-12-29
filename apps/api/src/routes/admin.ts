/**
 * Admin Routes
 * Protected endpoints for system administration and cron management
 */

import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { runHealthCheckNow } from '../cron/aiKeyHealthCheck';
import { getSchedulerStatus } from '../modules/eight-sleep/jobs/syncScheduler';

const router = Router();

// All admin routes require authentication
router.use(authenticateUser);

/**
 * GET /api/v1/admin/cron/status
 * Get status of all cron jobs
 */
router.get('/cron/status', async (req: Request, res: Response) => {
  try {
    const syncSchedulerStatus = getSchedulerStatus();

    res.json({
      success: true,
      crons: {
        aiKeyHealthCheck: {
          name: 'AI API Key Health Check',
          schedule: 'Daily at 2:00 AM',
          status: 'scheduled', // node-cron doesn't expose running status
          description: 'Tests all active AI API keys and updates health status'
        },
        eightSleepSync: {
          name: 'Eight Sleep Sync Scheduler',
          schedule: 'Every minute',
          status: syncSchedulerStatus.running ? 'running' : 'stopped',
          trackedUsers: syncSchedulerStatus.trackedUsers,
          description: 'Syncs Eight Sleep data for users based on their configured time'
        }
      },
      serverTime: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cron status'
    });
  }
});

/**
 * POST /api/v1/admin/cron/ai-health-check/trigger
 * Manually trigger the AI API key health check
 */
router.post('/cron/ai-health-check/trigger', async (req: Request, res: Response) => {
  try {
    console.log(`[Admin] Manual AI health check triggered by user ${req.user?.id}`);

    // Run the health check
    await runHealthCheckNow();

    res.json({
      success: true,
      message: 'AI API key health check triggered successfully',
      triggeredAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering AI health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger AI health check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/admin/system/info
 * Get system information
 */
router.get('/system/info', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development'
      },
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system info'
    });
  }
});

export default router;
