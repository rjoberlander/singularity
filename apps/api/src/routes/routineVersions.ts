import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

interface RoutineSnapshotItem {
  id: string;
  source: 'supplement' | 'equipment' | 'schedule_item' | 'routine';
  source_id: string;
  name: string;
  timing: string | null;
  timings?: string[];
  frequency: string;
  frequency_days: string[] | null;
  category?: string;
  intake_quantity?: number;
  intake_form?: string;
  duration?: string;
  item_type?: 'exercise' | 'meal';
  exercise_type?: string;
  meal_type?: string;
}

interface RoutineSnapshot {
  diet: {
    type: string;
    type_other: string | null;
    macros: {
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
    };
  };
  items: RoutineSnapshotItem[];
}

interface RoutineChanges {
  diet_changed: { from: string; to: string } | null;
  macros_changed: Record<string, { from: number | null; to: number | null }> | null;
  started: RoutineSnapshotItem[];
  stopped: RoutineSnapshotItem[];
  modified: Array<{
    item: RoutineSnapshotItem;
    changes: Array<{ field: string; from: any; to: any }>;
  }>;
}

/**
 * Build current routine snapshot from all scheduled items
 */
async function buildCurrentSnapshot(userId: string): Promise<RoutineSnapshot> {
  // Get diet settings
  let { data: diet } = await supabase
    .from('user_diet')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!diet) {
    diet = {
      diet_type: 'untracked',
      diet_type_other: null,
      target_protein_g: null,
      target_carbs_g: null,
      target_fat_g: null
    };
  }

  // Get scheduled supplements (active + has timing)
  const { data: supplements } = await supabase
    .from('supplements')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const scheduledSupplements = (supplements || []).filter(s =>
    s.timings && s.timings.length > 0
  );

  // Get scheduled equipment (active + has usage_timing)
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const scheduledEquipment = (equipment || []).filter(e => e.usage_timing);

  // Get scheduled items (exercises, meals - active + has timing)
  const { data: scheduleItems } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const scheduledItems = (scheduleItems || []).filter(s => s.timing);

  // Get routine items
  const { data: routines } = await supabase
    .from('routines')
    .select('*, items:routine_items(*)')
    .eq('user_id', userId);

  const routineItems = (routines || []).flatMap(r => r.items || []);

  // Build snapshot
  const items: RoutineSnapshotItem[] = [
    ...scheduledSupplements.map(s => ({
      id: `supplement-${s.id}`,
      source: 'supplement' as const,
      source_id: s.id,
      name: s.name,
      timing: s.timings?.[0] || null,
      timings: s.timings,
      frequency: s.frequency || 'daily',
      frequency_days: s.frequency_days,
      category: s.category,
      intake_quantity: s.intake_quantity,
      intake_form: s.intake_form,
    })),
    ...scheduledEquipment.map(e => ({
      id: `equipment-${e.id}`,
      source: 'equipment' as const,
      source_id: e.id,
      name: e.name,
      timing: e.usage_timing,
      frequency: e.usage_frequency || 'daily',
      frequency_days: null,
      duration: e.usage_duration,
    })),
    ...scheduledItems.map(s => ({
      id: `schedule_item-${s.id}`,
      source: 'schedule_item' as const,
      source_id: s.id,
      name: s.name,
      timing: s.timing,
      frequency: s.frequency,
      frequency_days: s.frequency_days,
      item_type: s.item_type,
      exercise_type: s.exercise_type,
      meal_type: s.meal_type,
      duration: s.duration,
    })),
    ...routineItems.map(r => ({
      id: `routine-${r.id}`,
      source: 'routine' as const,
      source_id: r.id,
      name: r.title,
      timing: r.time,
      frequency: 'daily',
      frequency_days: r.days,
      duration: r.duration,
    })),
  ];

  return {
    diet: {
      type: diet.diet_type,
      type_other: diet.diet_type_other,
      macros: {
        protein_g: diet.target_protein_g,
        carbs_g: diet.target_carbs_g,
        fat_g: diet.target_fat_g,
      },
    },
    items,
  };
}

/**
 * Compute changes between two snapshots
 */
