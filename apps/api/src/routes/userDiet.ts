import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/v1/user-diet
 * Get user's diet settings (creates default if not exists)
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    // Try to get existing diet settings
    let { data, error } = await supabase
      .from('user_diet')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If not found, create default
    if (error && error.code === 'PGRST116') {
      const { data: newDiet, error: insertError } = await supabase
        .from('user_diet')
        .insert({
          user_id: userId,
          diet_type: 'untracked',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          error: insertError.message,
          timestamp: new Date().toISOString()
        });
      }

      data = newDiet;
    } else if (error) {
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
    console.error('GET /user-diet error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/user-diet
 * Update user's diet settings
 */
router.patch('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const {
      diet_type,
      diet_type_other,
      target_protein_g,
      target_carbs_g,
      target_fat_g
    } = req.body;

    // Validate diet_type if provided
    const validDietTypes = [
      'untracked', 'standard', 'keto', 'carnivore', 'vegan',
      'vegetarian', 'mediterranean', 'paleo', 'low_fodmap', 'other'
    ];

    if (diet_type && !validDietTypes.includes(diet_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid diet_type. Must be one of: ${validDietTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check if record exists
    const { data: existing, error: findError } = await supabase
      .from('user_diet')
      .select('id')
      .eq('user_id', userId)
      .single();

    let data;
    let error;

    if (findError && findError.code === 'PGRST116') {
      // Create new record
      const result = await supabase
        .from('user_diet')
        .insert({
          user_id: userId,
          diet_type: diet_type || 'untracked',
          diet_type_other,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Update existing record
      const result = await supabase
        .from('user_diet')
        .update({
          diet_type,
          diet_type_other,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

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
    console.error('PATCH /user-diet error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
