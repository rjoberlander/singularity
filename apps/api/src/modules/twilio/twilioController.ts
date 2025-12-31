/**
 * Twilio Settings Controller
 * Handles API endpoints for Twilio configuration and SMS reminders
 */

import { Request, Response } from 'express';
import { TwilioService } from './twilioService';
import { SMSReminderService, DAY_SEGMENTS } from './smsReminderService';

export class TwilioController {
  /**
   * GET /api/v1/twilio/config
   * Get Twilio configuration (masked)
   */
  static async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const config = await TwilioService.getMaskedCredentials(userId);

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting Twilio config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Twilio configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/twilio/config
   * Save Twilio configuration
   */
  static async saveConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { accountSid, authToken, fromNumber } = req.body;

      if (!accountSid || !authToken || !fromNumber) {
        res.status(400).json({
          success: false,
          error: 'Account SID, Auth Token, and From Number are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate phone number format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(fromNumber)) {
        res.status(400).json({
          success: false,
          error: 'From Number must be in E.164 format (e.g., +15551234567)',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await TwilioService.saveCredentials(userId, {
        accountSid,
        authToken,
        fromNumber
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'Twilio configuration saved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving Twilio config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save Twilio configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/twilio/test
   * Test Twilio connection
   */
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { accountSid, authToken } = req.body;

      // If credentials provided, test those. Otherwise test saved credentials.
      let credentials;
      if (accountSid && authToken) {
        credentials = { accountSid, authToken, fromNumber: '' };
      } else {
        credentials = await TwilioService.getCredentials(userId);
        if (!credentials) {
          res.status(400).json({
            success: false,
            error: 'No Twilio credentials configured',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      const result = await TwilioService.testConnection(credentials);

      res.json({
        success: result.success,
        accountInfo: result.accountInfo,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error testing Twilio connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test Twilio connection',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/v1/twilio/config
   * Delete Twilio configuration
   */
  static async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await TwilioService.deleteCredentials(userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'Twilio configuration deleted',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting Twilio config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete Twilio configuration',
        timestamp: new Date().toISOString()
      });
    }
  }

  // ============================================
  // SMS Reminder Settings
  // ============================================

  /**
   * GET /api/v1/twilio/reminders
   * Get SMS reminder settings
   */
  static async getReminderSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const settings = await SMSReminderService.getReminderSettings(userId);

      res.json({
        success: true,
        data: settings || {
          enabled: false,
          phoneNumber: null,
          segmentTimes: SMSReminderService.getDefaultSegmentTimes(),
          enabledSegments: []
        },
        segments: DAY_SEGMENTS,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting reminder settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reminder settings',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/twilio/reminders
   * Save SMS reminder settings
   */
  static async saveReminderSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { enabled, phoneNumber, segmentTimes, enabledSegments } = req.body;

      // Validate phone number if provided
      if (phoneNumber) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
          res.status(400).json({
            success: false,
            error: 'Phone number must be in E.164 format (e.g., +15551234567)',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      const result = await SMSReminderService.saveReminderSettings(userId, {
        enabled,
        phoneNumber,
        segmentTimes,
        enabledSegments
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        message: 'Reminder settings saved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save reminder settings',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/twilio/reminders/test
   * Send a test reminder
   */
  static async sendTestReminder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await SMSReminderService.sendTestReminder(userId);

      res.json({
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending test reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test reminder',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/v1/twilio/reminders/send
   * Manually trigger a segment reminder (for testing)
   */
  static async sendSegmentReminder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { segment } = req.body;

      if (!segment) {
        res.status(400).json({
          success: false,
          error: 'Segment is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const validSegments = DAY_SEGMENTS.map(s => s.segment);
      if (!validSegments.includes(segment)) {
        res.status(400).json({
          success: false,
          error: `Invalid segment. Must be one of: ${validSegments.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await SMSReminderService.sendSegmentReminder(userId, segment);

      res.json({
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending segment reminder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send segment reminder',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default TwilioController;
