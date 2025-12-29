/**
 * Eight Sleep Controller
 *
 * HTTP request handlers for Eight Sleep integration endpoints.
 */

import { Request, Response } from 'express';
import { EightSleepService } from '../services/eightSleepService';
import { ConnectRequest, UpdateSyncSettingsRequest, COMMON_TIMEZONES } from '../types';

export class EightSleepController {
  /**
   * POST /api/v1/eight-sleep/connect
   * Connect an Eight Sleep account
   */
  static async connect(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { email, password, sync_time, sync_timezone } = req.body as ConnectRequest;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Validate timezone if provided
      if (sync_timezone && !isValidTimezone(sync_timezone)) {
        res.status(400).json({ error: 'Invalid timezone' });
        return;
      }

      // Validate sync time if provided (HH:MM or HH:MM:SS format)
      if (sync_time && !isValidTime(sync_time)) {
        res.status(400).json({ error: 'Invalid sync time format. Use HH:MM or HH:MM:SS' });
        return;
      }

      const result = await EightSleepService.connect(userId, {
        email,
        password,
        sync_time,
        sync_timezone,
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Trigger initial sync in background
      EightSleepService.sync(userId, { initialSync: true }).catch((err) => {
        console.error('Initial sync failed:', err);
      });

      res.status(200).json({
        message: 'Eight Sleep connected successfully',
        integration_id: result.integration_id,
        device_id: result.device_id,
        side: result.side,
      });
    } catch (error) {
      console.error('Failed to connect Eight Sleep:', error);
      res.status(500).json({ error: 'Failed to connect Eight Sleep' });
    }
  }

  /**
   * DELETE /api/v1/eight-sleep/disconnect
   * Disconnect Eight Sleep account
   */
  static async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await EightSleepService.disconnect(userId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: 'Eight Sleep disconnected successfully' });
    } catch (error) {
      console.error('Failed to disconnect Eight Sleep:', error);
      res.status(500).json({ error: 'Failed to disconnect Eight Sleep' });
    }
  }

  /**
   * GET /api/v1/eight-sleep/status
   * Get integration status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await EightSleepService.getStatus(userId);
      res.status(200).json(status);
    } catch (error) {
      console.error('Failed to get Eight Sleep status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }

  /**
   * POST /api/v1/eight-sleep/sync
   * Trigger manual sync
   */
  static async sync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { from_date, to_date, initial } = req.body;

      const result = await EightSleepService.sync(userId, {
        fromDate: from_date,
        toDate: to_date,
        initialSync: initial === true,
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({
        message: 'Sync completed successfully',
        sessions_synced: result.sessions_synced,
        latest_date: result.latest_date,
      });
    } catch (error) {
      console.error('Failed to sync Eight Sleep:', error);
      res.status(500).json({ error: 'Failed to sync data' });
    }
  }

  /**
   * GET /api/v1/eight-sleep/sessions
   * Get sleep sessions
   */
  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { from_date, to_date, limit, offset } = req.query;

      const result = await EightSleepService.getSessions(userId, {
        fromDate: from_date as string,
        toDate: to_date as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Failed to get sleep sessions:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  /**
   * GET /api/v1/eight-sleep/sessions/:id
   * Get a single sleep session
   */
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID required' });
        return;
      }

      const session = await EightSleepService.getSession(userId, sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.status(200).json(session);
    } catch (error) {
      console.error('Failed to get sleep session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }

  /**
   * GET /api/v1/eight-sleep/analysis
   * Get sleep analysis summary
   */
  static async getAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      const analysis = await EightSleepService.getAnalysis(userId, days);

      if (!analysis) {
        res.status(200).json({
          total_nights: 0,
          avg_sleep_score: null,
          avg_deep_sleep_pct: null,
          avg_rem_sleep_pct: null,
          avg_hrv: null,
          avg_time_slept_hours: null,
          nights_with_2_4_am_wake: 0,
          wake_2_4_am_rate: 0,
        });
        return;
      }

      res.status(200).json(analysis);
    } catch (error) {
      console.error('Failed to get sleep analysis:', error);
      res.status(500).json({ error: 'Failed to get analysis' });
    }
  }

  /**
   * GET /api/v1/eight-sleep/trends
   * Get sleep trends for charting
   */
  static async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      const trends = await EightSleepService.getTrends(userId, days);
      res.status(200).json({ trends });
    } catch (error) {
      console.error('Failed to get sleep trends:', error);
      res.status(500).json({ error: 'Failed to get trends' });
    }
  }

  /**
   * PATCH /api/v1/eight-sleep/settings
   * Update sync settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sync_enabled, sync_time, sync_timezone } = req.body as UpdateSyncSettingsRequest;

      // Validate timezone if provided
      if (sync_timezone && !isValidTimezone(sync_timezone)) {
        res.status(400).json({ error: 'Invalid timezone' });
        return;
      }

      // Validate sync time if provided
      if (sync_time && !isValidTime(sync_time)) {
        res.status(400).json({ error: 'Invalid sync time format. Use HH:MM or HH:MM:SS' });
        return;
      }

      const result = await EightSleepService.updateSettings(userId, {
        sync_enabled,
        sync_time,
        sync_timezone,
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Failed to update Eight Sleep settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  /**
   * GET /api/v1/eight-sleep/timezones
   * Get list of supported timezones
   */
  static async getTimezones(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ timezones: COMMON_TIMEZONES });
  }
}

/**
 * Validate timezone string
 */
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate time string (HH:MM or HH:MM:SS)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
}

export default EightSleepController;
