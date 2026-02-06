/**
 * RV Locations Module API Routes
 *
 * Standalone RV camping destinations with flat structure (Location > Activities)
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { enrichLocation, suggestActivities } from '../services/rv-enrichment';
import {
  createEnrichmentJob,
  runEnrichmentJob,
  getActiveJob,
  getJobById,
  cancelEnrichmentJob,
  getRecentJobs,
  registerSSEConnection,
  jobToProgress,
} from '../services/rv-batch-enrichment';
import {
  getAllApiUsageSummary,
  getGooglePlacesUsageSummary,
} from '../services/api-usage-tracking';
import type {
  RVLocation,
  CreateRVLocationRequest,
  RVLocationActivity,
  CreateRVLocationActivityRequest,
  RVLocationMedia,
  CreateRVLocationMediaRequest,
  RVResearchSettings,
  RVLocationImportPayload,
  RVLocationImportResult,
  RVImportValidationResult,
  RVLocationConvertToTripRequest,
  RVLocationConvertToTripResult,
  RVEnrichmentOptions,
  RVEnrichmentResult,
  RVActivitySuggestion,
  RVReviewHighlights,
} from '@singularity/shared-types';

// Interface for Google Places API response
interface GooglePlaceResult {
  id?: string;
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName: string;
      uri?: string;
    }>;
  }>;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
}

const router = Router();

// =============================================
// RESEARCH SETTINGS (must be before /:id routes)
// =============================================

/**
 * GET /api/v1/rv-locations/settings
 * Get research settings for the authenticated user
 */
