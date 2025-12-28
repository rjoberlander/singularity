import { Router, Request, Response } from 'express';
import { supabaseClient, supabase } from '../config/supabase';
import { UserService } from '../services/userService';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  authGeneralLimiter
} from '../middleware/rateLimiting';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user (open registration for Singularity)
 */
router.post('/register', registerLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || ''
        }
      }
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: authError.message,
        timestamp: new Date().toISOString()
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create user',
        timestamp: new Date().toISOString()
      });
    }

    // Create user profile in our users table
    const userResult = await UserService.createUser({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || '',
      role: 'owner', // First user is owner
      is_active: true,
      onboarding_completed: false,
      onboarding_step: 'profile'
    });

    if (!userResult.success) {
      console.error('Failed to create user profile:', userResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile',
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user_id: authData.user.id,
        email: authData.user.email,
        session: authData.session
      },
      message: 'Account created successfully. Please complete your profile.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/auth/register-invite
 * Register via invite code (for family sharing)
 */
router.post('/register-invite', registerLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name, invite_code } = req.body;

    if (!email || !password || !invite_code) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and invite code are required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate invite code
    const { data: invite, error: inviteError } = await supabase
      .from('user_links')
      .select('*')
      .eq('invite_code', invite_code)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired invite code',
        timestamp: new Date().toISOString()
      });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || ''
        }
      }
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: authError.message,
        timestamp: new Date().toISOString()
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create user',
        timestamp: new Date().toISOString()
      });
    }

    // Create user profile
    const userResult = await UserService.createUser({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || '',
      role: 'member', // Invited users are members
      is_active: true,
      onboarding_completed: false,
      onboarding_step: 'profile'
    });

    if (!userResult.success) {
      console.error('Failed to create user profile:', userResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile',
        timestamp: new Date().toISOString()
      });
    }

    // Accept the invite
    await UserService.acceptInvite(invite_code, authData.user.id);

    res.status(201).json({
      success: true,
      data: {
        user_id: authData.user.id,
        email: authData.user.email,
        session: authData.session
      },
      message: 'Account created and linked successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Registration via invite error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/auth/login
 */
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', authGeneralLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }

    res.json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', authGeneralLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        session: data.session
      },
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/auth/reset-password
 */
router.post('/reset-password', passwordResetLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        timestamp: new Date().toISOString()
      });
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8081').replace(/\/+$/, '');
    const redirectUrl = `${frontendUrl}/reset-password`;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/auth/reset-password/confirm
 */
router.post('/reset-password/confirm', passwordResetLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { access_token, refresh_token, new_password } = req.body;

    if (!access_token || !refresh_token || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Access token, refresh token, and new password are required',
        timestamp: new Date().toISOString()
      });
    }

    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired tokens',
        timestamp: new Date().toISOString()
      });
    }

    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: new_password
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/auth/invitations/:code/validate
 * Validate an invite code (public endpoint)
 */
router.get('/invitations/:code/validate', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code } = req.params;

    const { data: invite, error } = await supabase
      .from('user_links')
      .select('id, permission, status, owner_user, users!user_links_owner_user_fkey(name, email)')
      .eq('invite_code', code)
      .single();

    if (error || !invite) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite code',
        timestamp: new Date().toISOString()
      });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: invite.status === 'active' ? 'Invite already used' : 'Invite has been revoked',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        permission: invite.permission,
        inviter: (invite.users as any)?.name || 'A user'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Invite validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
