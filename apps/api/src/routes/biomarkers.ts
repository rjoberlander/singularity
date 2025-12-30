import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { Biomarker, CreateBiomarkerRequest, ApiResponse, BiomarkerWithStatus } from '../types';
import { BIOMARKER_REFERENCE, getCategories } from '../data/biomarkerReference';

const router = Router();

/**
 * Get biomarker status based on reference ranges
 */
function getBiomarkerStatus(biomarker: Biomarker): BiomarkerWithStatus {
  let status: 'low' | 'normal' | 'high' | 'optimal' = 'normal';

  if (biomarker.reference_range_low !== undefined && biomarker.reference_range_high !== undefined) {
    if (biomarker.value < biomarker.reference_range_low) {
      status = 'low';
    } else if (biomarker.value > biomarker.reference_range_high) {
      status = 'high';
    } else if (biomarker.optimal_range_low !== undefined && biomarker.optimal_range_high !== undefined) {
      if (biomarker.value >= biomarker.optimal_range_low && biomarker.value <= biomarker.optimal_range_high) {
        status = 'optimal';
      }
    }
  }

  return { ...biomarker, status };
}

/**
 * GET /api/v1/biomarkers
 * Get all biomarkers for the authenticated user (and linked users)
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { user_id, category, name, date_from, date_to, limit = 100 } = req.query;

    // Get accessible user IDs
    const accessibleUserIds = await PermissionService.getAccessibleUserIds(userId);

    // If specific user_id is requested, check access
    let targetUserId = userId;
    if (user_id && typeof user_id === 'string') {
      if (!accessibleUserIds.includes(user_id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this user\'s data',
          timestamp: new Date().toISOString()
        });
      }
      targetUserId = user_id;
    }

    let query = supabase
      .from('biomarkers')
      .select('*')
      .eq('user_id', targetUserId)
      .order('date_tested', { ascending: false })
      .limit(Number(limit));

    if (category) {
      query = query.eq('category', category);
    }

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    if (date_from) {
      query = query.gte('date_tested', date_from);
    }

    if (date_to) {
      query = query.lte('date_tested', date_to);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Add status to each biomarker
    const biomarkersWithStatus = (data || []).map(getBiomarkerStatus);

    res.json({
      success: true,
      data: biomarkersWithStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /biomarkers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/biomarkers/:id
 * Get a specific biomarker
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('biomarkers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Biomarker not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check access
    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'biomarkers', 'read');
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: getBiomarkerStatus(data),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /biomarkers/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/biomarkers
 * Create a new biomarker
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const biomarkerData: CreateBiomarkerRequest = req.body;

    // Calculate price_per_serving if price and servings are provided
    const { data, error } = await supabase
      .from('biomarkers')
      .insert({
        ...biomarkerData,
        user_id: userId,
        ai_extracted: biomarkerData.ai_extracted || false,
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
      data: getBiomarkerStatus(data),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /biomarkers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/biomarkers/bulk
 * Create multiple biomarkers at once (for AI extraction)
 */
router.post('/bulk', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { biomarkers } = req.body;

    if (!Array.isArray(biomarkers) || biomarkers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'biomarkers array is required',
        timestamp: new Date().toISOString()
      });
    }

    const biomarkersToInsert = biomarkers.map((b: CreateBiomarkerRequest) => ({
      ...b,
      user_id: userId,
      ai_extracted: b.ai_extracted || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('biomarkers')
      .insert(biomarkersToInsert)
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
      data: (data || []).map(getBiomarkerStatus),
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /biomarkers/bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/biomarkers/:id
 * Update a biomarker
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('biomarkers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Biomarker not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check write access
    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'biomarkers', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('biomarkers')
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
      data: getBiomarkerStatus(data),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /biomarkers/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/biomarkers/:id
 * Delete a biomarker
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership - only owner can delete
    const { data: existing, error: findError } = await supabase
      .from('biomarkers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Biomarker not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this biomarker',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('biomarkers')
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
      message: 'Biomarker deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /biomarkers/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/biomarkers/history/:name
 * Get historical values for a specific biomarker name
 */
router.get('/history/:name', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name } = req.params;
    const { user_id } = req.query;

    // Get target user ID
    let targetUserId = userId;
    if (user_id && typeof user_id === 'string') {
      const canAccess = await PermissionService.canAccessUserData(userId, user_id, 'biomarkers', 'read');
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString()
        });
      }
      targetUserId = user_id;
    }

    const { data, error } = await supabase
      .from('biomarkers')
      .select('id, value, unit, date_tested, reference_range_low, reference_range_high, optimal_range_low, optimal_range_high')
      .eq('user_id', targetUserId)
      .ilike('name', name)
      .order('date_tested', { ascending: true });

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
      biomarker_name: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /biomarkers/history/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/biomarkers/reference
 * Get biomarker reference data (names, ranges, categories)
 * This provides AI and frontend with standard reference information
 */
router.get('/reference/all', async (req: Request, res: Response): Promise<any> => {
  try {
    const { category } = req.query;

    let references = BIOMARKER_REFERENCE;

    if (category && typeof category === 'string') {
      references = references.filter(r => r.category === category);
    }

    res.json({
      success: true,
      data: {
        biomarkers: references,
        categories: getCategories(),
        count: references.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /biomarkers/reference/all error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/biomarkers/reference/:name
 * Get reference data for a specific biomarker
 */
router.get('/reference/:name', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name } = req.params;
    const normalizedName = name.toLowerCase();

    const reference = BIOMARKER_REFERENCE.find(r =>
      r.name.toLowerCase() === normalizedName ||
      r.aliases.some(a => a.toLowerCase() === normalizedName)
    );

    if (!reference) {
      return res.status(404).json({
        success: false,
        error: 'Biomarker reference not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: reference,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /biomarkers/reference/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
