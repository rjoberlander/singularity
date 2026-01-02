/**
 * Google Calendar Routes
 * Express router for Google Calendar integration endpoints
 */

import { Router } from 'express';
import { authenticateUser } from '../../../middleware/auth';
import {
  getOAuthConfig,
  saveOAuthConfig,
  deleteOAuthConfig,
  getAuthUrl,
  handleCallback,
  disconnect,
  getStatus,
  testConnection,
  listCalendars,
  getEvents,
  getTodayEvents,
  getUpcomingEvents,
  updateSettings,
} from '../controllers/googleCalendarController';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// OAuth configuration (Client ID/Secret)
router.get('/config', getOAuthConfig);
router.post('/config', saveOAuthConfig);
router.delete('/config', deleteOAuthConfig);

// OAuth flow
router.post('/auth-url', getAuthUrl);
router.post('/callback', handleCallback);

// Connection management
router.delete('/disconnect', disconnect);
router.get('/status', getStatus);
router.post('/test', testConnection);

// Calendar data
router.get('/calendars', listCalendars);
router.get('/events', getEvents);
router.get('/events/today', getTodayEvents);
router.get('/events/upcoming', getUpcomingEvents);

// Settings
router.patch('/settings', updateSettings);

export default router;
