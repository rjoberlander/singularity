/**
 * Google Calendar Controller
 * HTTP endpoints for Google Calendar integration
 */

import { Request, Response } from 'express';
import { googleCalendarService } from '../services/googleCalendarService';

// Type for authenticated requests
interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: {
    id: string;
    email?: string;
    workspace_id?: string;
  };
}

/**
 * Get OAuth config status
 * GET /api/v1/google-calendar/config
 */
export const getOAuthConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const configStatus = await googleCalendarService.getOAuthConfigStatus(userId);

    res.json({
      success: true,
      data: configStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting OAuth config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get OAuth configuration',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Save OAuth config
 * POST /api/v1/google-calendar/config
 */
export const saveOAuthConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { client_id, client_secret, redirect_uri } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    if (!client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        error: 'Client ID and Client Secret are required',
        timestamp: new Date().toISOString(),
      });
    }

    await googleCalendarService.saveOAuthConfig(userId, client_id, client_secret, redirect_uri);

    res.json({
      success: true,
      message: 'OAuth configuration saved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving OAuth config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save OAuth configuration',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete OAuth config
 * DELETE /api/v1/google-calendar/config
 */
export const deleteOAuthConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    await googleCalendarService.deleteOAuthConfig(userId);

    res.json({
      success: true,
      message: 'OAuth configuration deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting OAuth config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete OAuth configuration',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Generate OAuth authorization URL
 * POST /api/v1/google-calendar/auth-url
 */
export const getAuthUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const state = req.body.state; // Optional state for CSRF protection

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const authUrl = await googleCalendarService.generateAuthUrl(userId, state);

    res.json({
      success: true,
      data: { authUrl },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate authorization URL',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Complete OAuth flow and connect account
 * POST /api/v1/google-calendar/callback
 */
export const handleCallback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📅 [Google Calendar] Processing OAuth callback for user ${userId}`);

    // Exchange code for tokens
    const credentials = await googleCalendarService.exchangeCodeForTokens(userId, code);

    // Connect the account
    const result = await googleCalendarService.connect(userId, credentials);

    res.json({
      success: true,
      data: {
        google_email: result.google_email,
        message: 'Google Calendar connected successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('📅 [Google Calendar] OAuth callback error:', error);

    let errorMessage = 'Failed to connect Google Calendar';
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'Authorization code expired or invalid. Please try again.';
      } else if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'OAuth configuration error. Please contact support.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Disconnect Google Calendar
 * DELETE /api/v1/google-calendar/disconnect
 */
export const disconnect = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    await googleCalendarService.disconnect(userId);

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Google Calendar',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get connection status
 * GET /api/v1/google-calendar/status
 */
export const getStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const status = await googleCalendarService.getStatus(userId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting Google Calendar status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Test the connection
 * POST /api/v1/google-calendar/test
 */
export const testConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await googleCalendarService.testConnection(userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Connection test successful',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Connection test failed',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error testing Google Calendar connection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test connection',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * List user's calendars
 * GET /api/v1/google-calendar/calendars
 */
export const listCalendars = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const calendars = await googleCalendarService.listCalendars(userId);

    res.json({
      success: true,
      data: calendars,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing calendars:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list calendars',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get calendar events
 * GET /api/v1/google-calendar/events
 */
export const getEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const {
      calendar_id: calendarId,
      time_min: timeMin,
      time_max: timeMax,
      max_results: maxResults,
    } = req.query;

    const events = await googleCalendarService.getEvents(userId, {
      calendarId: calendarId as string | undefined,
      timeMin: timeMin as string | undefined,
      timeMax: timeMax as string | undefined,
      maxResults: maxResults ? parseInt(maxResults as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch events',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get today's events
 * GET /api/v1/google-calendar/events/today
 */
export const getTodayEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const events = await googleCalendarService.getTodayEvents(userId);

    res.json({
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching today\'s events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch today\'s events',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get upcoming events
 * GET /api/v1/google-calendar/events/upcoming
 */
export const getUpcomingEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const events = await googleCalendarService.getUpcomingEvents(userId, days);

    res.json({
      success: true,
      data: events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming events',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update settings
 * PATCH /api/v1/google-calendar/settings
 */
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const { sync_enabled, primary_calendar_id } = req.body;

    await googleCalendarService.updateSettings(userId, {
      sync_enabled,
      primary_calendar_id,
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating Google Calendar settings:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
      timestamp: new Date().toISOString(),
    });
  }
};
