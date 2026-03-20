/**
 * Google Contacts Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { googleContactsService, GOOGLE_CONTACTS_SCOPE } from './service';

const router = Router();

router.use(authenticateUser);

/**
 * GET /api/v1/google-contacts/status
 * Check if contacts scope is authorized
 */
router.get('/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const hasScope = await googleContactsService.hasContactsScope(userId);

    res.json({
      success: true,
      data: {
        authorized: hasScope,
        scope: GOOGLE_CONTACTS_SCOPE,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /google-contacts/status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/google-contacts/sync
 * Sync contacts from Google People API to cache
 */
router.post('/sync', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const result = await googleContactsService.syncContacts(userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /google-contacts/sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync contacts',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/google-contacts/contacts
 * List cached contacts with optional search
 */
router.get('/contacts', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    const contacts = await googleContactsService.getContacts(
      userId,
      search as string | undefined
    );

    res.json({
      success: true,
      data: contacts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /google-contacts/contacts error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch contacts',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
