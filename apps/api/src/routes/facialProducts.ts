import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { logChange } from './changelog';

const router = Router();

// Helper to format facial product info for changelog
function formatProductInfo(p: any): string {
  const parts = [p.name];
  if (p.brand) parts.push(`(${p.brand})`);
  if (p.routines?.length) parts.push(`@ ${p.routines.join('+')}`);
  if (p.category) parts.push(`[${p.category}]`);
  return parts.join(' ');
}

interface CreateFacialProductRequest {
  name: string;
  brand?: string;
  step_order?: number;
  application_form?: string;
  application_amount?: string;
  application_area?: string;
  application_method?: string;
  routines?: string[];
  usage_frequency?: string;
  usage_timing?: string;
  frequency_days?: string[];
  usage_amount?: number;  // How much product used per application
  usage_unit?: string;    // Unit: ml, pumps, drops
  size_amount?: number;
  size_unit?: string;
  price?: number;
  purchase_url?: string;
  category?: string;
  subcategory?: string;
  key_ingredients?: string[];
  spf_rating?: number;
  purpose?: string;
  notes?: string;
}

/**
 * GET /api/v1/facial-products
 * Get all facial products for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { user_id, category, is_active, routine, limit = 100 } = req.query;

    // Get accessible user IDs
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
      .from('facial_products')
      .select('*')
      .eq('user_id', targetUserId)
      .order('step_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
      .limit(Number(limit));

    if (category) {
      query = query.eq('category', category);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (routine && typeof routine === 'string') {
      query = query.contains('routines', [routine]);
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
    console.error('GET /facial-products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/facial-products/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('facial_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Facial product not found',
        timestamp: new Date().toISOString()
      });
    }

    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'facial_products', 'read');
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
    console.error('GET /facial-products/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/facial-products
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const productData: CreateFacialProductRequest = req.body;

    const { data, error } = await supabase
      .from('facial_products')
      .insert({
        ...productData,
        user_id: userId,
        is_active: true,
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

    // Log the change
    await logChange(userId, {
      change_type: 'started',
      item_type: 'facial_product',
      item_id: data.id,
      item_name: data.name,
      new_value: formatProductInfo(data),
      reason: productData.purpose || undefined
    });

    res.status(201).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /facial-products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/facial-products/bulk
 * Create multiple facial products at once
 */
router.post('/bulk', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'products array is required',
        timestamp: new Date().toISOString()
      });
    }

    const productsToInsert = products.map((p: CreateFacialProductRequest) => ({
      ...p,
      user_id: userId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('facial_products')
      .insert(productsToInsert)
      .select();

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
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /facial-products/bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/facial-products/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Fetch existing record
    const { data: existing, error: findError } = await supabase
      .from('facial_products')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Facial product not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'facial_products', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('facial_products')
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

    // Log significant changes
    const changeFields = ['routines', 'category', 'is_active', 'step_order'];
    const changes: string[] = [];
    for (const field of changeFields) {
      if (updates[field] !== undefined && JSON.stringify(updates[field]) !== JSON.stringify(existing[field])) {
        changes.push(`${field}: ${JSON.stringify(existing[field]) || 'none'} → ${JSON.stringify(updates[field]) || 'none'}`);
      }
    }

    if (changes.length > 0) {
      await logChange(userId, {
        change_type: 'modified',
        item_type: 'facial_product',
        item_id: data.id,
        item_name: data.name,
        previous_value: formatProductInfo(existing),
        new_value: formatProductInfo(data),
        reason: changes.join(', ')
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /facial-products/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/facial-products/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Fetch existing record
    const { data: existing, error: findError } = await supabase
      .from('facial_products')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Facial product not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this product',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('facial_products')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Log the deletion
    await logChange(userId, {
      change_type: 'stopped',
      item_type: 'facial_product',
      item_id: id,
      item_name: existing.name,
      previous_value: formatProductInfo(existing),
      reason: 'Deleted'
    });

    res.json({
      success: true,
      message: 'Facial product deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /facial-products/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/facial-products/:id/toggle
 * Toggle facial product active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get existing record
    const { data: existing, error: findError } = await supabase
      .from('facial_products')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Facial product not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'facial_products', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('facial_products')
      .update({
        is_active: !existing.is_active,
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

    // Log started/stopped
    await logChange(userId, {
      change_type: data.is_active ? 'started' : 'stopped',
      item_type: 'facial_product',
      item_id: data.id,
      item_name: data.name,
      previous_value: existing.is_active ? 'Active' : 'Inactive',
      new_value: data.is_active ? 'Active' : 'Inactive'
    });

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PATCH /facial-products/:id/toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