function computeChanges(
  previous: RoutineSnapshot | null,
  current: RoutineSnapshot
): RoutineChanges {
  const changes: RoutineChanges = {
    diet_changed: null,
    macros_changed: null,
    started: [],
    stopped: [],
    modified: [],
  };

  // If no previous, everything is "started"
  if (!previous) {
    changes.started = current.items;
    if (current.diet.type !== 'untracked') {
      changes.diet_changed = { from: 'untracked', to: current.diet.type };
    }
    return changes;
  }

  // Diet change
  if (previous.diet.type !== current.diet.type) {
    changes.diet_changed = {
      from: previous.diet.type,
      to: current.diet.type
    };
  }

  // Macros changes
  const macroFields = ['protein_g', 'carbs_g', 'fat_g'] as const;
  for (const field of macroFields) {
    const prevVal = previous.diet.macros[field];
    const currVal = current.diet.macros[field];
    if (prevVal !== currVal) {
      if (!changes.macros_changed) changes.macros_changed = {};
      changes.macros_changed[field] = { from: prevVal, to: currVal };
    }
  }

  // Items
  const prevMap = new Map(previous.items.map(i => [i.id, i]));
  const currMap = new Map(current.items.map(i => [i.id, i]));

  // Started (in current, not in previous)
  for (const [id, item] of currMap) {
    if (!prevMap.has(id)) {
      changes.started.push(item);
    }
  }

  // Stopped (in previous, not in current)
  for (const [id, item] of prevMap) {
    if (!currMap.has(id)) {
      changes.stopped.push(item);
    }
  }

  // Modified (in both, but different)
  for (const [id, currItem] of currMap) {
    const prevItem = prevMap.get(id);
    if (prevItem) {
      const fieldChanges = getFieldChanges(prevItem, currItem);
      if (fieldChanges.length > 0) {
        changes.modified.push({
          item: currItem,
          changes: fieldChanges,
        });
      }
    }
  }

  return changes;
}

function getFieldChanges(prev: any, curr: any): Array<{ field: string; from: any; to: any }> {
  const changes: Array<{ field: string; from: any; to: any }> = [];
  const fieldsToCompare = ['timing', 'timings', 'frequency', 'frequency_days', 'duration'];

  for (const field of fieldsToCompare) {
    const prevVal = JSON.stringify(prev[field]);
    const currVal = JSON.stringify(curr[field]);
    if (prevVal !== currVal) {
      changes.push({ field, from: prev[field], to: curr[field] });
    }
  }

  return changes;
}

/**
 * Check if there are meaningful changes
 */
function hasChanges(changes: RoutineChanges): boolean {
  return (
    changes.diet_changed !== null ||
    changes.macros_changed !== null ||
    changes.started.length > 0 ||
    changes.stopped.length > 0 ||
    changes.modified.length > 0
  );
}

/**
 * GET /api/v1/routine-versions
 * Get routine version history
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('routine_versions')
      .select('*')
      .eq('user_id', userId)
      .order('version_number', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

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
    console.error('GET /routine-versions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/routine-versions/latest
 * Get the most recent routine version
 */
router.get('/latest', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('routine_versions')
      .select('*')
      .eq('user_id', userId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      // No versions yet
      return res.json({
        success: true,
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    if (error) {
      return res.status(500).json({
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
    console.error('GET /routine-versions/latest error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/routine-versions/current-snapshot
 * Get the current routine state (not saved yet)
 */
router.get('/current-snapshot', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const snapshot = await buildCurrentSnapshot(userId);

    res.json({
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /routine-versions/current-snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/routine-versions/:id
 * Get a specific routine version
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('routine_versions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Routine version not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /routine-versions/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/routine-versions
 * Create a new routine version (save current state to changelog)
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { reason } = req.body;

    // Build current snapshot
    const currentSnapshot = await buildCurrentSnapshot(userId);

    // Get latest version for comparison
    const { data: latestVersion } = await supabase
      .from('routine_versions')
      .select('*')
      .eq('user_id', userId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const previousSnapshot = latestVersion?.snapshot as RoutineSnapshot | null;
    const changes = computeChanges(previousSnapshot, currentSnapshot);

    // Check if there are meaningful changes
    if (!hasChanges(changes)) {
      return res.status(400).json({
        success: false,
        error: 'No changes to save',
        timestamp: new Date().toISOString()
      });
    }

    // Get next version number
    const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

    // Create new version
    const { data, error } = await supabase
      .from('routine_versions')
      .insert({
        user_id: userId,
        version_number: nextVersionNumber,
        snapshot: currentSnapshot,
        changes,
        reason,
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
    console.error('POST /routine-versions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
