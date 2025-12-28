import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { ProtocolDoc } from '../types';

const router = Router();

/**
 * GET /api/v1/protocol-docs
 * Get all protocol docs for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { user_id, category, limit = 100 } = req.query;

    const accessibleUserIds = await PermissionService.getAccessibleUserIds(userId);

    let targetUserId = userId;
    if (user_id && typeof user_id === 'string') {
      if (!accessibleUserIds.includes(user_id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString()
        });
      }
      targetUserId = user_id;
    }

    let query = supabase
      .from('protocol_docs')
      .select('*')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false })
      .limit(Number(limit));

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /protocol-docs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/protocol-docs/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('protocol_docs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        timestamp: new Date().toISOString()
      });
    }

    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'docs', 'read');
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /protocol-docs/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/protocol-docs
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { title, content, category, file_url } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
        timestamp: new Date().toISOString()
      });
    }

    const validCategories = ['routine', 'biomarkers', 'supplements', 'goals', 'reference', 'other'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('protocol_docs')
      .insert({
        user_id: userId,
        title,
        content,
        category: category || 'other',
        file_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /protocol-docs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/protocol-docs/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    const { data: existing, error: findError } = await supabase
      .from('protocol_docs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'docs', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('protocol_docs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /protocol-docs/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/protocol-docs/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing, error: findError } = await supabase
      .from('protocol_docs')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this document',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('protocol_docs')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Document deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /protocol-docs/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/protocol-docs/search
 * Search protocol docs by title or content
 */
router.get('/search', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { q, category } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required',
        timestamp: new Date().toISOString()
      });
    }

    const accessibleUserIds = await PermissionService.getAccessibleUserIds(userId);

    let query = supabase
      .from('protocol_docs')
      .select('*')
      .in('user_id', accessibleUserIds)
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: data || [],
      query: q,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /protocol-docs/search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
