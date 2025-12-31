import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { BiomarkerStar } from '../types';

const router = Router();

/**
 * GET /api/v1/biomarkers/stars
 * Get all starred biomarkers for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('biomarker_stars')
      .select('*')
      .eq('user_id', userId)
      .order('starred_at', { ascending: false });

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
    console.error('GET /biomarkers/stars error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/biomarkers/stars/:name
 * Check if a specific biomarker is starred
 */
router.get('/:name', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name } = req.params;

    const { data, error } = await supabase
      .from('biomarker_stars')
      .select('*')
      .eq('user_id', userId)
      .eq('biomarker_name', name)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        is_starred: !!data,
        star: data || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /biomarkers/stars/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/biomarkers/stars
 * Star a biomarker
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { biomarker_name, starred_by = 'user', ai_reason } = req.body;

    if (!biomarker_name) {
      return res.status(400).json({
        success: false,
        error: 'biomarker_name is required',
        timestamp: new Date().toISOString()
      });
    }

    // Upsert - if already starred, update the starred_at timestamp
    const { data, error } = await supabase
      .from('biomarker_stars')
      .upsert({
        user_id: userId,
        biomarker_name,
        starred_by,
        ai_reason,
        starred_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,biomarker_name'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data,
      message: `Starred ${biomarker_name}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /biomarkers/stars error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/biomarkers/stars/:name
 * Unstar a biomarker
 */
router.delete('/:name', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name } = req.params;

    const { error } = await supabase
      .from('biomarker_stars')
      .delete()
      .eq('user_id', userId)
      .eq('biomarker_name', name);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Unstarred ${name}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /biomarkers/stars/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
