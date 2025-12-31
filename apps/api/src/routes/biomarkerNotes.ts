import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { BiomarkerNote } from '../types';

const router = Router();

/**
 * GET /api/v1/biomarkers/notes
 * Get all notes for the authenticated user (optionally filtered by biomarker)
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { biomarker_name } = req.query;

    let query = supabase
      .from('biomarker_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (biomarker_name) {
      query = query.eq('biomarker_name', biomarker_name);
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
    console.error('GET /biomarkers/notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/biomarkers/notes/:name
 * Get all notes for a specific biomarker
 */
router.get('/:name', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { name } = req.params;

    const { data, error } = await supabase
      .from('biomarker_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('biomarker_name', name)
      .order('created_at', { ascending: false });

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
    console.error('GET /biomarkers/notes/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/biomarkers/notes
 * Create a new note for a biomarker
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { biomarker_name, content, created_by = 'user', ai_context } = req.body;

    if (!biomarker_name || !content) {
      return res.status(400).json({
        success: false,
        error: 'biomarker_name and content are required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('biomarker_notes')
      .insert({
        user_id: userId,
        biomarker_name,
        content,
        created_by,
        ai_context
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
      message: 'Note created',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /biomarkers/notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/biomarkers/notes/:id
 * Update a note
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required',
        timestamp: new Date().toISOString()
      });
    }

    // First verify the note belongs to this user
    const { data: existing, error: checkError } = await supabase
      .from('biomarker_notes')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('biomarker_notes')
      .update({ content })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

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
      message: 'Note updated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /biomarkers/notes/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/biomarkers/notes/:id
 * Delete a note
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('biomarker_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Note deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /biomarkers/notes/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
