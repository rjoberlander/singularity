import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { CreateEquipmentRequest } from '../types';
import { logChange } from './changelog';

const router = Router();

// Helper to format equipment info for changelog
function formatEquipmentInfo(e: any): string {
  const parts = [e.name];
  if (e.brand) parts.push(`(${e.brand})`);
  if (e.usage_frequency) parts.push(`- ${e.usage_frequency}`);
  return parts.join(' ');
}

// Normalize string for comparison - lowercase, remove extra spaces, common abbreviations
function normalizeString(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\b(pro|plus|max|elite|ultra|mini|lite|ii|iii|iv|v|2|3|4|5)\b/gi, '') // Remove common suffixes
    .trim();
}

// Calculate similarity ratio between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length / longer.length;
  }

  // Word-based similarity
  const words1 = s1.split(' ').filter(w => w.length > 1);
  const words2 = s2.split(' ').filter(w => w.length > 1);

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter(w => words2.includes(w));
  const totalUniqueWords = new Set([...words1, ...words2]).size;

  return commonWords.length / totalUniqueWords;
}

// Check if two equipment items are potential duplicates
function checkDuplicate(
  newItem: { name: string; brand?: string; model?: string },
  existing: { name: string; brand?: string; model?: string }
): { isDuplicate: boolean; confidence: number; reason: string } {
  const nameSimilarity = calculateSimilarity(newItem.name, existing.name);

  // Exact name match (after normalization)
  if (normalizeString(newItem.name) === normalizeString(existing.name)) {
    return { isDuplicate: true, confidence: 1, reason: 'Exact name match' };
  }

  // High name similarity (>0.8)
  if (nameSimilarity > 0.8) {
    const brandMatch = (!newItem.brand && !existing.brand) ||
      normalizeString(newItem.brand) === normalizeString(existing.brand);

    if (brandMatch) {
      return { isDuplicate: true, confidence: nameSimilarity, reason: 'Similar name with matching brand' };
    }
  }

  // Same brand + similar name (>0.6)
  if (nameSimilarity > 0.6 && newItem.brand && existing.brand) {
    if (normalizeString(newItem.brand) === normalizeString(existing.brand)) {
      return { isDuplicate: true, confidence: nameSimilarity * 0.9, reason: 'Same brand with similar name' };
    }
  }

  return { isDuplicate: false, confidence: 0, reason: '' };
}

// Find potential duplicates for a new item against existing equipment
async function findDuplicates(
  userId: string,
  newItem: { name: string; brand?: string; model?: string },
  excludeId?: string
): Promise<Array<{ id: string; name: string; brand?: string; confidence: number; reason: string }>> {
  let query = supabase
    .from('equipment')
    .select('id, name, brand, model')
    .eq('user_id', userId);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: existingEquipment } = await query;

  if (!existingEquipment) return [];

  const duplicates: Array<{ id: string; name: string; brand?: string; confidence: number; reason: string }> = [];

  for (const existing of existingEquipment) {
    const result = checkDuplicate(newItem, existing);
    if (result.isDuplicate) {
      duplicates.push({
        id: existing.id,
        name: existing.name,
        brand: existing.brand,
        confidence: result.confidence,
        reason: result.reason
      });
    }
  }

  return duplicates.sort((a, b) => b.confidence - a.confidence);
}

// Find all duplicate groups in existing equipment
function findDuplicateGroups(
  equipment: Array<{ id: string; name: string; brand?: string; model?: string }>
): Map<string, Array<{ id: string; name: string; brand?: string; confidence: number }>> {
  const duplicateGroups = new Map<string, Array<{ id: string; name: string; brand?: string; confidence: number }>>();
  const processed = new Set<string>();

  for (let i = 0; i < equipment.length; i++) {
    if (processed.has(equipment[i].id)) continue;

    const group: Array<{ id: string; name: string; brand?: string; confidence: number }> = [
      { id: equipment[i].id, name: equipment[i].name, brand: equipment[i].brand, confidence: 1 }
    ];

    for (let j = i + 1; j < equipment.length; j++) {
      if (processed.has(equipment[j].id)) continue;

      const result = checkDuplicate(equipment[i], equipment[j]);
      if (result.isDuplicate) {
        group.push({
          id: equipment[j].id,
          name: equipment[j].name,
          brand: equipment[j].brand,
          confidence: result.confidence
        });
        processed.add(equipment[j].id);
      }
    }

    if (group.length > 1) {
      duplicateGroups.set(equipment[i].id, group);
      processed.add(equipment[i].id);
    }
  }

  return duplicateGroups;
}

/**
 * GET /api/v1/equipment
 * Get all equipment for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { user_id, category, is_active, limit = 100 } = req.query;

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
      .from('equipment')
      .select('*')
      .eq('user_id', targetUserId)
      .order('name', { ascending: true })
      .limit(Number(limit));

    if (category) {
      query = query.eq('category', category);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
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
    console.error('GET /equipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/equipment/duplicates
 * Find duplicate equipment for the user
 */
