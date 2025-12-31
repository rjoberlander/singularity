import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { CreateRoutineRequest, CreateRoutineItemRequest } from '../types';

const router = Router();

/**
 * GET /api/v1/routines
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { user_id } = req.query;

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

    // Get routines with their items
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        items:routine_items(*)
      `)
      .eq('user_id', targetUserId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET /routines query error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('GET /routines success, count:', data?.length || 0);
    res.json({
      success: true,
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /routines exception:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/routines/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        items:routine_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found',
        timestamp: new Date().toISOString()
      });
    }

    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'routines', 'read');
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
    console.error('GET /routines/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/routines
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const routineData: CreateRoutineRequest = req.body;

    const { data, error } = await supabase
      .from('routines')
      .insert({
        ...routineData,
        user_id: userId,
        sort_order: routineData.sort_order || 0,
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
    console.error('POST /routines error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/routines/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    const { data: existing, error: findError } = await supabase
      .from('routines')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'routines', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('routines')
      .update(updates)
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
    console.error('PUT /routines/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/routines/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing, error: findError } = await supabase
      .from('routines')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this routine',
        timestamp: new Date().toISOString()
      });
    }

    // Delete routine (cascade will delete items)
    const { error } = await supabase
      .from('routines')
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
      message: 'Routine deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /routines/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// Routine Items
// ============================================

/**
 * POST /api/v1/routines/:routineId/items
 */
router.post('/:routineId/items', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { routineId } = req.params;
    const itemData: Omit<CreateRoutineItemRequest, 'routine_id'> = req.body;

    // Check routine ownership
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .select('user_id')
      .eq('id', routineId)
      .single();

    if (routineError || !routine) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, routine.user_id, 'routines', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('routine_items')
      .insert({
        ...itemData,
        routine_id: routineId,
        days: itemData.days || [],
        sort_order: itemData.sort_order || 0,
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
    console.error('POST /routines/:routineId/items error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/routines/items/:itemId
 */
router.put('/items/:itemId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const updates = req.body;

    // Get item and check routine ownership
    const { data: item, error: itemError } = await supabase
      .from('routine_items')
      .select('routine_id, routines(user_id)')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({
        success: false,
        error: 'Routine item not found',
        timestamp: new Date().toISOString()
      });
    }

    const routineUserId = (item.routines as any)?.user_id;
    const canWrite = await PermissionService.canAccessUserData(userId, routineUserId, 'routines', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('routine_items')
      .update(updates)
      .eq('id', itemId)
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
    console.error('PUT /routines/items/:itemId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/routines/items/:itemId
 */
router.delete('/items/:itemId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    // Get item and check routine ownership
    const { data: item, error: itemError } = await supabase
      .from('routine_items')
      .select('routine_id, routines(user_id)')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({
        success: false,
        error: 'Routine item not found',
        timestamp: new Date().toISOString()
      });
    }

    const routineUserId = (item.routines as any)?.user_id;
    if (routineUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this item',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('routine_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Routine item deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /routines/items/:itemId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
