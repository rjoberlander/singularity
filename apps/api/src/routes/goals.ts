import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { CreateGoalRequest } from '../types';

const router = Router();

/**
 * GET /api/v1/goals
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { user_id, status, category } = req.query;

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
      .from('goals')
      .select(`
        *,
        interventions:goal_interventions(*)
      `)
      .eq('user_id', targetUserId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

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
    console.error('GET /goals error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/goals/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        interventions:goal_interventions(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        timestamp: new Date().toISOString()
      });
    }

    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'goals', 'read');
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
    console.error('GET /goals/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/goals
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const goalData: CreateGoalRequest = req.body;

    const { data, error } = await supabase
      .from('goals')
      .insert({
        ...goalData,
        user_id: userId,
        status: 'active',
        priority: goalData.priority || 0,
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
    console.error('POST /goals error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/goals/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    const { data: existing, error: findError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'goals', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('goals')
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
    console.error('PUT /goals/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/goals/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing, error: findError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this goal',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('goals')
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
      message: 'Goal deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /goals/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/goals/:id/status
 * Update goal status (active, achieved, paused)
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'achieved', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, achieved, or paused',
        timestamp: new Date().toISOString()
      });
    }

    const { data: existing, error: findError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'goals', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('goals')
      .update({
        status,
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
    console.error('PATCH /goals/:id/status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// Goal Interventions
// ============================================

/**
 * POST /api/v1/goals/:goalId/interventions
 */
router.post('/:goalId/interventions', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { goalId } = req.params;
    const { intervention, type } = req.body;

    // Check goal ownership
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, goal.user_id, 'goals', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('goal_interventions')
      .insert({
        goal_id: goalId,
        intervention,
        type,
        status: 'active',
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
    console.error('POST /goals/:goalId/interventions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/goals/interventions/:interventionId
 */
router.delete('/interventions/:interventionId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { interventionId } = req.params;

    // Get intervention and check goal ownership
    const { data: intervention, error: intError } = await supabase
      .from('goal_interventions')
      .select('goal_id, goals(user_id)')
      .eq('id', interventionId)
      .single();

    if (intError || !intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const goalUserId = (intervention.goals as any)?.user_id;
    if (goalUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this intervention',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('goal_interventions')
      .delete()
      .eq('id', interventionId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Intervention deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /goals/interventions/:interventionId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