router.get('/duplicates', async (req: Request, res: Response): Promise<any> => {
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

    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, name, brand, model')
      .eq('user_id', targetUserId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    const duplicateGroups = findDuplicateGroups(equipment || []);
    const duplicateIds = new Set<string>();
    const groups: Array<{ items: Array<{ id: string; name: string; brand?: string; confidence: number }> }> = [];

    duplicateGroups.forEach((group) => {
      groups.push({ items: group });
      group.forEach(item => duplicateIds.add(item.id));
    });

    res.json({
      success: true,
      data: {
        duplicateIds: Array.from(duplicateIds),
        groups
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /equipment/duplicates error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/equipment/check-duplicate
 * Check if equipment would be a duplicate before creating
 */
router.post('/check-duplicate', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name, brand, model, excludeId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required',
        timestamp: new Date().toISOString()
      });
    }

    const duplicates = await findDuplicates(userId, { name, brand, model }, excludeId);

    res.json({
      success: true,
      data: {
        isDuplicate: duplicates.length > 0,
        duplicates
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /equipment/check-duplicate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/equipment/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
        timestamp: new Date().toISOString()
      });
    }

    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'equipment', 'read');
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
    console.error('GET /equipment/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/equipment
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const equipmentData: CreateEquipmentRequest = req.body;
    const { skipDuplicateCheck } = req.query;

    // Check for duplicates unless explicitly skipped
    if (skipDuplicateCheck !== 'true') {
      const duplicates = await findDuplicates(userId, {
        name: equipmentData.name,
        brand: equipmentData.brand,
        model: equipmentData.model
      });

      if (duplicates.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Potential duplicate equipment found',
          duplicates,
          timestamp: new Date().toISOString()
        });
      }
    }

    const { data, error } = await supabase
      .from('equipment')
      .insert({
        ...equipmentData,
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
      item_type: 'equipment',
      item_id: data.id,
      item_name: data.name,
      new_value: formatEquipmentInfo(data)
    });

    res.status(201).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /equipment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/equipment/bulk
 * Create multiple equipment at once
 */
router.post('/bulk', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { equipment, skipDuplicateCheck } = req.body;

    if (!equipment || !Array.isArray(equipment) || equipment.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'equipment array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check for duplicates unless explicitly skipped
    if (!skipDuplicateCheck) {
      const duplicateResults: Array<{ index: number; name: string; duplicates: any[] }> = [];

      for (let i = 0; i < equipment.length; i++) {
        const duplicates = await findDuplicates(userId, {
          name: equipment[i].name,
          brand: equipment[i].brand,
          model: equipment[i].model
        });

        if (duplicates.length > 0) {
          duplicateResults.push({
            index: i,
            name: equipment[i].name,
            duplicates
          });
        }
      }

      if (duplicateResults.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Potential duplicate equipment found',
          duplicates: duplicateResults,
          timestamp: new Date().toISOString()
        });
      }
    }

    const equipmentToInsert = equipment.map((e: CreateEquipmentRequest) => ({
      ...e,
      user_id: userId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('equipment')
      .insert(equipmentToInsert)
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
    console.error('POST /equipment/bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/equipment/:id
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Fetch full record for changelog
    const { data: existing, error: findError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'equipment', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('equipment')
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
    const changeFields = ['usage_frequency', 'usage_timing', 'usage_duration', 'is_active'];
    const changes: string[] = [];
    for (const field of changeFields) {
      if (updates[field] !== undefined && updates[field] !== existing[field]) {
        changes.push(`${field}: ${existing[field] || 'none'} → ${updates[field] || 'none'}`);
      }
    }

    if (changes.length > 0) {
      await logChange(userId, {
        change_type: 'modified',
        item_type: 'equipment',
        item_id: data.id,
        item_name: data.name,
        previous_value: formatEquipmentInfo(existing),
        new_value: formatEquipmentInfo(data),
        reason: changes.join(', ')
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /equipment/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/equipment/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Fetch full record for changelog
    const { data: existing, error: findError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this equipment',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('equipment')
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
      item_type: 'equipment',
      item_id: id,
      item_name: existing.name,
      previous_value: formatEquipmentInfo(existing),
      reason: 'Deleted'
    });

    res.json({
      success: true,
      message: 'Equipment deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /equipment/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/equipment/:id/toggle
 * Toggle equipment active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get full record for changelog
    const { data: existing, error: findError } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found',
        timestamp: new Date().toISOString()
      });
    }

    const canWrite = await PermissionService.canAccessUserData(userId, existing.user_id, 'equipment', 'write');
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('equipment')
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
      item_type: 'equipment',
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
    console.error('PATCH /equipment/:id/toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
