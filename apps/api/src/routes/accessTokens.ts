import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import crypto from 'crypto';

const router = Router();

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return 'sng_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * GET /api/v1/access-tokens
 * List all access tokens for the user (masked)
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data: tokens, error } = await supabase
      .from('access_tokens')
      .select('id, name, token_prefix, scopes, is_active, last_used_at, expires_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access tokens:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch access tokens',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: tokens || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /access-tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/access-tokens
 * Create a new access token
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name, scopes = ['read', 'write'], expires_in_days } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Token name is required',
        timestamp: new Date().toISOString()
      });
    }

    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const tokenPrefix = token.substring(0, 12); // sng_ + 8 chars

    // Calculate expiry if specified
    let expiresAt = null;
    if (expires_in_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expires_in_days);
      expiresAt = expiry.toISOString();
    }

    // Store token
    const { data: newToken, error } = await supabase
      .from('access_tokens')
      .insert({
        user_id: userId,
        name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        scopes,
        expires_at: expiresAt
      })
      .select('id, name, token_prefix, scopes, is_active, expires_at, created_at')
      .single();

    if (error) {
      console.error('Error creating access token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create access token',
        timestamp: new Date().toISOString()
      });
    }

    // Return the full token ONLY on creation (it won't be retrievable later)
    res.status(201).json({
      success: true,
      data: {
        ...newToken,
        token // The actual token - shown only once!
      },
      message: 'Token created. Copy it now - it won\'t be shown again!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /access-tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/access-tokens/:id
 * Revoke an access token
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('access_tokens')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting access token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete access token',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Token revoked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /access-tokens/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/access-tokens/:id/toggle
 * Enable/disable an access token
 */
router.patch('/:id/toggle', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get current state
    const { data: token, error: fetchError } = await supabase
      .from('access_tokens')
      .select('is_active')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
        timestamp: new Date().toISOString()
      });
    }

    // Toggle
    const { data: updatedToken, error: updateError } = await supabase
      .from('access_tokens')
      .update({ is_active: !token.is_active })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, name, is_active')
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update token',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: updatedToken,
      message: updatedToken.is_active ? 'Token enabled' : 'Token disabled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PATCH /access-tokens/:id/toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/access-tokens/test
 * Test an access token (validates the token without using it)
 */
router.post('/test', async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        timestamp: new Date().toISOString()
      });
    }

    const tokenHash = hashToken(token);

    const { data: accessToken, error } = await supabase
      .from('access_tokens')
      .select('id, name, is_active, expires_at, user_id')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !accessToken) {
      return res.json({
        success: true,
        data: {
          valid: false,
          reason: 'Token not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (!accessToken.is_active) {
      return res.json({
        success: true,
        data: {
          valid: false,
          reason: 'Token is disabled'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (accessToken.expires_at && new Date(accessToken.expires_at) < new Date()) {
      return res.json({
        success: true,
        data: {
          valid: false,
          reason: 'Token has expired'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Update last_used_at
    await supabase
      .from('access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', accessToken.id);

    res.json({
      success: true,
      data: {
        valid: true,
        token_name: accessToken.name
      },
      message: 'Token is valid and active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /access-tokens/test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
