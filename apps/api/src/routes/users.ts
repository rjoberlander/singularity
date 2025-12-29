import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { InviteUserRequest } from '../types';

const router = Router();

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user!;

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /users/me error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/users/me
 * Update current user profile
 */
router.put('/me', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name, avatar_url, timezone } = req.body;

    const result = await UserService.updateUserProfile(userId, {
      name,
      avatar_url,
      timezone
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('PUT /users/me error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/users/onboarding/step
 * Update onboarding step
 */
router.post('/onboarding/step', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { step } = req.body;

    if (!['profile', 'goals', 'supplements', 'completed'].includes(step)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step. Must be: profile, goals, supplements, or completed',
        timestamp: new Date().toISOString()
      });
    }

    const result = await UserService.updateOnboardingStep(userId, step);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('POST /users/onboarding/step error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/users/onboarding/complete
 * Mark onboarding as complete
 */
router.post('/onboarding/complete', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const result = await UserService.completeOnboarding(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('POST /users/onboarding/complete error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// Family Sharing (User Links)
// ============================================

/**
 * GET /api/v1/users/links
 * Get all linked users (family members)
 */
router.get('/links', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const result = await UserService.getLinkedUsers(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('GET /users/links error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/users/links/invite
 * Create an invite link for family sharing
 */
router.post('/links/invite', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { permission = 'read' } = req.body;

    if (!['read', 'write', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid permission. Must be: read, write, or admin',
        timestamp: new Date().toISOString()
      });
    }

    const result = await UserService.createInviteLink(userId, permission);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Return the invite code for sharing
    res.status(201).json({
      success: true,
      data: {
        invite_code: result.data?.invite_code,
        permission,
        expires_in: '7 days' // For display purposes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /users/links/invite error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/users/links/accept
 * Accept an invite code
 */
router.post('/links/accept', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { invite_code } = req.body;

    if (!invite_code) {
      return res.status(400).json({
        success: false,
        error: 'invite_code is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await UserService.acceptInvite(invite_code, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('POST /users/links/accept error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/users/links/:linkId
 * Revoke a user link
 */
router.delete('/links/:linkId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { linkId } = req.params;

    const result = await UserService.revokeLink(linkId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('DELETE /users/links/:linkId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
