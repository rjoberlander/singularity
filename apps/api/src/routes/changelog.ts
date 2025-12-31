import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

export interface ChangeLogEntry {
  id: string;
  user_id: string;
  date: string;
  change_type: 'started' | 'stopped' | 'modified';
  item_type: string;
  item_id?: string;
  item_name: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  linked_concern?: string;
  created_at: string;
}

/**
 * GET /api/v1/changelog
 * Get changelog entries for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const {
      change_type,
      item_type,
      date_from,
      date_to,
      limit = 100
    } = req.query;

    let query = supabase
      .from('change_log')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(Number(limit));

    if (change_type && change_type !== 'all') {
      query = query.eq('change_type', change_type);
    }

    if (item_type && item_type !== 'all') {
      query = query.eq('item_type', item_type);
    }

    if (date_from) {
      query = query.gte('date', date_from);
    }

    if (date_to) {
      query = query.lte('date', date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /changelog query error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('GET /changelog success, count:', data?.length || 0);
    res.json({
      success: true,
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /changelog exception:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/changelog
 * Create a new changelog entry
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const {
      change_type,
      item_type,
      item_id,
      item_name,
      previous_value,
      new_value,
      reason,
      linked_concern,
      date
    } = req.body;

    if (!change_type || !item_name) {
      return res.status(400).json({
        success: false,
        error: 'change_type and item_name are required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('change_log')
      .insert({
        user_id: userId,
        date: date || new Date().toISOString(),
        change_type,
        item_type,
        item_id,
        item_name,
        previous_value,
        new_value,
        reason,
        linked_concern,
        created_at: new Date().toISOString()
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
    console.error('POST /changelog error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/changelog/recent-changes
 * Get recent protocol changes for AI correlation analysis
 * Returns changes grouped by type with biomarker-relevant metadata
 */
router.get('/recent-changes', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { days_back = 90 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(days_back));

    const { data, error } = await supabase
      .from('change_log')
      .select('*')
      .eq('user_id', userId)
      .gte('date', cutoffDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Group by item type for easier AI consumption
    const grouped = {
      supplements: (data || []).filter(d => d.item_type === 'supplement'),
      equipment: (data || []).filter(d => d.item_type === 'equipment'),
      routines: (data || []).filter(d => d.item_type === 'routine'),
      goals: (data || []).filter(d => d.item_type === 'goal'),
      other: (data || []).filter(d => !['supplement', 'equipment', 'routine', 'goal'].includes(d.item_type))
    };

    res.json({
      success: true,
      data: {
        all: data || [],
        grouped,
        period: {
          from: cutoffDate.toISOString(),
          to: new Date().toISOString(),
          days: Number(days_back)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /changelog/recent-changes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/changelog/:id
 * Delete a changelog entry
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('change_log')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('change_log')
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
      message: 'Entry deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /changelog/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

// Helper function to log changes from other routes
export async function logChange(
  userId: string,
  change: {
    change_type: 'started' | 'stopped' | 'modified';
    item_type: string;
    item_id?: string;
    item_name: string;
    previous_value?: string;
    new_value?: string;
    reason?: string;
    linked_concern?: string;
  }
) {
  try {
    await supabase.from('change_log').insert({
      user_id: userId,
      date: new Date().toISOString(),
      ...change,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log change:', error);
    // Don't throw - logging should not break the main operation
  }
}