router.get('/settings', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('rv_research_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: data || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/rv-locations/settings
 * Update all research settings
 */
router.put('/settings', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { claude_instructions, family_profile, output_template } = req.body;

    // First get existing settings to preserve fields not being updated
    const { data: existing } = await supabase
      .from('rv_research_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Merge with existing data - only overwrite fields that are explicitly provided
    const mergedData = {
      user_id: userId,
      claude_instructions: claude_instructions !== undefined ? claude_instructions : existing?.claude_instructions,
      family_profile: family_profile !== undefined ? family_profile : existing?.family_profile,
      output_template: output_template !== undefined ? output_template : existing?.output_template,
      updated_at: new Date().toISOString()
    };

    // Upsert settings
    const { data, error } = await supabase
      .from('rv_research_settings')
      .upsert(mergedData, {
        onConflict: 'user_id'
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

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /rv-locations/settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/rv-locations/settings/instructions
 * Update just the Claude instructions
 */
router.patch('/settings/instructions', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { claude_instructions } = req.body;

    // Check if settings exist
    const { data: existing } = await supabase
      .from('rv_research_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let data;
    let error;

    if (existing) {
      const result = await supabase
        .from('rv_research_settings')
        .update({
          claude_instructions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('rv_research_settings')
        .insert({
          user_id: userId,
          claude_instructions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
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
    console.error('PATCH /rv-locations/settings/instructions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// RV LOCATIONS CRUD
// =============================================

/**
 * GET /api/v1/rv-locations
 * Get all RV locations for the authenticated user
 */
router.get('/', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { category, status, state, tags, search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('rv_locations')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (state) {
      query = query.eq('state', state);
    }

    if (tags) {
      // Filter by tags array overlap
      const tagsArray = (tags as string).split(',');
      query = query.overlaps('tags', tagsArray);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch preview photos and activities for each location
    const locationsWithExtras = await Promise.all(
      (data || []).map(async (location) => {
        const [{ data: photos }, { data: activities }] = await Promise.all([
          supabase
            .from('rv_location_media')
            .select('file_url, activity_id')
            .eq('location_id', location.id)
            .order('sort_order'),
          supabase
            .from('rv_location_activities')
            .select('id, name, activity_type, kid_engagement')
            .eq('location_id', location.id)
            .order('sort_order')
        ]);

        // Build preview_photos: one photo per activity first, then campsite photo
        const previewPhotos: string[] = [];
        const activityIds = (activities || []).map((a: any) => a.id);
        const usedActivityIds = new Set<string>();

        // First, get one photo per activity (up to 3 activities)
        for (const activityId of activityIds.slice(0, 3)) {
          const activityPhoto = photos?.find(
            (p: any) => p.activity_id === activityId && !usedActivityIds.has(activityId)
          );
          if (activityPhoto) {
            previewPhotos.push(activityPhoto.file_url);
            usedActivityIds.add(activityId);
          }
        }

        // Then add a campsite/location photo (no activity_id) to fill up to 4
        if (previewPhotos.length < 4) {
          const campsitePhoto = photos?.find((p: any) => !p.activity_id);
          if (campsitePhoto) {
            previewPhotos.push(campsitePhoto.file_url);
          }
        }

        // If still under 4, fill with any remaining photos
        if (previewPhotos.length < 4 && photos) {
          for (const photo of photos) {
            if (previewPhotos.length >= 4) break;
            if (!previewPhotos.includes(photo.file_url)) {
              previewPhotos.push(photo.file_url);
            }
          }
        }

        // Calculate per-child average engagement from activities
        let parkerAvg: number | null = null;
        let charlotteAvg: number | null = null;
        let xanderAvg: number | null = null;

        if (activities && activities.length > 0) {
          const parkerScores = activities
            .filter((a: any) => typeof a.kid_engagement?.parker?.engagement_level === 'number')
            .map((a: any) => a.kid_engagement.parker.engagement_level);
          const charlotteScores = activities
            .filter((a: any) => typeof a.kid_engagement?.charlotte?.engagement_level === 'number')
            .map((a: any) => a.kid_engagement.charlotte.engagement_level);
          const xanderScores = activities
            .filter((a: any) => typeof a.kid_engagement?.xander?.engagement_level === 'number')
            .map((a: any) => a.kid_engagement.xander.engagement_level);

          if (parkerScores.length > 0) {
            parkerAvg = Math.round(parkerScores.reduce((sum: number, s: number) => sum + s, 0) / parkerScores.length * 10) / 10;
          }
          if (charlotteScores.length > 0) {
            charlotteAvg = Math.round(charlotteScores.reduce((sum: number, s: number) => sum + s, 0) / charlotteScores.length * 10) / 10;
          }
          if (xanderScores.length > 0) {
            xanderAvg = Math.round(xanderScores.reduce((sum: number, s: number) => sum + s, 0) / xanderScores.length * 10) / 10;
          }
        }

        return {
          ...location,
          preview_photos: previewPhotos,
          activities: activities || [],
          activity_count: activities?.length || 0,
          parker_engagement: parkerAvg,
          charlotte_engagement: charlotteAvg,
          xander_engagement: xanderAvg
        };
      })
    );

    res.json({
      success: true,
      data: locationsWithExtras,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// BATCH ENRICHMENT WITH SSE (MUST BE BEFORE /:id routes)
// =============================================

/**
 * GET /api/v1/rv-locations/enrich-status
 * Get the status of the active enrichment job (if any)
 */
router.get('/enrich-status', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  console.log('[Enrich Status] Route hit!');
  try {
    const userId = req.user!.id;
    console.log('[Enrich Status] userId:', userId);

    const activeJob = await getActiveJob(userId);
    console.log('[Enrich Status] activeJob result:', activeJob ? `job ${activeJob.id} status=${activeJob.status}` : 'null');

    res.json({
      success: true,
      hasActiveJob: !!activeJob,
      job: activeJob ? jobToProgress(activeJob) : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/enrich-status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/enrich-batch
 * Start a batch enrichment job for multiple locations
 */
router.post('/enrich-batch', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationIds, options = {} } = req.body;

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'locationIds array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check if there's already an active job
    const activeJob = await getActiveJob(userId);
    if (activeJob) {
      return res.status(409).json({
        success: false,
        error: 'An enrichment job is already running',
        job: jobToProgress(activeJob),
        timestamp: new Date().toISOString()
      });
    }

    // Verify ownership of all locations
    const { data: locations, error: locError } = await supabase
      .from('rv_locations')
      .select('id')
      .eq('user_id', userId)
      .in('id', locationIds);

    if (locError || !locations || locations.length !== locationIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more locations not found or not owned by user',
        timestamp: new Date().toISOString()
      });
    }

    // Create the job
    const job = await createEnrichmentJob(userId, locationIds, options);

    // Start the job asynchronously (don't await)
    runEnrichmentJob(job).catch(err => {
      console.error('[Batch Enrichment] Job failed:', err);
    });

    res.json({
      success: true,
      job: jobToProgress(job),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/enrich-batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/enrich-status/:jobId/stream
 * SSE endpoint for live enrichment progress updates
 */
router.get('/enrich-status/:jobId/stream', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;

    const job = await getJobById(jobId, userId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        timestamp: new Date().toISOString()
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const progress = jobToProgress(job);
    res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      res.write(`event: ${job.status}\ndata: ${JSON.stringify(progress)}\n\n`);
      res.end();
      return;
    }

    registerSSEConnection(jobId, res);

    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  } catch (error) {
    console.error('GET /rv-locations/enrich-status/:jobId/stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/enrich-cancel/:jobId
 * Cancel an active enrichment job
 */
router.post('/enrich-cancel/:jobId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;

    const success = await cancelEnrichmentJob(jobId, userId);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Could not cancel job (may not be running or not found)',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/enrich-cancel/:jobId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/enrich-history
 * Get recent enrichment jobs for the user
 */
router.get('/enrich-history', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const jobs = await getRecentJobs(userId, limit);

    res.json({
      success: true,
      jobs: jobs.map(jobToProgress),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/enrich-history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/api-usage
 * Get API usage summary for the current month
 */
router.get('/api-usage', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const monthParam = req.query.month as string;

    let month: Date | undefined;
    if (monthParam) {
      month = new Date(monthParam);
    }

    const usage = await getAllApiUsageSummary(userId, month);

    res.json({
      success: true,
      usage,
      month: month ? month.toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/api-usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/api-usage/google-places
 * Get Google Places API usage with free tier info
 */
router.get('/api-usage/google-places', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const monthParam = req.query.month as string;

    let month: Date | undefined;
    if (monthParam) {
      month = new Date(monthParam);
    }

    const usage = await getGooglePlacesUsageSummary(userId, month);

    res.json({
      success: true,
      usage,
      month: month ? month.toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/api-usage/google-places error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// RV LOCATION BY ID
// =============================================

/**
 * GET /api/v1/rv-locations/:id
 * Get a specific RV location
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/:id/full
 * Get an RV location with all activities and media
 */
router.get('/:id/full', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get location
    const { data: location, error: locationError } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (locationError || !location) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get activities and media in parallel
    const [
      { data: activities },
      { data: media }
    ] = await Promise.all([
      supabase.from('rv_location_activities').select('*').eq('location_id', id).order('sort_order'),
      supabase.from('rv_location_media').select('*').eq('location_id', id).order('sort_order')
    ]);

    res.json({
      success: true,
      data: {
        ...location,
        activities: activities || [],
        media: media || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/:id/full error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations
 * Create a new RV location
 */
router.post('/', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const locationData: CreateRVLocationRequest = req.body;

    if (!locationData.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('rv_locations')
      .insert({
        user_id: userId,
        name: locationData.name,
        description: locationData.description,
        hook: locationData.hook,
        category: locationData.category,
        land_type: locationData.land_type,
        location_name: locationData.location_name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        google_place_id: locationData.google_place_id,
        rv_logistics: locationData.rv_logistics,
        reservation_required: locationData.reservation_required,
        reservation_url: locationData.reservation_url,
        reservation_notes: locationData.reservation_notes,
        cost_per_night: locationData.cost_per_night,
        cost_currency: locationData.cost_currency || 'USD',
        cost_notes: locationData.cost_notes,
        best_season: locationData.best_season,
        drive_time_from_la: locationData.drive_time_from_la,
        drive_distance_miles: locationData.drive_distance_miles,
        vibe: locationData.vibe,
        educational_value: locationData.educational_value,
        kid_engagement: locationData.kid_engagement,
        website: locationData.website,
        phone: locationData.phone,
        cover_image_url: locationData.cover_image_url,
        status: locationData.status || 'researching',
        priority: locationData.priority || 0,
        tags: locationData.tags || [],
        pros: locationData.pros || [],
        cons: locationData.cons || [],
        notes: locationData.notes,
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
    console.error('POST /rv-locations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/rv-locations/:id
 * Update an RV location
 */
router.put('/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
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
      .from('rv_locations')
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
    console.error('PUT /rv-locations/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/rv-locations/:id
 * Delete an RV location
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
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
      .from('rv_locations')
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
      message: 'RV location deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /rv-locations/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// RV LOCATION ACTIVITIES
// =============================================

/**
 * GET /api/v1/rv-locations/:locationId/activities
 * Get all activities for an RV location
 */
router.get('/:locationId/activities', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('rv_location_activities')
      .select('*')
      .eq('location_id', locationId)
      .order('sort_order');

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
    console.error('GET /rv-locations/:locationId/activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/:locationId/activities
 * Create a new activity for an RV location
 */
router.post('/:locationId/activities', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const activityData: CreateRVLocationActivityRequest = req.body;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    if (!activityData.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort_order
    const { data: maxSort } = await supabase
      .from('rv_location_activities')
      .select('sort_order')
      .eq('location_id', locationId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('rv_location_activities')
      .insert({
        location_id: locationId,
        name: activityData.name,
        description: activityData.description,
        activity_type: activityData.activity_type,
        time_of_day: activityData.time_of_day,
        kid_engagement: activityData.kid_engagement,
        duration_minutes: activityData.duration_minutes,
        duration_text: activityData.duration_text,
        address: activityData.address,
        latitude: activityData.latitude,
        longitude: activityData.longitude,
        distance_from_campsite: activityData.distance_from_campsite,
        cost_estimate: activityData.cost_estimate,
        cost_notes: activityData.cost_notes,
        google_place_id: activityData.google_place_id,
        alltrails_url: activityData.alltrails_url,
        difficulty: activityData.difficulty,
        distance_miles: activityData.distance_miles,
        elevation_gain_ft: activityData.elevation_gain_ft,
        tips: activityData.tips,
        notes: activityData.notes,
        sort_order: activityData.sort_order ?? (maxSort?.sort_order ?? 0) + 1,
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
    console.error('POST /rv-locations/:locationId/activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/rv-locations/:locationId/activities/:activityId
 * Update an activity
 */
router.put('/:locationId/activities/:activityId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId, activityId } = req.params;
    const updates = req.body;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('rv_location_activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .eq('location_id', locationId)
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
    console.error('PUT /rv-locations/:locationId/activities/:activityId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/rv-locations/:locationId/activities/:activityId
 * Delete an activity
 */
router.delete('/:locationId/activities/:activityId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId, activityId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('rv_location_activities')
      .delete()
      .eq('id', activityId)
      .eq('location_id', locationId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /rv-locations/:locationId/activities/:activityId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// RV LOCATION MEDIA
// =============================================

/**
 * GET /api/v1/rv-locations/:locationId/media
 * Get all media for an RV location
 */
router.get('/:locationId/media', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('rv_location_media')
      .select('*')
      .eq('location_id', locationId)
      .order('is_favorite', { ascending: false, nullsFirst: false })
      .order('sort_order');

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
    console.error('GET /rv-locations/:locationId/media error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/:locationId/media
 * Create a new media item for an RV location
 */
router.post('/:locationId/media', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const mediaData: CreateRVLocationMediaRequest = req.body;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    if (!mediaData.file_url) {
      return res.status(400).json({
        success: false,
        error: 'file_url is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort_order
    const { data: maxSort } = await supabase
      .from('rv_location_media')
      .select('sort_order')
      .eq('location_id', locationId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('rv_location_media')
      .insert({
        location_id: locationId,
        user_id: userId,
        activity_id: mediaData.activity_id,
        file_url: mediaData.file_url,
        thumbnail_url: mediaData.thumbnail_url,
        media_type: mediaData.media_type || 'image',
        original_filename: mediaData.original_filename,
        mime_type: mediaData.mime_type,
        file_size_bytes: mediaData.file_size_bytes,
        width: mediaData.width,
        height: mediaData.height,
        caption: mediaData.caption,
        google_attribution_name: mediaData.google_attribution_name,
        google_attribution_uri: mediaData.google_attribution_uri,
        is_google_sourced: mediaData.is_google_sourced || false,
        sort_order: mediaData.sort_order ?? (maxSort?.sort_order ?? 0) + 1,
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
    console.error('POST /rv-locations/:locationId/media error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/:locationId/media/bulk
 * Create multiple media items at once
 */
router.post('/:locationId/media/bulk', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const { media }: { media: CreateRVLocationMediaRequest[] } = req.body;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    if (!media || !Array.isArray(media) || media.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'media array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort_order
    const { data: maxSort } = await supabase
      .from('rv_location_media')
      .select('sort_order')
      .eq('location_id', locationId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    let sortOrder = (maxSort?.sort_order ?? 0) + 1;

    const insertData = media.map((m) => ({
      location_id: locationId,
      user_id: userId,
      activity_id: m.activity_id,
      file_url: m.file_url,
      thumbnail_url: m.thumbnail_url,
      media_type: m.media_type || 'image',
      original_filename: m.original_filename,
      mime_type: m.mime_type,
      file_size_bytes: m.file_size_bytes,
      width: m.width,
      height: m.height,
      caption: m.caption,
      google_attribution_name: m.google_attribution_name,
      google_attribution_uri: m.google_attribution_uri,
      is_google_sourced: m.is_google_sourced || false,
      sort_order: m.sort_order ?? sortOrder++,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('rv_location_media')
      .insert(insertData)
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
    console.error('POST /rv-locations/:locationId/media/bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/rv-locations/:locationId/media/:mediaId
 * Delete a media item
 */
router.delete('/:locationId/media/:mediaId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId, mediaId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('rv_location_media')
      .delete()
      .eq('id', mediaId)
      .eq('location_id', locationId);

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
    console.error('DELETE /rv-locations/:locationId/media/:mediaId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/rv-locations/:locationId/media/:mediaId/favorite
 * Toggle favorite status on a media item
 */
router.patch('/:locationId/media/:mediaId/favorite', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId, mediaId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get current favorite status
    const { data: media, error: getError } = await supabase
      .from('rv_location_media')
      .select('is_favorite')
      .eq('id', mediaId)
      .eq('location_id', locationId)
      .single();

    if (getError || !media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        timestamp: new Date().toISOString()
      });
    }

    // Toggle the favorite status
    const newFavoriteStatus = !media.is_favorite;
    const { data: updated, error: updateError } = await supabase
      .from('rv_location_media')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', mediaId)
      .eq('location_id', locationId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PATCH /rv-locations/:locationId/media/:mediaId/favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// GOOGLE PLACES INTEGRATION
// =============================================

/**
 * POST /api/v1/rv-locations/:locationId/fetch-google
 * Fetch Google Places data for an RV location
 */
router.post('/:locationId/fetch-google', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const { place_id, fetch_photos = true } = req.body;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (locError || !location) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const placeId = place_id || location.google_place_id;
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Google Place ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch place details
    const fields = 'id,displayName,rating,userRatingCount,priceLevel,regularOpeningHours,photos,formattedAddress,location,websiteUri,nationalPhoneNumber';
    const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${apiKey}`;

    const placeResponse = await fetch(placeUrl, {
      headers: { 'X-Goog-FieldMask': fields }
    });

    if (!placeResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch Google Place data',
        timestamp: new Date().toISOString()
      });
    }

    const placeData = await placeResponse.json() as GooglePlaceResult;

    // Update location with Google data
    const updateData: Partial<RVLocation> = {
      google_place_id: placeId,
      google_rating: placeData.rating,
      google_review_count: placeData.userRatingCount,
      google_price_level: placeData.priceLevel ? priceLevelToNumber(placeData.priceLevel) : undefined,
      latitude: placeData.location?.latitude,
      longitude: placeData.location?.longitude,
      address: placeData.formattedAddress,
      website: placeData.websiteUri,
      phone: placeData.nationalPhoneNumber,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('rv_locations')
      .update(updateData)
      .eq('id', locationId);

    // Fetch and store photos if requested
    let photosAdded = 0;
    if (fetch_photos && placeData.photos && placeData.photos.length > 0) {
      for (const photo of placeData.photos.slice(0, 30)) {
        const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1200&maxWidthPx=1600&key=${apiKey}`;

        // Check for duplicate
        const { data: existing } = await supabase
          .from('rv_location_media')
          .select('id')
          .eq('location_id', locationId)
          .eq('file_url', photoUrl)
          .single();

        if (!existing) {
          const attribution = photo.authorAttributions?.[0];
          await supabase
            .from('rv_location_media')
            .insert({
              location_id: locationId,
              user_id: userId,
              file_url: photoUrl,
              media_type: 'image',
              width: photo.widthPx,
              height: photo.heightPx,
              google_attribution_name: attribution?.displayName,
              google_attribution_uri: attribution?.uri,
              is_google_sourced: true,
              sort_order: photosAdded,
              created_at: new Date().toISOString()
            });
          photosAdded++;
        }
      }
    }

    res.json({
      success: true,
      google_place_id: placeId,
      data: updateData,
      photos_added: photosAdded,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/:locationId/fetch-google error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/:locationId/activities/:activityId/fetch-google
 * Fetch Google Places data for an activity
 */
router.post('/:locationId/activities/:activityId/fetch-google', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId, activityId } = req.params;
    const { place_id } = req.body;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get activity
    const { data: activity, error: actError } = await supabase
      .from('rv_location_activities')
      .select('*')
      .eq('id', activityId)
      .eq('location_id', locationId)
      .single();

    if (actError || !activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
        timestamp: new Date().toISOString()
      });
    }

    const placeId = place_id || activity.google_place_id;
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Google Place ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch place details
    const fields = 'id,displayName,rating,userRatingCount,formattedAddress,location';
    const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${apiKey}`;

    const placeResponse = await fetch(placeUrl, {
      headers: { 'X-Goog-FieldMask': fields }
    });

    if (!placeResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch Google Place data',
        timestamp: new Date().toISOString()
      });
    }

    const placeData = await placeResponse.json() as GooglePlaceResult;

    // Update activity with Google data
    const updateData: Partial<RVLocationActivity> = {
      google_place_id: placeId,
      google_rating: placeData.rating,
      latitude: placeData.location?.latitude,
      longitude: placeData.location?.longitude,
      address: placeData.formattedAddress,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('rv_location_activities')
      .update(updateData)
      .eq('id', activityId);

    res.json({
      success: true,
      google_place_id: placeId,
      data: updateData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/:locationId/activities/:activityId/fetch-google error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ENRICHMENT
// =============================================

/**
 * POST /api/v1/rv-locations/:locationId/enrich
 * Enrich an RV location with Google data and AI analysis
 */
router.post('/:locationId/enrich', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const options: RVEnrichmentOptions = req.body || {};

    const result = await enrichLocation(locationId, userId, options);

    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/:locationId/enrich error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/:locationId/suggest-activities
 * Get AI-powered activity suggestions for a location
 */
router.post('/:locationId/suggest-activities', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (locError || !location) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get existing activities
    const { data: activities } = await supabase
      .from('rv_location_activities')
      .select('*')
      .eq('location_id', locationId);

    // Get family profile from settings
    const { data: settings } = await supabase
      .from('rv_research_settings')
      .select('family_profile')
      .eq('user_id', userId)
      .single();

    const suggestions = await suggestActivities(
      location as RVLocation,
      (activities || []) as RVLocationActivity[],
      userId,
      settings?.family_profile
    );

    res.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/:locationId/suggest-activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// IMPORT & VALIDATION
// =============================================

// Valid category and activity type values for validation
const VALID_CATEGORIES = ['harvest_hosts', 'national_parks', 'state_parks', 'hot_springs', 'lake_river', 'boondocking', 'couples_getaway', 'other'];
const VALID_ACTIVITY_TYPES = ['hike', 'bike', 'swim', 'fish', 'kayak', 'paddleboard', 'horseback', 'wildlife_viewing', 'stargazing', 'hot_springs', 'beach', 'playground', 'visitor_center', 'ranger_program', 'scenic_drive', 'photography', 'other'];
const VALID_HOOKUPS = ['full', 'electric_only', 'water_electric', 'dry', 'none'];
const VALID_CELL_COVERAGE = ['excellent', 'good', 'spotty', 'none'];

/**
 * Validate import payload and return detailed validation results
 */
function validateImportPayload(payload: RVLocationImportPayload, existingLocationNames: string[]): RVImportValidationResult {
  const result: RVImportValidationResult = {
    valid: true,
    location_count: 0,
    activity_count: 0,
    warnings: [],
    errors: []
  };

  if (!payload.locations || !Array.isArray(payload.locations)) {
    result.valid = false;
    result.errors.push({
      type: 'missing_required',
      message: 'locations array is required'
    });
    return result;
  }

  result.location_count = payload.locations.length;

  for (const loc of payload.locations) {
    // Required field: name
    if (!loc.name || typeof loc.name !== 'string' || !loc.name.trim()) {
      result.valid = false;
      result.errors.push({
        type: 'missing_required',
        message: 'Location name is required',
        location_name: loc.name || '(unnamed)',
        field: 'name'
      });
    }

    // Check for duplicate names
    if (loc.name && existingLocationNames.includes(loc.name.toLowerCase())) {
      result.warnings.push({
        type: 'duplicate_name',
        message: `Location "${loc.name}" already exists and will be created as a duplicate`,
        location_name: loc.name
      });
    }

    // Validate category if provided
    if (loc.category && !VALID_CATEGORIES.includes(loc.category)) {
      result.errors.push({
        type: 'invalid_enum',
        message: `Invalid category "${loc.category}". Valid values: ${VALID_CATEGORIES.join(', ')}`,
        location_name: loc.name,
        field: 'category'
      });
      result.valid = false;
    }

    // Validate rv_logistics if provided
    if (loc.rv_logistics) {
      if (loc.rv_logistics.hookups && !VALID_HOOKUPS.includes(loc.rv_logistics.hookups)) {
        result.errors.push({
          type: 'invalid_enum',
          message: `Invalid hookups value "${loc.rv_logistics.hookups}". Valid values: ${VALID_HOOKUPS.join(', ')}`,
          location_name: loc.name,
          field: 'rv_logistics.hookups'
        });
        result.valid = false;
      }
      if (loc.rv_logistics.cell_coverage && !VALID_CELL_COVERAGE.includes(loc.rv_logistics.cell_coverage)) {
        result.errors.push({
          type: 'invalid_enum',
          message: `Invalid cell_coverage value "${loc.rv_logistics.cell_coverage}". Valid values: ${VALID_CELL_COVERAGE.join(', ')}`,
          location_name: loc.name,
          field: 'rv_logistics.cell_coverage'
        });
        result.valid = false;
      }
    }

    // Check for recommended fields
    if (!loc.hook) {
      result.warnings.push({
        type: 'missing_recommended',
        message: 'Location is missing a hook (compelling reason to visit)',
        location_name: loc.name,
        field: 'hook'
      });
    }

    if (!loc.city && !loc.state) {
      result.warnings.push({
        type: 'missing_recommended',
        message: 'Location is missing city and state',
        location_name: loc.name,
        field: 'city/state'
      });
    }

    // Count and validate activities
    if (loc.activities && Array.isArray(loc.activities)) {
      result.activity_count += loc.activities.length;

      for (const act of loc.activities) {
        if (!act.name || typeof act.name !== 'string' || !act.name.trim()) {
          result.warnings.push({
            type: 'missing_recommended',
            message: 'Activity is missing a name',
            location_name: loc.name,
            field: 'activities[].name'
          });
        }

        if (act.activity_type && !VALID_ACTIVITY_TYPES.includes(act.activity_type)) {
          result.errors.push({
            type: 'invalid_enum',
            message: `Invalid activity_type "${act.activity_type}". Valid values: ${VALID_ACTIVITY_TYPES.join(', ')}`,
            location_name: loc.name,
            field: 'activities[].activity_type'
          });
          result.valid = false;
        }
      }
    }
  }

  return result;
}

/**
 * POST /api/v1/rv-locations/import/validate
 * Validate import payload without importing (dry-run)
 */
router.post('/import/validate', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const payload: RVLocationImportPayload = req.body;

    // Get existing location names to check for duplicates
    const { data: existingLocations } = await supabase
      .from('rv_locations')
      .select('name')
      .eq('user_id', userId);

    const existingNames = (existingLocations || []).map(l => l.name.toLowerCase());

    const validationResult = validateImportPayload(payload, existingNames);

    res.json({
      ...validationResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/import/validate error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/rv-locations/import
 * Bulk import RV locations from JSON
 * Query params:
 * - dryRun: if 'true', validate without importing
 */
router.post('/import', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const payload: RVLocationImportPayload = req.body;
    const isDryRun = req.query.dryRun === 'true';

    if (!payload.locations || !Array.isArray(payload.locations) || payload.locations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'locations array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get existing location names to check for duplicates
    const { data: existingLocations } = await supabase
      .from('rv_locations')
      .select('name')
      .eq('user_id', userId);

    const existingNames = (existingLocations || []).map(l => l.name.toLowerCase());

    // Validate first
    const validationResult = validateImportPayload(payload, existingNames);

    // If dry run, return validation results only
    if (isDryRun) {
      return res.json({
        success: validationResult.valid,
        validation: validationResult,
        timestamp: new Date().toISOString()
      });
    }

    // If validation fails with errors, don't import
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validation: validationResult,
        timestamp: new Date().toISOString()
      });
    }

    const result: RVLocationImportResult = {
      success: true,
      created: { locations: 0, activities: 0 },
      errors: [],
      location_ids: []
    };

    for (const locData of payload.locations) {
      try {
        // Create location
        const { data: location, error: locError } = await supabase
          .from('rv_locations')
          .insert({
            user_id: userId,
            name: locData.name,
            description: locData.description,
            hook: locData.hook,
            category: locData.category,
            land_type: locData.land_type,
            location_name: locData.location_name,
            address: locData.address,
            city: locData.city,
            state: locData.state,
            latitude: locData.latitude,
            longitude: locData.longitude,
            drive_time_from_la: locData.drive_time_from_la,
            drive_distance_miles: locData.drive_distance_miles,
            rv_logistics: locData.rv_logistics,
            best_season: locData.best_season,
            vibe: locData.vibe,
            educational_value: locData.educational_value,
            kid_engagement: locData.kid_engagement,
            cost_per_night: locData.cost_per_night,
            cost_notes: locData.cost_notes,
            reservation_required: locData.reservation_required,
            reservation_url: locData.reservation_url,
            reservation_notes: locData.reservation_notes,
            website: locData.website,
            phone: locData.phone,
            pros: locData.pros || [],
            cons: locData.cons || [],
            tags: locData.tags || [],
            notes: locData.notes,
            status: 'researching',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (locError || !location) {
          result.errors?.push(`Failed to create location "${locData.name}": ${locError?.message}`);
          continue;
        }

        result.created.locations++;
        result.location_ids.push(location.id);

        // Create activities
        if (locData.activities && Array.isArray(locData.activities)) {
          for (let i = 0; i < locData.activities.length; i++) {
            const actData = locData.activities[i];
            const { error: actError } = await supabase
              .from('rv_location_activities')
              .insert({
                location_id: location.id,
                name: actData.name,
                description: actData.description,
                activity_type: actData.activity_type,
                time_of_day: actData.time_of_day,
                kid_engagement: actData.kid_engagement,
                duration_minutes: actData.duration_minutes,
                duration_text: actData.duration_text,
                distance_from_campsite: actData.distance_from_campsite,
                cost_estimate: actData.cost_estimate,
                alltrails_url: actData.alltrails_url,
                difficulty: actData.difficulty,
                distance_miles: actData.distance_miles,
                elevation_gain_ft: actData.elevation_gain_ft,
                tips: actData.tips,
                sort_order: i,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (actError) {
              result.errors?.push(`Failed to create activity "${actData.name}" for location "${locData.name}": ${actError.message}`);
            } else {
              result.created.activities++;
            }
          }
        }
      } catch (err) {
        result.errors?.push(`Error processing location "${locData.name}": ${err}`);
      }
    }

    result.success = result.errors?.length === 0;

    res.status(result.success ? 201 : 207).json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/import error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// CONVERT TO TRIP
// =============================================

/**
 * POST /api/v1/rv-locations/:locationId/convert-to-trip
 * Convert an RV location to a trip in the travel module
 */
router.post('/:locationId/convert-to-trip', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const options: RVLocationConvertToTripRequest = req.body;

    // Get location with activities
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (locError || !location) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get activities
    const { data: activities } = await supabase
      .from('rv_location_activities')
      .select('*')
      .eq('location_id', locationId)
      .order('sort_order');

    // Create trip
    const today = new Date().toISOString().split('T')[0];
    const tripEndDate = options.end_date || today;
    const tripStartDate = options.start_date || today;

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name: location.name,
        description: location.description || location.hook,
        start_date: tripStartDate,
        end_date: tripEndDate,
        origin: 'Los Angeles, CA',
        destination: `${location.city || ''}, ${location.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || location.location_name,
        transportation_type: 'driving',
        traveler_count: options.traveler_count || 5,
        status: 'planning',
        notes: location.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tripError || !trip) {
      return res.status(400).json({
        success: false,
        error: `Failed to create trip: ${tripError?.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Create segment
    const { data: segment, error: segError } = await supabase
      .from('trip_segments')
      .insert({
        trip_id: trip.id,
        name: location.name,
        description: location.hook || location.description,
        start_date: tripStartDate,
        end_date: tripEndDate,
        location_name: location.location_name || location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        city_info: {
          intro: location.hook,
          overview: location.description
        },
        sort_order: 0,
        google_place_id: location.google_place_id,
        google_rating: location.google_rating,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (segError || !segment) {
      // Cleanup: delete the trip
      await supabase.from('trips').delete().eq('id', trip.id);
      return res.status(400).json({
        success: false,
        error: `Failed to create segment: ${segError?.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Create day
    const { data: day, error: dayError } = await supabase
      .from('trip_days')
      .insert({
        trip_id: trip.id,
        segment_id: segment.id,
        date: tripStartDate,
        day_number: 1,
        title: location.name,
        overview: location.hook,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    // Create activities
    let activityCount = 0;
    if (activities && activities.length > 0 && day) {
      for (const act of activities) {
        // Map RV activity type to trip activity type
        const activityType = mapActivityType(act.activity_type);

        const { error: actError } = await supabase
          .from('trip_activities')
          .insert({
            trip_id: trip.id,
            day_id: day.id,
            segment_id: segment.id,
            name: act.name,
            description: act.description,
            activity_type: activityType,
            location_name: act.address,
            latitude: act.latitude,
            longitude: act.longitude,
            cost_estimate: act.cost_estimate,
            alltrails_url: act.alltrails_url,
            alltrails_rating: act.alltrails_rating,
            tips: act.tips,
            notes: act.notes,
            google_place_id: act.google_place_id,
            google_rating: act.google_rating,
            sort_order: activityCount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (!actError) {
          activityCount++;
        }
      }
    }

    // Update RV location with trip reference
    await supabase
      .from('rv_locations')
      .update({
        converted_to_trip_id: trip.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', locationId);

    const result: RVLocationConvertToTripResult = {
      success: true,
      trip_id: trip.id,
      segment_id: segment.id,
      activity_count: activityCount
    };

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/:locationId/convert-to-trip error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// HELPER FUNCTIONS
// =============================================

function priceLevelToNumber(priceLevel: string): number {
  const mapping: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4
  };
  return mapping[priceLevel] ?? 0;
}

function mapActivityType(rvType: string | undefined): string {
  const mapping: Record<string, string> = {
    'hike': 'hike',
    'bike': 'activity',
    'swim': 'beach',
    'fish': 'activity',
    'kayak': 'activity',
    'paddleboard': 'activity',
    'horseback': 'activity',
    'wildlife_viewing': 'activity',
    'stargazing': 'activity',
    'hot_springs': 'activity',
    'beach': 'beach',
    'playground': 'activity',
    'visitor_center': 'museum',
    'ranger_program': 'activity',
    'scenic_drive': 'transport',
    'photography': 'activity',
    'other': 'other'
  };
  return mapping[rvType || 'other'] || 'activity';
}

// =============================================
// PUBLIC SHARING
// =============================================

/**
 * Generate a URL-friendly slug from a location name
 * e.g., "Serrano Campground" -> "serrano-campground"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug, appending a number if necessary
 */
async function generateUniqueSlug(name: string, excludeLocationId?: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    // Check if slug exists
    let query = supabase
      .from('rv_locations')
      .select('id')
      .eq('share_slug', slug);

    if (excludeLocationId) {
      query = query.neq('id', excludeLocationId);
    }

    const { data } = await query.single();

    if (!data) {
      // Slug is available
      return slug;
    }

    // Try next number
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * POST /api/v1/rv-locations/:locationId/share
 * Generate or get share slug for public access
 */
router.post('/:locationId/share', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    // Verify ownership and get location name
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id, name, share_slug')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    // If already has share slug, return it
    if (location.share_slug) {
      return res.json({
        success: true,
        data: { share_slug: location.share_slug },
        timestamp: new Date().toISOString()
      });
    }

    // Generate unique slug from location name
    const shareSlug = await generateUniqueSlug(location.name, locationId);
    const { error: updateError } = await supabase
      .from('rv_locations')
      .update({ share_slug: shareSlug })
      .eq('id', locationId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: { share_slug: shareSlug },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /rv-locations/:locationId/share error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/rv-locations/:locationId/share
 * Remove share slug (disable public access)
 */
router.delete('/:locationId/share', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    // Verify ownership
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('user_id')
      .eq('id', locationId)
      .single();

    if (locError || !location || location.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'RV location not found',
        timestamp: new Date().toISOString()
      });
    }

    const { error: updateError } = await supabase
      .from('rv_locations')
      .update({ share_slug: null })
      .eq('id', locationId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Share link disabled',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /rv-locations/:locationId/share error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/share/all
 * Get all RV locations publicly (no auth required)
 * Returns all locations with share_slug set (opted-in to sharing)
 */
router.get('/share/all', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, category, search } = req.query;

    // Build query - only return locations that have opted into sharing
    let query = supabase
      .from('rv_locations')
      .select(`
        *,
        activities:rv_location_activities(id, name, activity_type)
      `)
      .not('share_slug', 'is', null);

    // Apply filters
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    }

    const { data: locations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching public locations:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Add computed fields
    const locationsWithCounts = (locations || []).map(loc => ({
      ...loc,
      activity_count: loc.activities?.length || 0,
      // Compute preview photos from first 4 media items with share_slug
      preview_photos: [] // Would need another query for media
    }));

    res.json({
      success: true,
      data: locationsWithCounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/share/all error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/rv-locations/share/:slug
 * Get public location by share slug (no auth required)
 */
router.get('/share/:slug', async (req: Request, res: Response): Promise<any> => {
  try {
    const { slug } = req.params;

    // Get location by share slug
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('share_slug', slug)
      .single();

    if (locError || !location) {
      return res.status(404).json({
        success: false,
        error: 'Shared location not found or link has expired',
        timestamp: new Date().toISOString()
      });
    }

    // Get activities
    const { data: activities } = await supabase
      .from('rv_location_activities')
      .select('*')
      .eq('location_id', location.id)
      .order('sort_order');

    // Get media (sorted by favorites first)
    const { data: media } = await supabase
      .from('rv_location_media')
      .select('*')
      .eq('location_id', location.id)
      .order('is_favorite', { ascending: false, nullsFirst: false })
      .order('sort_order');

    res.json({
      success: true,
      data: {
        ...location,
        activities: activities || [],
        media: media || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /rv-locations/share/:slug error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
