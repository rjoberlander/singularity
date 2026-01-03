import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { PermissionService } from '../services/permissionService';
import { authenticateUser } from '../middleware/auth';
import {
  JournalEntry,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
  JournalRecipient,
  CreateJournalRecipientRequest,
  JournalPrompt,
  CreateJournalPromptRequest,
  AssignTimeCapsuleRequest,
  UpdateShareSettingsRequest,
  OnThisDayEntry,
  JournalTagCount,
} from '@singularity/shared-types';
import crypto from 'crypto';

const router = Router();

// =============================================
// JOURNAL ENTRIES
// =============================================

/**
 * GET /api/v1/journal
 * Get all journal entries for the authenticated user
 */
router.get('/', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tag, start_date, end_date, mood, entry_mode, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        journal_media(*)
      `)
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('entry_time', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (start_date) {
      query = query.gte('entry_date', start_date);
    }

    if (end_date) {
      query = query.lte('entry_date', end_date);
    }

    if (mood) {
      query = query.eq('mood', mood);
    }

    if (entry_mode) {
      query = query.eq('entry_mode', entry_mode);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Map media to entries
    const entries = (data || []).map((entry: any) => ({
      ...entry,
      media: entry.journal_media || [],
      journal_media: undefined
    }));

    res.json({
      success: true,
      data: entries,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /journal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/journal/on-this-day
 * Get entries from the same date in previous years
 */
router.get('/on-this-day', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { date } = req.query;

    // Parse the date (format: MM-DD) or use today
    let monthDay: string;
    if (date && typeof date === 'string') {
      monthDay = date;
    } else {
      const today = new Date();
      monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    const [month, day] = monthDay.split('-').map(Number);

    // Get all entries from this day in previous years
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_media(*)
      `)
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    const currentYear = new Date().getFullYear();

    // Filter entries that match the month/day
    const onThisDayEntries: OnThisDayEntry[] = (data || [])
      .filter((entry: any) => {
        const entryDate = new Date(entry.entry_date);
        return entryDate.getMonth() + 1 === month &&
               entryDate.getDate() === day &&
               entryDate.getFullYear() < currentYear;
      })
      .map((entry: any) => {
        const entryDate = new Date(entry.entry_date);
        return {
          entry: {
            ...entry,
            media: entry.journal_media || [],
            journal_media: undefined
          },
          years_ago: currentYear - entryDate.getFullYear()
        };
      });

    res.json({
      success: true,
      data: onThisDayEntries,
      date: monthDay,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /journal/on-this-day error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/journal/tags
 * Get all tags with counts
 */
router.get('/tags', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('journal_entries')
      .select('tags')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Count tags
    const tagCounts: Record<string, number> = {};
    (data || []).forEach((entry: any) => {
      (entry.tags || []).forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const tags: JournalTagCount[] = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: tags,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /journal/tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/journal/public/:slug
 * Get a public entry by slug (no auth required)
 */
router.get('/public/:slug', async (req: Request, res: Response): Promise<any> => {
  try {
    const { slug } = req.params;
    const { password } = req.query;

    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_media(*),
        users!inner(name, avatar_url)
      `)
      .eq('public_slug', slug)
      .eq('is_public', true)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found or not public',
        timestamp: new Date().toISOString()
      });
    }

    // Check password if protected
    if (data.share_password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          error: 'Password required',
          requires_password: true,
          timestamp: new Date().toISOString()
        });
      }

      const hashedPassword = crypto.createHash('sha256').update(password as string).digest('hex');
      if (hashedPassword !== data.share_password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Prepare response based on visibility settings
    const entry = {
      ...data,
      media: data.journal_media || [],
      journal_media: undefined,
      author: data.show_author ? {
        name: data.users?.name,
        avatar_url: data.users?.avatar_url
      } : null,
      location_name: data.show_location ? data.location_name : null,
      entry_date: data.show_date ? data.entry_date : null,
      entry_time: data.show_date ? data.entry_time : null,
      users: undefined,
      share_password: undefined // Never expose password
    };

    res.json({
      success: true,
      data: entry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /journal/public/:slug error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/journal/:id
 * Get a specific journal entry
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_media(*),
        journal_capsule_recipients(
          *,
          journal_recipients(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check access
    const canAccess = await PermissionService.canAccessUserData(userId, data.user_id, 'journal_entries', 'read');
    if (!canAccess && data.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const entry = {
      ...data,
      media: data.journal_media || [],
      capsule_recipients: (data.journal_capsule_recipients || []).map((cr: any) => ({
        ...cr,
        recipient: cr.journal_recipients,
        journal_recipients: undefined
      })),
      journal_media: undefined,
      journal_capsule_recipients: undefined
    };

    res.json({
      success: true,
      data: entry,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /journal/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/journal
 * Create a new journal entry
 */
router.post('/', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const entryData: CreateJournalEntryRequest = req.body;

    if (!entryData.content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        timestamp: new Date().toISOString()
      });
    }

    // Generate public slug if making public
    let publicSlug: string | null = null;
    if (entryData.is_public) {
      publicSlug = entryData.public_slug || crypto.randomBytes(8).toString('hex');
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        title: entryData.title,
        content: entryData.content,
        entry_date: entryData.entry_date || new Date().toISOString().split('T')[0],
        entry_time: entryData.entry_time || new Date().toTimeString().split(' ')[0],
        location_name: entryData.location_name,
        location_lat: entryData.location_lat,
        location_lng: entryData.location_lng,
        weather_condition: entryData.weather_condition,
        weather_temp_f: entryData.weather_temp_f,
        weather_icon: entryData.weather_icon,
        mood: entryData.mood,
        mood_custom: entryData.mood_custom,
        tags: entryData.tags || [],
        entry_mode: entryData.entry_mode || 'freeform',
        prompt_used: entryData.prompt_used,
        is_public: entryData.is_public || false,
        public_slug: publicSlug,
        show_author: entryData.show_author ?? true,
        show_location: entryData.show_location ?? true,
        show_date: entryData.show_date ?? true,
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
      data: { ...data, media: [] },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /journal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/journal/:id
 * Update a journal entry
 */
router.put('/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates: UpdateJournalEntryRequest = req.body;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id, public_slug')
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

    // Handle public slug
    let publicSlug = existing.public_slug;
    if (updates.is_public && !publicSlug) {
      publicSlug = updates.public_slug || crypto.randomBytes(8).toString('hex');
    } else if (updates.is_public === false) {
      publicSlug = null;
    }

    // Hash password if provided
    let sharePassword = undefined;
    if (updates.share_password) {
      sharePassword = crypto.createHash('sha256').update(updates.share_password).digest('hex');
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        ...updates,
        public_slug: publicSlug,
        share_password: sharePassword,
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
    console.error('PUT /journal/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/journal/:id
 * Delete a journal entry
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('journal_entries')
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
        error: 'Only the owner can delete this entry',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('journal_entries')
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
    console.error('DELETE /journal/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// MEDIA
// =============================================

/**
 * POST /api/v1/journal/:id/media
 * Add media to an entry
 */
router.post('/:id/media', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { media } = req.body;

    // Check ownership
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get current max sort_order
    const { data: existingMedia } = await supabase
      .from('journal_media')
      .select('sort_order')
      .eq('entry_id', id)
      .order('sort_order', { ascending: false })
      .limit(1);

    let startOrder = (existingMedia?.[0]?.sort_order || 0) + 1;

    // Insert media items
    const mediaItems = (Array.isArray(media) ? media : [media]).map((m: any, index: number) => ({
      entry_id: id,
      user_id: userId,
      media_type: m.media_type,
      file_url: m.file_url,
      thumbnail_url: m.thumbnail_url,
      width: m.width,
      height: m.height,
      duration_seconds: m.duration_seconds,
      file_size_bytes: m.file_size_bytes,
      sort_order: startOrder + index,
      original_filename: m.original_filename,
      mime_type: m.mime_type,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('journal_media')
      .insert(mediaItems)
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
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /journal/:id/media error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/journal/:id/media/:mediaId
 * Delete media from an entry
 */
router.delete('/:id/media/:mediaId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id, mediaId } = req.params;

    // Check ownership
    const { data: media, error: findError } = await supabase
      .from('journal_media')
      .select('user_id')
      .eq('id', mediaId)
      .eq('entry_id', id)
      .single();

    if (findError || !media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        timestamp: new Date().toISOString()
      });
    }

    if (media.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('journal_media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Media deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /journal/:id/media/:mediaId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/journal/:id/media/reorder
 * Reorder media items
 */
router.put('/:id/media/reorder', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { media_ids } = req.body;

    if (!Array.isArray(media_ids)) {
      return res.status(400).json({
        success: false,
        error: 'media_ids array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Update sort orders
    for (let i = 0; i < media_ids.length; i++) {
      await supabase
        .from('journal_media')
        .update({ sort_order: i })
        .eq('id', media_ids[i])
        .eq('entry_id', id);
    }

    res.json({
      success: true,
      message: 'Media reordered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /journal/:id/media/reorder error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// SHARING
// =============================================

/**
 * POST /api/v1/journal/:id/share
 * Update sharing settings
 */
router.post('/:id/share', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const settings: UpdateShareSettingsRequest = req.body;

    // Check ownership
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id, public_slug')
      .eq('id', id)
      .single();

    if (findError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const updates: any = {
      is_public: settings.is_public,
      show_author: settings.show_author ?? true,
      show_location: settings.show_location ?? true,
      show_date: settings.show_date ?? true,
      updated_at: new Date().toISOString()
    };

    // Handle slug
    if (settings.is_public) {
      updates.public_slug = settings.custom_slug || entry.public_slug || crypto.randomBytes(8).toString('hex');
    }

    // Handle password
    if (settings.password) {
      updates.share_password = crypto.createHash('sha256').update(settings.password).digest('hex');
    } else if (settings.password === '') {
      updates.share_password = null;
    }

    const { data, error } = await supabase
      .from('journal_entries')
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
      data: {
        is_public: data.is_public,
        public_slug: data.public_slug,
        share_url: data.is_public ? `${process.env.FRONTEND_URL}/journal/public/${data.public_slug}` : null,
        has_password: !!data.share_password
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /journal/:id/share error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/journal/:id/share
 * Revoke public access
 */
router.delete('/:id/share', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('journal_entries')
      .update({
        is_public: false,
        public_slug: null,
        share_password: null,
        updated_at: new Date().toISOString()
      })
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
      message: 'Public access revoked',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /journal/:id/share error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// TIME CAPSULE
// =============================================

/**
 * POST /api/v1/journal/:id/capsule
 * Assign entry as a time capsule
 */
router.post('/:id/capsule', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { recipient_ids, delivery_date }: AssignTimeCapsuleRequest = req.body;

    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one recipient is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!delivery_date) {
      return res.status(400).json({
        success: false,
        error: 'Delivery date is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Update entry
    await supabase
      .from('journal_entries')
      .update({
        is_time_capsule: true,
        capsule_delivery_date: delivery_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Clear existing recipients
    await supabase
      .from('journal_capsule_recipients')
      .delete()
      .eq('entry_id', id);

    // Add new recipients
    const capsuleRecipients = recipient_ids.map(recipientId => ({
      entry_id: id,
      recipient_id: recipientId,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('journal_capsule_recipients')
      .insert(capsuleRecipients);

    if (insertError) {
      return res.status(400).json({
        success: false,
        error: insertError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Time capsule assigned',
      delivery_date,
      recipient_count: recipient_ids.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /journal/:id/capsule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/journal/:id/capsule
 * Cancel time capsule
 */
router.delete('/:id/capsule', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: new Date().toISOString()
      });
    }

    if (entry.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Clear recipients and capsule settings
    await supabase
      .from('journal_capsule_recipients')
      .delete()
      .eq('entry_id', id);

    await supabase
      .from('journal_entries')
      .update({
        is_time_capsule: false,
        capsule_delivery_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({
      success: true,
      message: 'Time capsule cancelled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /journal/:id/capsule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// RECIPIENTS
// =============================================

/**
 * GET /api/v1/journal/recipients
 * Get all recipients for the user
 */
router.get('/recipients/list', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('journal_recipients')
      .select('*')
      .eq('user_id', userId)
      .order('name');

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
    console.error('GET /journal/recipients error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/journal/recipients
 * Create a new recipient
 */
router.post('/recipients', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const recipientData: CreateJournalRecipientRequest = req.body;

    if (!recipientData.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('journal_recipients')
      .insert({
        user_id: userId,
        name: recipientData.name,
        relationship: recipientData.relationship,
        email: recipientData.email,
        phone: recipientData.phone,
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
    console.error('POST /journal/recipients error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/journal/recipients/:id
 * Update a recipient
 */
router.put('/recipients/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('journal_recipients')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found',
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

    const { data, error } = await supabase
      .from('journal_recipients')
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
    console.error('PUT /journal/recipients/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/journal/recipients/:id
 * Delete a recipient
 */
router.delete('/recipients/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('journal_recipients')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found',
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
      .from('journal_recipients')
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
      message: 'Recipient deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /journal/recipients/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// PROMPTS
// =============================================

/**
 * GET /api/v1/journal/prompts/random
 * Get a random prompt
 */
router.get('/prompts/random', async (req: Request, res: Response): Promise<any> => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('journal_prompts')
      .select('*')
      .eq('is_active', true);

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

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No prompts available',
        timestamp: new Date().toISOString()
      });
    }

    // Pick random prompt
    const randomPrompt = data[Math.floor(Math.random() * data.length)];

    res.json({
      success: true,
      data: randomPrompt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /journal/prompts/random error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/journal/prompts/mine
 * Get user's custom prompts
 */
router.get('/prompts/mine', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('journal_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'user')
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
    console.error('GET /journal/prompts/mine error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/journal/prompts
 * Create a custom prompt
 */
router.post('/prompts', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const promptData: CreateJournalPromptRequest = req.body;

    if (!promptData.prompt_text) {
      return res.status(400).json({
        success: false,
        error: 'Prompt text is required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('journal_prompts')
      .insert({
        user_id: userId,
        prompt_text: promptData.prompt_text,
        category: promptData.category,
        source: 'user',
        is_active: true,
        times_used: 0,
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
    console.error('POST /journal/prompts error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/journal/prompts/:id
 * Delete a custom prompt
 */
router.delete('/prompts/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('journal_prompts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found',
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
      .from('journal_prompts')
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
      message: 'Prompt deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /journal/prompts/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
