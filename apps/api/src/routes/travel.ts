/**
 * Travel Module API Routes
 *
 * For the trip import workflow (settings, import, research items),
 * see travel-import.ts and docs/travel-module-prd.md
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import {
  Trip,
  CreateTripRequest,
  TripFlight,
  CreateTripFlightRequest,
  TripDriving,
  CreateTripDrivingRequest,
  TripSegment,
  CreateTripSegmentRequest,
  TripAccommodation,
  CreateTripAccommodationRequest,
  TripDay,
  CreateTripDayRequest,
  TripActivity,
  CreateTripActivityRequest,
  TripMedia,
  CreateTripMediaRequest,
  TripSharing,
} from '@singularity/shared-types';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { AIAPIKeyService } from '../modules/ai-api-keys/services/aiAPIKeyService';
import { ScheduleValidationService } from '../services/schedule-validation';
import { computeTravelTimesForTrip, formatTravelTimesForPrompt, getDefaultDurationMinutes } from '../services/google-routes-service';
import { RestaurantSuggestionService } from '../services/restaurant-suggestion';
import { enrichRestaurantDetails } from '../services/restaurant-enrichment';
import { enrichFromAirbnb, extractAirbnbListingId } from '../services/airbnb-enrichment';
import { trackPlaceDetails, trackAnthropicUsage } from '../services/api-usage-tracking';
import { enrichActivityDetails } from '../services/activity-detail-enrichment';
import type { ValidationResult, AssembleScheduleResponse } from '@singularity/shared-types';

// Import travel import & settings routes (see docs/travel-module-prd.md for workflow)
import travelImportRoutes from './travel-import';
import travelVideoRoutes from './travel-videos';

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
  addressComponents?: Array<{
    types: string[];
    longText?: string;
    shortText?: string;
  }>;
  // Extended fields
  editorialSummary?: { text: string };
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  reservable?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBrunch?: boolean;
  servesVegetarianFood?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  outdoorSeating?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesCocktails?: boolean;
  liveMusic?: boolean;
  allowsDogs?: boolean;
}

/**
 * Check if a URL points to a specific property/listing (not just a generic domain).
 * Returns the URL if specific, or null if generic/invalid.
 * Examples:
 *   "https://www.airbnb.com/rooms/12345" → specific (has listing path)
 *   "https://www.airbnb.com" → generic (just domain)
 *   "https://www.hyatt.com" → generic
 *   "https://vilagale.com/en/hotels/alentejo/..." → specific
 */
function validateSpecificUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    // Paths like "/trips/v1" on airbnb are not real listings
    if (path.length <= 1) return null; // just "/"
    // Known booking platforms need a listing ID in the path
    const host = u.hostname.replace('www.', '');
    if (['airbnb.com', 'airbnb.co.uk', 'vrbo.com', 'booking.com'].includes(host)) {
      // Airbnb needs /rooms/<id> pattern; /trips/* is not a listing
      if (host.startsWith('airbnb') && !path.match(/\/rooms\/\d+/)) return null;
      if (host === 'vrbo.com' && !path.match(/\/\d+/)) return null;
      if (host === 'booking.com' && !path.match(/\/hotel\//)) return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetch all trip_media rows for a trip, paginating past Supabase's 1000-row cap.
 */
async function fetchAllTripMedia(tripId: string) {
  const allMedia: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('trip_media')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order')
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    allMedia.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return allMedia;
}

/**
 * Add days to a YYYY-MM-DD date string without timezone conversion issues.
 * Works by parsing and manipulating the date components directly in UTC.
 */
function addDaysToDateString(dateStr: string, daysToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at noon UTC to avoid any DST issues
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the number of days between two YYYY-MM-DD date strings.
 * Returns a positive number if end > start, negative if start > end.
 */
function daysBetweenDateStrings(startStr: string, endStr: string): number {
  const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
  const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

const router = Router();

// =============================================
// MAPS PROXY — Google Static Maps
// =============================================
//
// Registered BEFORE travelImportRoutes because that sub-router applies a
// blanket authenticateUser middleware. This endpoint is intentionally public
// so <img src> tags on the browse page can load it without a bearer token.
//
/**
 * GET /api/v1/travel/maps/static
 * Proxies Google Static Maps API so the API key never leaves the server.
 * Public endpoint — returns a PNG that can be used directly in <img src>.
 *
 * Accepted query params (allowlisted):
 *   size    - e.g. "640x320" (required, max 640x640)
 *   scale   - "1" or "2" (optional)
 *   maptype - "roadmap" | "terrain" | "satellite" | "hybrid" (optional)
 *   center  - "lat,lng" (optional)
 *   zoom    - 0..21 (optional)
 *   markers - marker spec, may repeat (e.g. "color:red|label:1|37.7,-122.4")
 *   path    - path spec, may repeat (e.g. "color:0x0000ff80|weight:4|37.7,-122.4|37.8,-122.5")
 */
router.get('/maps/static', async (req: Request, res: Response): Promise<any> => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Maps key not configured' });
    }

    // ── Allowlist and validate params ────────────────────────────────
    const sizeRaw = typeof req.query.size === 'string' ? req.query.size : '';
    const sizeMatch = sizeRaw.match(/^(\d{2,3})x(\d{2,3})$/);
    if (!sizeMatch) {
      return res.status(400).json({ success: false, error: 'Invalid size (expected WxH)' });
    }
    const w = parseInt(sizeMatch[1], 10);
    const h = parseInt(sizeMatch[2], 10);
    if (w < 32 || h < 32 || w > 640 || h > 640) {
      return res.status(400).json({ success: false, error: 'Size out of range (32..640)' });
    }

    const params = new URLSearchParams();
    params.set('size', `${w}x${h}`);

    const scale = typeof req.query.scale === 'string' ? req.query.scale : '';
    if (scale === '1' || scale === '2') params.set('scale', scale);

    const maptype = typeof req.query.maptype === 'string' ? req.query.maptype : '';
    if (['roadmap', 'terrain', 'satellite', 'hybrid'].includes(maptype)) {
      params.set('maptype', maptype);
    }

    const center = typeof req.query.center === 'string' ? req.query.center : '';
    if (center && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(center)) {
      params.set('center', center);
    }

    const zoom = typeof req.query.zoom === 'string' ? req.query.zoom : '';
    if (zoom && /^\d{1,2}$/.test(zoom) && parseInt(zoom, 10) <= 21) {
      params.set('zoom', zoom);
    }

    // markers and path may repeat; express parses repeated params as string[]
    const appendRepeatable = (key: 'markers' | 'path', max: number, maxLen: number) => {
      const raw = req.query[key];
      const values = Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
      let added = 0;
      for (const v of values) {
        if (added >= max) break;
        if (typeof v !== 'string') continue;
        if (v.length === 0 || v.length > maxLen) continue;
        // Disallow anything that could inject a different query param
        if (v.includes('&') || v.includes('?') || v.includes('\n')) continue;
        params.append(key, v);
        added++;
      }
    };
    appendRepeatable('markers', 30, 2000);
    appendRepeatable('path', 5, 4000);

    // Require at least one of: markers, path, or center+zoom
    if (!params.has('markers') && !params.has('path') && !params.has('center')) {
      return res.status(400).json({ success: false, error: 'Need markers, path, or center' });
    }

    params.set('key', apiKey);

    const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
    const upstream = await fetch(url);
    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('Static Maps upstream error', upstream.status, body.slice(0, 500));
      return res.status(502).json({ success: false, error: 'Upstream map error' });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await upstream.arrayBuffer());
    // Cache in browser and shared caches; the URL (minus key) is deterministic.
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    // Override helmet's default CORP=same-origin so the <img> can be embedded
    // cross-origin from the Next.js frontend on a different port/host.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.status(200).send(buf);
  } catch (error) {
    console.error('GET /travel/maps/static error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/travel/public/:slug
 * Public, unauthenticated read of a publicly-shared trip.
 *
 * Registered BEFORE travelImportRoutes because that sub-router applies a
 * blanket authenticateUser middleware via `router.use(authenticateUser)`,
 * which would otherwise reject this request with 401 before it ever reaches
 * the handler defined later in this file. The handler logic itself lives
 * further down (search for the second "/public/:slug" route); this entry
 * is a thin wrapper that re-uses the same Supabase queries.
 */
router.get('/public/:slug', async (req: Request, res: Response): Promise<any> => {
  try {
    const { slug } = req.params;
    const { password } = req.query;

    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('public_slug', slug)
      .eq('is_public', true)
      .single();

    if (error || !trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found or not public',
        timestamp: new Date().toISOString()
      });
    }

    // Optional password gate
    if (trip.share_password_hash) {
      if (!password) {
        return res.status(401).json({
          success: false,
          error: 'Password required',
          requires_password: true,
          timestamp: new Date().toISOString()
        });
      }
      const hashedPassword = crypto.createHash('sha256').update(password as string).digest('hex');
      if (hashedPassword !== trip.share_password_hash) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
          timestamp: new Date().toISOString()
        });
      }
    }

    const [
      { data: flights },
      { data: driving },
      { data: segments },
      { data: accommodations },
      { data: days },
      { data: activities },
      media
    ] = await Promise.all([
      supabase.from('trip_flights').select('*').eq('trip_id', trip.id),
      supabase.from('trip_driving').select('*').eq('trip_id', trip.id),
      supabase.from('trip_segments').select('*').eq('trip_id', trip.id).order('sort_order'),
      supabase.from('trip_accommodations').select('*').eq('trip_id', trip.id).order('check_in_date'),
      supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('date'),
      supabase.from('trip_activities').select('*').eq('trip_id', trip.id).order('sort_order'),
      fetchAllTripMedia(trip.id)
    ]);

    res.json({
      success: true,
      data: {
        ...trip,
        share_password_hash: undefined,
        flights: flights || [],
        driving: driving || [],
        segments: segments || [],
        accommodations: accommodations || [],
        days: days || [],
        activities: activities || [],
        media: media || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/public/:slug (early) error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Mount travel import & settings routes (settings, import, research items)
// See docs/travel-module-prd.md for the full workflow documentation
router.use('/', travelImportRoutes);
router.use('/', travelVideoRoutes);

// =============================================
// TRIPS
// =============================================

/**
 * GET /api/v1/travel/trips
 * Get all trips for the authenticated user
 */
router.get('/trips', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { status, start_date, end_date, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('trips')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('start_date', start_date);
    }

    if (end_date) {
      query = query.lte('end_date', end_date);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch preview photos for each trip (4 approved photos per trip)
    const tripsWithPhotos = await Promise.all(
      (data || []).map(async (trip) => {
        const { data: photos } = await supabase
          .from('trip_media')
          .select('file_url')
          .eq('trip_id', trip.id)
          .or('approved.eq.true,approved.is.null')
          .order('created_at', { ascending: false })
          .limit(4);

        return {
          ...trip,
          preview_photos: photos?.map(p => p.file_url) || []
        };
      })
    );

    res.json({
      success: true,
      data: tripsWithPhotos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/trips error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/travel/trips/:id
 * Get a specific trip
 */
router.get('/trips/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check access
    if (data.user_id !== userId && !data.is_public) {
      // Check if user has sharing access
      const { data: shareAccess } = await supabase
        .from('trip_sharing')
        .select('id')
        .eq('trip_id', id)
        .eq('shared_with_user_id', userId)
        .single();

      if (!shareAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/trips/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/travel/trips/:id/full
 * Get a trip with all related data
 */
router.get('/trips/:id/full', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check access
    if (trip.user_id !== userId && !trip.is_public) {
      const { data: shareAccess } = await supabase
        .from('trip_sharing')
        .select('id')
        .eq('trip_id', id)
        .eq('shared_with_user_id', userId)
        .single();

      if (!shareAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Get all related data in parallel
    const [
      { data: flights },
      { data: driving },
      { data: segments },
      { data: accommodations },
      { data: days },
      { data: activities },
      media,
      { data: sharing }
    ] = await Promise.all([
      supabase.from('trip_flights').select('*').eq('trip_id', id),
      supabase.from('trip_driving').select('*').eq('trip_id', id),
      supabase.from('trip_segments').select('*').eq('trip_id', id).order('sort_order'),
      supabase.from('trip_accommodations').select('*').eq('trip_id', id).order('check_in_date'),
      supabase.from('trip_days').select('*').eq('trip_id', id).order('date'),
      supabase.from('trip_activities').select('*').eq('trip_id', id).order('sort_order'),
      fetchAllTripMedia(id),
      supabase.from('trip_sharing').select('*, users!shared_with_user_id(id, name, email)').eq('trip_id', id)
    ]);

    res.json({
      success: true,
      data: {
        ...trip,
        flights: flights || [],
        driving: driving || [],
        segments: segments || [],
        accommodations: accommodations || [],
        days: days || [],
        activities: activities || [],
        media: media || [],
        sharing: sharing || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/trips/:id/full error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips
 * Create a new trip
 */
router.post('/trips', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const tripData: CreateTripRequest = req.body;

    if (!tripData.name || !tripData.start_date || !tripData.end_date) {
      return res.status(400).json({
        success: false,
        error: 'Name, start_date, and end_date are required',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name: tripData.name,
        description: tripData.description,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        origin: tripData.origin,
        destination: tripData.destination,
        transportation_type: tripData.transportation_type,
        cover_image_url: tripData.cover_image_url,
        traveler_count: tripData.traveler_count || 1,
        budget_estimate: tripData.budget_estimate,
        packing_checklist: tripData.packing_checklist || [],
        status: tripData.status || 'planning',
        notes: tripData.notes,
        // V3 skeleton fields
        destination_country: (tripData as any).destination_country,
        destination_country_code: (tripData as any).destination_country_code,
        overview: (tripData as any).overview,
        route_description: (tripData as any).route_description,
        logistics: (tripData as any).logistics,
        pacing_notes: (tripData as any).pacing_notes,
        total_days: (tripData as any).total_days,
        total_nights: (tripData as any).total_nights,
        budget: (tripData as any).budget,
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
    console.error('POST /travel/trips error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:id
 * Update a trip
 */
router.put('/trips/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
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
      .from('trips')
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
    console.error('PUT /travel/trips/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:id
 * Delete a trip
 */
router.delete('/trips/:id', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this trip',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trips')
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
      message: 'Trip deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:id/duplicate
 * Duplicate a trip
 */
router.post('/trips/:id/duplicate', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get original trip
    const { data: original, error: findError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !original) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check access
    if (original.user_id !== userId && !original.is_public) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Create new trip
    const { data: newTrip, error: createError } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        start_date: original.start_date,
        end_date: original.end_date,
        origin: original.origin,
        destination: original.destination,
        transportation_type: original.transportation_type,
        cover_image_url: original.cover_image_url,
        traveler_count: original.traveler_count,
        budget_estimate: original.budget_estimate,
        packing_checklist: original.packing_checklist,
        status: 'planning',
        notes: original.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      return res.status(400).json({
        success: false,
        error: createError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: newTrip,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:id/duplicate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/travel/trips/:id/status
 * Update trip status
 */
router.patch('/trips/:id/status', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['planning', 'confirmed', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
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
      .from('trips')
      .update({
        status,
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
    console.error('PATCH /travel/trips/:id/status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/travel/trips/:id/planning-progress
 * Update trip planning progress for a specific step
 */
router.patch('/trips/:id/planning-progress', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { step, auto_suggested, completed } = req.body;

    // Validate step
    const validSteps = ['basics', 'segments', 'accommodations', 'activities', 'meals', 'enrichment', 'schedule', 'days_activities'];
    if (!step || !validSteps.includes(step)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step. Must be one of: basics, segments, accommodations, activities, meals, enrichment, schedule',
        timestamp: new Date().toISOString()
      });
    }

    // Check ownership
    const { data: existing, error: findError } = await supabase
      .from('trips')
      .select('user_id, planning_progress')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
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

    // Build the updated planning progress
    const defaultStep = { auto_suggested: false, completed: false };
    const stored = existing.planning_progress || {};
    const currentProgress = {
      basics: stored.basics || defaultStep,
      segments: stored.segments || defaultStep,
      accommodations: stored.accommodations || defaultStep,
      activities: stored.activities || defaultStep,
      meals: stored.meals || defaultStep,
      enrichment: stored.enrichment || defaultStep,
      schedule: stored.schedule || stored.days_activities || defaultStep,
    };

    const stepKey = step === 'days_activities' ? 'schedule' : step;
    const updatedStepProgress: Record<string, unknown> = { ...(currentProgress as Record<string, any>)[stepKey] };

    if (auto_suggested !== undefined) {
      updatedStepProgress.auto_suggested = auto_suggested;
    }

    if (completed !== undefined) {
      updatedStepProgress.completed = completed;
      if (completed) {
        updatedStepProgress.completed_at = new Date().toISOString();
      } else {
        delete updatedStepProgress.completed_at;
      }
    }

    const updatedProgress = {
      ...currentProgress,
      [stepKey]: updatedStepProgress
    };

    const { data, error } = await supabase
      .from('trips')
      .update({
        planning_progress: updatedProgress,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PATCH /travel/trips/:id/planning-progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// FLIGHTS
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/flights
 * Get all flights for a trip
 */
router.get('/trips/:tripId/flights', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from('trip_flights')
      .select('*')
      .eq('trip_id', tripId)
      .order('departure_datetime');

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
    console.error('GET /travel/trips/:tripId/flights error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/flights
 * Create a new flight
 */
router.post('/trips/:tripId/flights', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const flightData: CreateTripFlightRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_flights')
      .insert({
        trip_id: tripId,
        direction: flightData.direction,
        airline: flightData.airline,
        flight_number: flightData.flight_number,
        departure_airport: flightData.departure_airport,
        arrival_airport: flightData.arrival_airport,
        departure_datetime: flightData.departure_datetime,
        arrival_datetime: flightData.arrival_datetime,
        booking_reference: flightData.booking_reference,
        agency_reference: flightData.agency_reference,
        cost: flightData.cost,
        currency: flightData.currency,
        points_used: flightData.points_used,
        seat_assignments: flightData.seat_assignments,
        layovers: flightData.layovers,
        flight_segments: flightData.flight_segments,
        notes: flightData.notes,
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
    console.error('POST /travel/trips/:tripId/flights error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/flights/:flightId
 * Update a flight
 */
router.put('/trips/:tripId/flights/:flightId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, flightId } = req.params;
    const updates = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_flights')
      .update(updates)
      .eq('id', flightId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/flights/:flightId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/flights/:flightId
 * Delete a flight
 */
router.delete('/trips/:tripId/flights/:flightId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, flightId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_flights')
      .delete()
      .eq('id', flightId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Flight deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/flights/:flightId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/flights/extract
 * Extract flight info from an uploaded image or PDF using AI
 */
router.post('/trips/:tripId/flights/extract', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { image, mediaType } = req.body; // base64 image data and media type

    if (!image || !mediaType) {
      return res.status(400).json({
        success: false,
        error: 'Image data and media type are required',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get Anthropic API key
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!keyData) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        timestamp: new Date().toISOString()
      });
    }

    // Call Claude API for extraction
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyData.api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: image.includes(',') ? image.split(',')[1] : image
              }
            },
            {
              type: 'text',
              text: `Extract flight booking information from this image. Return a JSON object with this EXACT structure:
{
  "tripInfo": {
    "travelers": <number>,
    "origin": "<city name>",
    "destination": "<city name>",
    "startDate": "<YYYY-MM-DD>",
    "endDate": "<YYYY-MM-DD>"
  },
  "flights": [
    {
      "direction": "outbound" | "return",
      "airline": "<airline name>",
      "flightNumbers": ["<flight numbers>"],
      "departureAirport": "<3-letter code>",
      "arrivalAirport": "<3-letter code>",
      "departureDatetime": "<ISO 8601 datetime>",
      "arrivalDatetime": "<ISO 8601 datetime>",
      "layovers": [{"airport": "<code>", "duration": "<duration>"}] or null,
      "bookingReference": "<confirmation code>" or null,
      "totalPrice": <number in USD> or null,
      "notes": "<any other relevant info>"
    }
  ]
}

IMPORTANT:
- For dates, use YYYY-MM-DD format
- For datetimes, use ISO 8601 format with timezone (e.g., "2026-06-14T11:55:00-07:00")
- If arrival is "next day", add 1 day to the arrival date
- Extract ALL flight segments (outbound and return)
- Include layover info if visible
- Return ONLY valid JSON, no markdown or explanation`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to process image with AI',
        timestamp: new Date().toISOString()
      });
    }

    const aiResult = await response.json() as { content?: Array<{ text?: string }> };
    const content = aiResult.content?.[0]?.text;

    if (!content) {
      return res.status(500).json({
        success: false,
        error: 'No response from AI',
        timestamp: new Date().toISOString()
      });
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove any markdown code blocks if present
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse flight data from image',
        rawContent: content,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: extractedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/flights/extract error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// DRIVING
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/driving
 * Get all driving records for a trip
 */
router.get('/trips/:tripId/driving', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from('trip_driving')
      .select('*')
      .eq('trip_id', tripId)
      .order('pickup_datetime');

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
    console.error('GET /travel/trips/:tripId/driving error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/driving
 * Create a new driving record
 */
router.post('/trips/:tripId/driving', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const drivingData: CreateTripDrivingRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_driving')
      .insert({
        trip_id: tripId,
        rental_company: drivingData.rental_company,
        vehicle_type: drivingData.vehicle_type,
        pickup_location: drivingData.pickup_location,
        dropoff_location: drivingData.dropoff_location,
        pickup_datetime: drivingData.pickup_datetime,
        dropoff_datetime: drivingData.dropoff_datetime,
        booking_reference: drivingData.booking_reference,
        total_distance_km: drivingData.total_distance_km,
        fuel_estimate: drivingData.fuel_estimate,
        toll_estimate: drivingData.toll_estimate,
        daily_rate: drivingData.daily_rate,
        insurance_included: drivingData.insurance_included,
        notes: drivingData.notes,
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
    console.error('POST /travel/trips/:tripId/driving error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/driving/:drivingId
 * Update a driving record
 */
router.put('/trips/:tripId/driving/:drivingId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, drivingId } = req.params;
    const updates = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_driving')
      .update(updates)
      .eq('id', drivingId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/driving/:drivingId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/driving/:drivingId
 * Delete a driving record
 */
router.delete('/trips/:tripId/driving/:drivingId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, drivingId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_driving')
      .delete()
      .eq('id', drivingId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Driving record deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/driving/:drivingId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// SEGMENTS
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/segments
 * Get all segments for a trip
 */
router.get('/trips/:tripId/segments', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from('trip_segments')
      .select('*')
      .eq('trip_id', tripId)
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
    console.error('GET /travel/trips/:tripId/segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/segments
 * Create a new segment
 */
router.post('/trips/:tripId/segments', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const segmentData: CreateTripSegmentRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort order
    const { data: existing } = await supabase
      .from('trip_segments')
      .select('sort_order')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('trip_segments')
      .insert({
        trip_id: tripId,
        name: segmentData.name,
        description: segmentData.description,
        start_date: segmentData.start_date,
        end_date: segmentData.end_date,
        location_name: segmentData.location_name,
        latitude: segmentData.latitude,
        longitude: segmentData.longitude,
        cover_image_url: segmentData.cover_image_url,
        city_info: segmentData.city_info,
        key_activities_summary: segmentData.key_activities_summary,
        driving_from_previous: segmentData.driving_from_previous,
        driving_notes: segmentData.driving_notes,
        sort_order: sortOrder,
        // V3 skeleton fields
        segment_number: (segmentData as any).segment_number,
        region: (segmentData as any).region,
        nights: (segmentData as any).nights,
        days: (segmentData as any).days,
        theme: (segmentData as any).theme,
        why_here: (segmentData as any).why_here,
        key_experiences: (segmentData as any).key_experiences,
        country: (segmentData as any).country,
        country_code: (segmentData as any).country_code,
        timezone: (segmentData as any).timezone,
        accommodation: (segmentData as any).accommodation,
        driving: (segmentData as any).driving,
        day_trips: (segmentData as any).day_trips,
        priority: (segmentData as any).priority,
        flexibility: (segmentData as any).flexibility,
        weather_considerations: (segmentData as any).weather_considerations,
        booking_urgency: (segmentData as any).booking_urgency,
        notes: (segmentData as any).notes,
        research_status: (segmentData as any).research_status || 'not_started',
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
    console.error('POST /travel/trips/:tripId/segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/segments/:segmentId
 * Update a segment
 */
router.put('/trips/:tripId/segments/:segmentId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, segmentId } = req.params;
    const updates = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_segments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', segmentId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/segments/:segmentId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/segments/:segmentId
 * Delete a segment
 */
router.delete('/trips/:tripId/segments/:segmentId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, segmentId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_segments')
      .delete()
      .eq('id', segmentId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Segment deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/segments/:segmentId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/segments/reorder
 * Reorder segments
 */
router.put('/trips/:tripId/segments/reorder', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { segment_ids } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Update sort orders
    for (let i = 0; i < segment_ids.length; i++) {
      await supabase
        .from('trip_segments')
        .update({ sort_order: i })
        .eq('id', segment_ids[i])
        .eq('trip_id', tripId);
    }

    res.json({
      success: true,
      message: 'Segments reordered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /travel/trips/:tripId/segments/reorder error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/segments/:segmentId/fetch-google
 * Fetch Google Places data for a segment (city/region)
 */
router.post('/trips/:tripId/segments/:segmentId/fetch-google', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, segmentId } = req.params;
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Google Places API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get the segment
    const { data: segment, error: segmentError } = await supabase
      .from('trip_segments')
      .select('*')
      .eq('id', segmentId)
      .eq('trip_id', tripId)
      .single();

    if (segmentError || !segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found',
        timestamp: new Date().toISOString()
      });
    }

    // Search for the city/location using Google Places API (New)
    const searchQuery = segment.location_name || segment.name;
    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.photos,places.formattedAddress,places.location,places.types,places.addressComponents'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Google Places search error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to search Google Places',
        timestamp: new Date().toISOString()
      });
    }

    const searchData = await searchResponse.json() as { places?: GooglePlaceResult[] };
    const place = searchData.places?.[0];

    if (!place) {
      return res.status(404).json({
        success: false,
        error: 'No Google Places result found for this location',
        timestamp: new Date().toISOString()
      });
    }

    // Extract country and region from address components
    let country = '';
    let countryCode = '';
    let region = '';
    if (place.addressComponents) {
      for (const component of place.addressComponents) {
        if (component.types?.includes('country')) {
          country = component.longText || '';
          countryCode = component.shortText || '';
        }
        if (component.types?.includes('administrative_area_level_1')) {
          region = component.longText || '';
        }
      }
    }

    // Update segment with Google data
    const updateData: Partial<TripSegment> = {
      google_place_id: place.id,
      google_rating: place.rating,
      country,
      country_code: countryCode,
      region,
      photos_fetched: true
    };

    // Add lat/lng if not already set
    if (!segment.latitude && place.location) {
      updateData.latitude = place.location.latitude;
      updateData.longitude = place.location.longitude;
    }

    const { error: updateError } = await supabase
      .from('trip_segments')
      .update(updateData)
      .eq('id', segmentId);

    if (updateError) {
      console.error('Segment update error:', updateError);
    }

    // Fetch and store photos - keep processing until we have 20 unique ones
    let photosAdded = 0;
    let photosSkipped = 0;
    const targetPhotoCount = 20;
    const allPhotos = place.photos || [];

    // Get existing photo references AND content hashes to avoid duplicates
    // Check at TRIP level, not just segment level, to prevent same photo appearing for different segments
    const { data: existingPhotos } = await supabase
      .from('trip_media')
      .select('google_photo_reference, content_hash, file_url')
      .eq('trip_id', tripId);

    const existingRefs = new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) || []);
    const existingHashes = new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) || []);
    const existingUrls = new Set(existingPhotos?.map(p => p.file_url).filter(Boolean) || []);

    // Process photos until we have enough unique ones (or run out of photos)
    for (const photo of allPhotos) {
      // Stop once we have enough unique photos
      if (photosAdded >= targetPhotoCount) {
        break;
      }

      try {
        // Skip if we already have this photo reference
        if (existingRefs.has(photo.name)) {
          photosSkipped++;
          continue;
        }

        // Fetch photo from Google
        const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=1600`;
        const photoResponse = await fetch(photoUrl);

        if (!photoResponse.ok) continue;

        const photoBuffer = await photoResponse.arrayBuffer();
        const photoBytes = new Uint8Array(photoBuffer);

        // Compute content hash to detect identical images with different reference IDs
        const contentHash = crypto.createHash('sha256').update(photoBytes).digest('hex');

        // Skip if we already have this exact image content
        if (existingHashes.has(contentHash)) {
          photosSkipped++;
          continue;
        }

        // Upload to Supabase Storage
        const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
        const storagePath = `travel/${tripId}/segments/${segmentId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('singularity-uploads')
          .upload(storagePath, photoBytes, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('singularity-uploads')
          .getPublicUrl(storagePath);

        // Skip if this exact URL already exists in the trip
        if (existingUrls.has(urlData.publicUrl)) {
          photosSkipped++;
          continue;
        }

        // Create TripMedia record with google_photo_reference and content_hash for dedup
        // Auto-approve Google photos so they display immediately
        // Store segment name in caption for display
        // Use upsert with onConflict to handle race conditions gracefully
        const attribution = photo.authorAttributions?.[0];
        const { error: insertError } = await supabase
          .from('trip_media')
          .upsert({
            trip_id: tripId,
            user_id: userId,
            parent_type: 'segment',
            parent_id: segmentId,
            file_url: urlData.publicUrl,
            media_type: 'image',
            width: photo.widthPx,
            height: photo.heightPx,
            caption: segment.name, // Store segment name for display
            is_google_sourced: true,
            approved: true,  // Auto-approve Google photos
            google_attribution_name: attribution?.displayName,
            google_attribution_uri: attribution?.uri,
            google_photo_reference: photo.name,
            content_hash: contentHash
          }, {
            onConflict: 'trip_id,content_hash',
            ignoreDuplicates: true
          });

        if (insertError) {
          // Duplicate constraint violation is expected, just skip
          if (insertError.code === '23505') {
            photosSkipped++;
            continue;
          }
          console.error('Photo insert error:', insertError);
          continue;
        }

        // Add to existing sets to prevent duplicates within same batch
        existingRefs.add(photo.name);
        existingHashes.add(contentHash);
        existingUrls.add(urlData.publicUrl);
        photosAdded++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (photoError) {
        console.error('Photo processing error:', photoError);
      }
    }

    const photoMessage = photosSkipped > 0
      ? `${photosAdded} photos added, ${photosSkipped} duplicates skipped.`
      : `${photosAdded} photos added.`;

    res.json({
      success: true,
      data: {
        google_place_id: place.id,
        data: updateData,
        photos_added: photosAdded,
        photos_skipped: photosSkipped,
        message: `Fetched data from Google Places. ${photoMessage}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/segments/:segmentId/fetch-google error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ACCOMMODATIONS
// =============================================

/**
 * POST /api/v1/travel/trips/:tripId/lookup-hotel
 * Look up hotel details using LLM given a hotel name or URL
 */
router.post('/trips/:tripId/lookup-hotel', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { query, segmentName, startDate, endDate } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Hotel name or URL is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get Anthropic API key
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!keyData) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        timestamp: new Date().toISOString()
      });
    }

    const segmentContext = segmentName
      ? `The hotel is for the "${segmentName}" segment of a trip${startDate ? ` from ${startDate}` : ''}${endDate ? ` to ${endDate}` : ''}.`
      : '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyData.api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Identify this accommodation/property and return structured details. The input may be a hotel name, a booking URL, a hotel website URL, an Airbnb link, a VRBO link, or any vacation rental URL.

Input: ${query.trim()}

${segmentContext}

Return a JSON object with this EXACT structure:
{
  "name": "<official property/hotel name>",
  "address": "<full street address including city and country>",
  "latitude": <number or null>,
  "longitude": <number or null>,
  "website": "<property website URL or null>",
  "phone": "<phone number or null>",
  "room_type": "<room/unit type, e.g. 'Deluxe King', 'Entire apartment', 'Private room', 'Entire villa'>",
  "amenities": ["<amenity1>", "<amenity2>", ...],
  "check_in_time": "<HH:MM format, e.g. 15:00>",
  "check_out_time": "<HH:MM format, e.g. 11:00>",
  "notes": "<brief description of the property, 1-2 sentences>",
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- Use "high" confidence if you are certain about the property identity
- Use "medium" if the name is ambiguous or you're making reasonable assumptions
- Use "low" if you're guessing or the input is unclear
- For Airbnb/VRBO listings, use the listing name as "name" and set room_type to "Entire apartment", "Private room", "Entire villa", etc.
- For coordinates, provide accurate lat/lng if you know the property location
- For amenities, list the most notable ones (pool, spa, gym, restaurant, bar, parking, wifi, kitchen, washer/dryer, etc.)
- Return ONLY valid JSON, no markdown or explanation`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error (hotel lookup):', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to look up hotel with AI',
        timestamp: new Date().toISOString()
      });
    }

    const aiResult = await response.json() as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const content = aiResult.content?.[0]?.text;

    if (!content) {
      return res.status(500).json({
        success: false,
        error: 'No response from AI',
        timestamp: new Date().toISOString()
      });
    }

    // Parse the JSON response
    let hotelData;
    try {
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      hotelData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse hotel lookup AI response:', content);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse hotel data from AI',
        timestamp: new Date().toISOString()
      });
    }

    // Strip generic/non-specific URLs (e.g. "https://www.airbnb.com" with no listing path)
    if (hotelData?.website) {
      hotelData.website = validateSpecificUrl(hotelData.website);
    }

    // Ground-truth the hotel location via Google Places Text Search.
    // LLMs hallucinate coordinates and addresses, so we always overwrite
    // those fields with authoritative Google data when available.
    const placesKey = process.env.GOOGLE_PLACES_API_KEY;
    if (placesKey && hotelData?.name) {
      try {
        const textQuery = `${hotelData.name} ${hotelData.address || ''}`.trim();
        const placesResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': placesKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.internationalPhoneNumber,places.rating,places.userRatingCount',
          },
          body: JSON.stringify({ textQuery, maxResultCount: 1 }),
        });
        if (placesResp.ok) {
          const placesData = (await placesResp.json()) as { places?: GooglePlaceResult[] };
          const place = placesData.places?.[0];
          if (place?.location) {
            hotelData.latitude = place.location.latitude;
            hotelData.longitude = place.location.longitude;
            if (place.formattedAddress) hotelData.address = place.formattedAddress;
            if (place.id) hotelData.google_place_id = place.id;
            if (place.displayName?.text) hotelData.name = place.displayName.text;
            if (!hotelData.website && place.websiteUri) {
              hotelData.website = validateSpecificUrl(place.websiteUri);
            }
            if ((place as any).internationalPhoneNumber && !hotelData.phone) {
              hotelData.phone = (place as any).internationalPhoneNumber;
            }
            if (place.rating) hotelData.google_rating = place.rating;
            hotelData.grounded_by_google = true;
          } else {
            hotelData.grounded_by_google = false;
          }
        } else {
          console.error('Google Places lookup failed in /lookup-hotel:', placesResp.status);
          hotelData.grounded_by_google = false;
        }
      } catch (gErr) {
        console.error('Google Places grounding error in /lookup-hotel:', gErr);
        hotelData.grounded_by_google = false;
      }
    }

    res.json({
      success: true,
      data: hotelData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/lookup-hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/travel/trips/:tripId/accommodations
 * Get all accommodations for a trip
 */
router.get('/trips/:tripId/accommodations', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;
    const { segment_id } = req.query;

    let query = supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date');

    if (segment_id) {
      query = query.eq('segment_id', segment_id);
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
    console.error('GET /travel/trips/:tripId/accommodations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/accommodations
 * Create a new accommodation
 */
router.post('/trips/:tripId/accommodations', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const accommodationData: CreateTripAccommodationRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate nights from dates
    let nights = 0;
    if (accommodationData.check_in_date && accommodationData.check_out_date) {
      const checkIn = new Date(accommodationData.check_in_date);
      const checkOut = new Date(accommodationData.check_out_date);
      nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    const { data, error } = await supabase
      .from('trip_accommodations')
      .insert({
        trip_id: tripId,
        segment_id: accommodationData.segment_id,
        name: accommodationData.name,
        address: accommodationData.address,
        latitude: accommodationData.latitude,
        longitude: accommodationData.longitude,
        check_in_date: accommodationData.check_in_date,
        check_out_date: accommodationData.check_out_date,
        check_in_time: accommodationData.check_in_time || '15:00',
        check_out_time: accommodationData.check_out_time || '11:00',
        nights,
        room_type: accommodationData.room_type,
        cost: accommodationData.cost,
        currency: accommodationData.currency || 'USD',
        points_used: accommodationData.points_used,
        loyalty_program: accommodationData.loyalty_program,
        booking_reference: accommodationData.booking_reference,
        amenities: accommodationData.amenities,
        website: validateSpecificUrl(accommodationData.website) ?? undefined,
        phone: accommodationData.phone,
        notes: accommodationData.notes,
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
    console.error('POST /travel/trips/:tripId/accommodations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/accommodations/:accommodationId
 * Update an accommodation
 */
router.put('/trips/:tripId/accommodations/:accommodationId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, accommodationId } = req.params;
    const updates = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_accommodations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', accommodationId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/accommodations/:accommodationId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/accommodations/:accommodationId
 * Delete an accommodation
 */
router.delete('/trips/:tripId/accommodations/:accommodationId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, accommodationId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_accommodations')
      .delete()
      .eq('id', accommodationId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Accommodation deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/accommodations/:accommodationId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/accommodations/:accommodationId/fetch-google
 * Fetch Google Places data and photos for an accommodation
 */
router.post('/trips/:tripId/accommodations/:accommodationId/fetch-google', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, accommodationId } = req.params;
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Google Places API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get the accommodation
    const { data: accommodation, error: accommodationError } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('id', accommodationId)
      .eq('trip_id', tripId)
      .single();

    if (accommodationError || !accommodation) {
      return res.status(404).json({
        success: false,
        error: 'Accommodation not found',
        timestamp: new Date().toISOString()
      });
    }

    // Search for the hotel/accommodation using Google Places API (New)
    const searchQuery = `${accommodation.name} ${accommodation.address || ''} hotel`;
    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.photos,places.formattedAddress,places.location,places.types,places.websiteUri,places.editorialSummary,places.internationalPhoneNumber,places.goodForChildren,places.businessStatus'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Google Places search error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to search Google Places',
        timestamp: new Date().toISOString()
      });
    }

    const searchData = await searchResponse.json() as { places?: GooglePlaceResult[] };
    const place = searchData.places?.[0];

    if (!place) {
      return res.status(404).json({
        success: false,
        error: 'No Google Places result found for this accommodation',
        timestamp: new Date().toISOString()
      });
    }

    // Update accommodation with Google data
    const updateData: Partial<TripAccommodation> = {
      google_place_id: place.id,
      google_rating: place.rating,
      photos_fetched: true
    };

    // Google Places is ground truth for location data — always overwrite.
    // Accommodations are frequently seeded via the LLM-based /lookup-hotel
    // endpoint, which can hallucinate coordinates and addresses. Once we've
    // matched the row to a real Google place, its lat/lng/formatted address
    // are authoritative and must win.
    if (place.formattedAddress) {
      updateData.address = place.formattedAddress;
    }
    if (place.location) {
      updateData.latitude = place.location.latitude;
      updateData.longitude = place.location.longitude;
    }

    // Website is additive — only set if the user didn't specify one.
    // Only accept specific property URLs, not generic domains.
    if (!accommodation.website && place.websiteUri) {
      const validUrl = validateSpecificUrl(place.websiteUri);
      if (validUrl) updateData.website = validUrl;
    }

    // Extended Google data
    if (place.userRatingCount) updateData.google_review_count = place.userRatingCount;
    if ((place as any).editorialSummary?.text) updateData.google_editorial_summary = (place as any).editorialSummary.text;
    if ((place as any).internationalPhoneNumber && !accommodation.phone) {
      updateData.phone = (place as any).internationalPhoneNumber;
    }
    updateData.enriched_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('trip_accommodations')
      .update(updateData)
      .eq('id', accommodationId);

    if (updateError) {
      console.error('Accommodation update error:', updateError);
    }

    // Fetch and store photos
    let photosAdded = 0;
    let photosSkipped = 0;
    const targetPhotoCount = 10;
    const allPhotos = place.photos || [];

    // Get existing photo references AND content hashes to avoid duplicates at trip level
    const { data: existingPhotos } = await supabase
      .from('trip_media')
      .select('google_photo_reference, content_hash, file_url')
      .eq('trip_id', tripId);

    const existingRefs = new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) || []);
    const existingHashes = new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) || []);
    const existingUrls = new Set(existingPhotos?.map(p => p.file_url).filter(Boolean) || []);

    for (const photo of allPhotos) {
      if (photosAdded >= targetPhotoCount) {
        break;
      }

      try {
        if (existingRefs.has(photo.name)) {
          photosSkipped++;
          continue;
        }

        const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=1600`;
        const photoResponse = await fetch(photoUrl);

        if (!photoResponse.ok) continue;

        const photoBuffer = await photoResponse.arrayBuffer();
        const photoBytes = new Uint8Array(photoBuffer);

        const contentHash = crypto.createHash('sha256').update(photoBytes).digest('hex');

        if (existingHashes.has(contentHash)) {
          photosSkipped++;
          continue;
        }

        const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
        const storagePath = `travel/${tripId}/accommodations/${accommodationId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('singularity-uploads')
          .upload(storagePath, photoBytes, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('singularity-uploads')
          .getPublicUrl(storagePath);

        if (existingUrls.has(urlData.publicUrl)) {
          photosSkipped++;
          continue;
        }

        const attribution = photo.authorAttributions?.[0];
        const { error: insertError } = await supabase
          .from('trip_media')
          .insert({
            trip_id: tripId,
            user_id: userId,
            parent_type: 'accommodation',
            parent_id: accommodationId,
            file_url: urlData.publicUrl,
            media_type: 'image',
            width: photo.widthPx,
            height: photo.heightPx,
            caption: accommodation.name,
            is_google_sourced: true,
            approved: true,
            google_attribution_name: attribution?.displayName,
            google_attribution_uri: attribution?.uri,
            google_photo_reference: photo.name,
            content_hash: contentHash
          });

        if (insertError) {
          if (insertError.code === '23505') {
            photosSkipped++;
            continue;
          }
          console.error('Photo insert error:', insertError);
          continue;
        }

        existingRefs.add(photo.name);
        existingHashes.add(contentHash);
        existingUrls.add(urlData.publicUrl);
        photosAdded++;

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (photoError) {
        console.error('Photo processing error:', photoError);
      }
    }

    const photoMessage = photosSkipped > 0
      ? `${photosAdded} photos added, ${photosSkipped} duplicates skipped.`
      : `${photosAdded} photos added.`;

    res.json({
      success: true,
      data: {
        google_place_id: place.id,
        data: updateData,
        photos_added: photosAdded,
        photos_skipped: photosSkipped,
        message: `Fetched data from Google Places. ${photoMessage}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/accommodations/:accommodationId/fetch-google error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// DAYS
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/days
 * Get all days for a trip
 */
router.get('/trips/:tripId/days', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;
    const { segment_id } = req.query;

    let query = supabase
      .from('trip_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('date');

    if (segment_id) {
      query = query.eq('segment_id', segment_id);
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
    console.error('GET /travel/trips/:tripId/days error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/travel/trips/:tripId/days/:dayId
 * Get a specific day
 */
router.get('/trips/:tripId/days/:dayId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId, dayId } = req.params;

    const { data, error } = await supabase
      .from('trip_days')
      .select(`
        *,
        trip_activities(*)
      `)
      .eq('id', dayId)
      .eq('trip_id', tripId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Day not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        ...data,
        activities: data.trip_activities || [],
        trip_activities: undefined
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/trips/:tripId/days/:dayId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/days
 * Create a new day
 */
router.post('/trips/:tripId/days', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const dayData: CreateTripDayRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort order
    const { data: existing } = await supabase
      .from('trip_days')
      .select('sort_order')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('trip_days')
      .insert({
        trip_id: tripId,
        segment_id: dayData.segment_id,
        date: dayData.date,
        day_number: dayData.day_number,
        title: dayData.title,
        overview: dayData.overview,
        weather_high_c: dayData.weather_high_c,
        weather_low_c: dayData.weather_low_c,
        weather_conditions: dayData.weather_conditions,
        photo_opportunities: dayData.photo_opportunities,
        notes: dayData.notes,
        sort_order: sortOrder,
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
    console.error('POST /travel/trips/:tripId/days error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/days/:dayId
 * Update a day
 */
router.put('/trips/:tripId/days/:dayId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, dayId } = req.params;
    const updates = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_days')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', dayId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/days/:dayId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/days/:dayId
 * Delete a day
 */
router.delete('/trips/:tripId/days/:dayId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, dayId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_days')
      .delete()
      .eq('id', dayId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Day deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/days/:dayId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/days/reorder
 * Reorder days
 */
router.put('/trips/:tripId/days/reorder', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { day_ids } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Update sort orders
    for (let i = 0; i < day_ids.length; i++) {
      await supabase
        .from('trip_days')
        .update({ sort_order: i })
        .eq('id', day_ids[i])
        .eq('trip_id', tripId);
    }

    res.json({
      success: true,
      message: 'Days reordered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /travel/trips/:tripId/days/reorder error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/days/generate
 * Generate days from trip dates
 */
router.post('/trips/:tripId/days/generate', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // Get trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Generate days
    const days = [];
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    let dayNumber = 1;

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      days.push({
        trip_id: tripId,
        date: date.toISOString().split('T')[0],
        day_number: dayNumber++,
        title: `Day ${dayNumber - 1}`,
        sort_order: dayNumber - 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Clear existing days
    await supabase.from('trip_days').delete().eq('trip_id', tripId);

    // Insert new days
    const { data, error } = await supabase
      .from('trip_days')
      .insert(days)
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
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/days/generate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/segments/:segmentId/sync-days
 * Sync days to match segment dates - shifts existing days and activities to correct dates
 */
router.post('/segments/:segmentId/sync-days', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { segmentId } = req.params;

    // Get segment with its trip
    const { data: segment, error: segmentError } = await supabase
      .from('trip_segments')
      .select('*, trip:trips!trip_id(*)')
      .eq('id', segmentId)
      .single();

    if (segmentError || !segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found',
        timestamp: new Date().toISOString()
      });
    }

    if ((segment.trip as any)?.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    if (!segment.start_date || !segment.end_date) {
      return res.status(400).json({
        success: false,
        error: 'Segment has no dates set',
        timestamp: new Date().toISOString()
      });
    }

    // Get existing days for this segment
    const { data: existingDays, error: daysError } = await supabase
      .from('trip_days')
      .select('*')
      .eq('segment_id', segmentId)
      .order('date');

    if (daysError) {
      return res.status(500).json({
        success: false,
        error: daysError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Use safer date arithmetic that doesn't rely on JavaScript Date timezone handling
    const segmentStartDate = segment.start_date; // Already in YYYY-MM-DD format
    const segmentEndDate = segment.end_date;

    // Calculate number of days in segment using safe date arithmetic
    const segmentDayCount = daysBetweenDateStrings(segmentStartDate, segmentEndDate) + 1;

    let updatedCount = 0;
    let createdCount = 0;

    if (existingDays && existingDays.length > 0) {
      // Calculate the date offset (how many days we need to shift)
      const firstDayDateStr = existingDays[0].date;
      const offsetDays = daysBetweenDateStrings(firstDayDateStr, segmentStartDate);

      if (offsetDays !== 0) {
        // Update each day with the new date
        for (const day of existingDays) {
          const newDateStr = addDaysToDateString(day.date, offsetDays);

          const { error: updateError } = await supabase
            .from('trip_days')
            .update({
              date: newDateStr,
              updated_at: new Date().toISOString()
            })
            .eq('id', day.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      } else {
        // No offset needed, days are already aligned
        updatedCount = existingDays.length;
      }

      // If segment has more days than existing days, create additional days
      if (segmentDayCount > existingDays.length) {
        const lastExistingDayNumber = existingDays[existingDays.length - 1].day_number || existingDays.length;

        for (let i = existingDays.length; i < segmentDayCount; i++) {
          const dateStr = addDaysToDateString(segmentStartDate, i);

          const { error: createError } = await supabase
            .from('trip_days')
            .insert({
              trip_id: segment.trip_id,
              segment_id: segmentId,
              date: dateStr,
              day_number: lastExistingDayNumber + (i - existingDays.length) + 1,
              title: `Day ${i + 1}`,
              sort_order: i,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (!createError) {
            createdCount++;
          }
        }
      }
    } else {
      // No existing days - create them from scratch
      for (let i = 0; i < segmentDayCount; i++) {
        const dateStr = addDaysToDateString(segmentStartDate, i);

        const { error: createError } = await supabase
          .from('trip_days')
          .insert({
            trip_id: segment.trip_id,
            segment_id: segmentId,
            date: dateStr,
            day_number: i + 1,
            title: `Day ${i + 1}`,
            sort_order: i,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (!createError) {
          createdCount++;
        }
      }
    }

    return res.json({
      success: true,
      data: {
        segment_id: segmentId,
        segment_dates: { start: segment.start_date, end: segment.end_date },
        days_updated: updatedCount,
        days_created: createdCount,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/segments/:segmentId/sync-days error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ACTIVITIES
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/activities
 * Get all activities for a trip
 */
router.get('/trips/:tripId/activities', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;
    const { day_id, is_backup } = req.query;

    let query = supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order');

    if (day_id) {
      query = query.eq('day_id', day_id);
    }

    if (is_backup !== undefined) {
      query = query.eq('is_backup', is_backup === 'true');
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
    console.error('GET /travel/trips/:tripId/activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/travel/trips/:tripId/activities/:activityId
 * Get a specific activity
 */
router.get('/trips/:tripId/activities/:activityId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId, activityId } = req.params;

    const { data, error } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('id', activityId)
      .eq('trip_id', tripId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/trips/:tripId/activities/:activityId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/activities
 * Create a new activity
 */
router.post('/trips/:tripId/activities', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const activityData: CreateTripActivityRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort order for this day
    const { data: existing } = await supabase
      .from('trip_activities')
      .select('sort_order')
      .eq('day_id', activityData.day_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('trip_activities')
      .insert({
        trip_id: tripId,
        day_id: activityData.day_id,
        name: activityData.name,
        description: activityData.description,
        activity_type: activityData.activity_type,
        activity_sub_type: activityData.activity_sub_type || null,
        time_block: activityData.time_block,
        start_time: activityData.start_time,
        end_time: activityData.end_time,
        location_name: activityData.location_name,
        address: activityData.address,
        latitude: activityData.latitude,
        longitude: activityData.longitude,
        google_maps_url: activityData.google_maps_url,
        why_its_great: activityData.why_its_great,
        kid_friendliness: activityData.kid_friendliness,
        gear_prep: activityData.gear_prep,
        cost_estimate: activityData.cost_estimate,
        cost_currency: activityData.cost_currency || 'USD',
        website: activityData.website,
        phone: activityData.phone,
        reservation_required: activityData.reservation_required || false,
        reservation_details: activityData.reservation_details,
        is_backup: activityData.is_backup || false,
        alltrails_url: activityData.alltrails_url,
        alltrails_rating: activityData.alltrails_rating,
        alltrails_review_summary: activityData.alltrails_review_summary,
        activity_details: activityData.activity_details,
        tips: activityData.tips,
        notes: activityData.notes,
        sort_order: sortOrder,
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
    console.error('POST /travel/trips/:tripId/activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/activities/:activityId
 * Update an activity
 */
router.put('/trips/:tripId/activities/:activityId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;
    const updates = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/activities/:activityId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/activities/:activityId
 * Delete an activity
 */
router.delete('/trips/:tripId/activities/:activityId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_activities')
      .delete()
      .eq('id', activityId)
      .eq('trip_id', tripId);

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
    console.error('DELETE /travel/trips/:tripId/activities/:activityId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/activities/reorder
 * Reorder activities
 */
router.put('/trips/:tripId/activities/reorder', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { day_id, activity_ids } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Update sort orders
    for (let i = 0; i < activity_ids.length; i++) {
      await supabase
        .from('trip_activities')
        .update({ sort_order: i })
        .eq('id', activity_ids[i])
        .eq('trip_id', tripId);
    }

    res.json({
      success: true,
      message: 'Activities reordered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /travel/trips/:tripId/activities/reorder error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/travel/trips/:tripId/activities/:activityId/move
 * Move activity to a different day
 */
router.patch('/trips/:tripId/activities/:activityId/move', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;
    const { day_id } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort order for target day
    const { data: existing } = await supabase
      .from('trip_activities')
      .select('sort_order')
      .eq('day_id', day_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('trip_activities')
      .update({
        day_id,
        sort_order: sortOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .eq('trip_id', tripId)
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
    console.error('PATCH /travel/trips/:tripId/activities/:activityId/move error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/travel/trips/:tripId/activities/:activityId/toggle-backup
 * Toggle activity backup status
 */
router.patch('/trips/:tripId/activities/:activityId/toggle-backup', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get current status
    const { data: activity, error: activityError } = await supabase
      .from('trip_activities')
      .select('is_backup')
      .eq('id', activityId)
      .eq('trip_id', tripId)
      .single();

    if (activityError || !activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_activities')
      .update({
        is_backup: !activity.is_backup,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .eq('trip_id', tripId)
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
    console.error('PATCH /travel/trips/:tripId/activities/:activityId/toggle-backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/activities/:activityId/fetch-google
 * Fetch Google Places data for an activity
 */
router.post('/trips/:tripId/activities/:activityId/fetch-google', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Google Places API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get the activity
    const { data: activity, error: activityError } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('id', activityId)
      .eq('trip_id', tripId)
      .single();

    if (activityError || !activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found',
        timestamp: new Date().toISOString()
      });
    }

    // Skip enrichment for activity types that are not real points-of-interest.
    // "Kids to bed", "Wake up", "REST/NAP", "Pool time", packing, etc. should not
    // inherit Google Places metadata from the hotel they happen to be at.
    const NON_ENRICHABLE_TYPES = new Set(['logistics', 'downtime', 'transport']);
    const SKIP_NAME_PATTERNS = /\b(wake up|wake-up|kids to bed|bed time|bedtime|nap|rest\/nap|pool time|pack|packing|load car|check.?in|check.?out|free time|downtime|drive|depart|arrive|transfer)\b/i;
    if (
      NON_ENRICHABLE_TYPES.has(activity.activity_type) ||
      SKIP_NAME_PATTERNS.test(activity.name || '')
    ) {
      return res.status(400).json({
        success: false,
        error: `Cannot fetch Google Places data for ${activity.activity_type || 'this'} activity type: "${activity.name}". Only real points-of-interest (restaurants, attractions, sightseeing) support Google enrichment.`,
        timestamp: new Date().toISOString()
      });
    }

    // Build search query using activity name and location
    const searchQuery = activity.location_name
      ? `${activity.name} ${activity.location_name}`
      : activity.name;

    // Search for the place using Google Places API (New)
    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.rating',
          'places.userRatingCount',
          'places.priceLevel',
          'places.regularOpeningHours',
          'places.photos',
          'places.formattedAddress',
          'places.location',
          'places.websiteUri',
          'places.nationalPhoneNumber',
          'places.editorialSummary',
          'places.accessibilityOptions',
          'places.goodForChildren',
          'places.goodForGroups',
          'places.reservable',
          'places.servesBreakfast',
          'places.servesLunch',
          'places.servesDinner',
          'places.servesBrunch',
          'places.servesVegetarianFood',
          'places.dineIn',
          'places.takeout',
          'places.delivery',
          'places.outdoorSeating',
          'places.servesBeer',
          'places.servesWine',
          'places.servesCocktails',
          'places.liveMusic',
          'places.allowsDogs'
        ].join(',')
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Google Places search error:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to search Google Places',
        timestamp: new Date().toISOString()
      });
    }

    const searchData = await searchResponse.json() as { places?: GooglePlaceResult[] };
    const place = searchData.places?.[0];

    if (!place) {
      return res.status(404).json({
        success: false,
        error: 'No Google Places result found for this activity',
        timestamp: new Date().toISOString()
      });
    }

    // Convert price level to number (1-4)
    const priceLevelMap: Record<string, number> = {
      'PRICE_LEVEL_FREE': 1,
      'PRICE_LEVEL_INEXPENSIVE': 1,
      'PRICE_LEVEL_MODERATE': 2,
      'PRICE_LEVEL_EXPENSIVE': 3,
      'PRICE_LEVEL_VERY_EXPENSIVE': 4
    };

    // Convert opening hours to our format
    let openingHours: TripActivity['opening_hours'] = undefined;
    if (place.regularOpeningHours) {
      openingHours = {
        open_now: place.regularOpeningHours.openNow,
        periods: place.regularOpeningHours.periods?.map((p: { open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } }) => ({
          open: { day: p.open?.day, time: `${String(p.open?.hour || 0).padStart(2, '0')}:${String(p.open?.minute || 0).padStart(2, '0')}` },
          close: { day: p.close?.day, time: `${String(p.close?.hour || 0).padStart(2, '0')}:${String(p.close?.minute || 0).padStart(2, '0')}` }
        })),
        weekday_text: place.regularOpeningHours.weekdayDescriptions
      };
    }

    // Update activity with Google data
    const isRestaurantActivity = activity.activity_type === 'restaurant';
    const updateData: Record<string, unknown> = {
      google_place_id: place.id,
      google_rating: place.rating,
      google_review_count: place.userRatingCount,
      google_price_level: place.priceLevel ? priceLevelMap[place.priceLevel] : undefined,
      opening_hours: openingHours,
      photos_fetched: true,
      // Extended Google Places fields — available for all activity types
      google_editorial_summary: place.editorialSummary?.text,
      wheelchair_accessible: place.accessibilityOptions?.wheelchairAccessibleEntrance ?? place.accessibilityOptions?.wheelchairAccessibleSeating,
      good_for_children: place.goodForChildren,
      good_for_groups: place.goodForGroups,
      allows_dogs: place.allowsDogs
    };
    // Restaurant-only fields: only write these when the activity is actually a restaurant.
    // Otherwise a museum/attraction/etc. would inherit the nearest place's reservation &
    // menu attributes (and a hotel's in-room "activity" would inherit the hotel
    // restaurant's wine/cocktail/outdoor-seating chips).
    if (isRestaurantActivity) {
      updateData.reservable = place.reservable;
      updateData.serves_breakfast = place.servesBreakfast;
      updateData.serves_lunch = place.servesLunch;
      updateData.serves_dinner = place.servesDinner;
      updateData.serves_brunch = place.servesBrunch;
      updateData.serves_vegetarian = place.servesVegetarianFood;
      updateData.dine_in = place.dineIn;
      updateData.takeout = place.takeout;
      updateData.delivery = place.delivery;
      updateData.outdoor_seating = place.outdoorSeating;
      updateData.serves_beer = place.servesBeer;
      updateData.serves_wine = place.servesWine;
      updateData.serves_cocktails = place.servesCocktails;
      updateData.live_music = place.liveMusic;
    }

    // Add optional fields if not already set
    if (!activity.address && place.formattedAddress) {
      updateData.address = place.formattedAddress;
    }
    if (!activity.latitude && place.location) {
      updateData.latitude = place.location.latitude;
      updateData.longitude = place.location.longitude;
    }
    if (!activity.website && place.websiteUri) {
      updateData.website = place.websiteUri;
    }
    if (!activity.phone && place.nationalPhoneNumber) {
      updateData.phone = place.nationalPhoneNumber;
    }

    const { error: updateError } = await supabase
      .from('trip_activities')
      .update(updateData)
      .eq('id', activityId);

    if (updateError) {
      console.error('Activity update error:', updateError);
      return res.status(500).json({
        success: false,
        error: `Failed to update activity: ${updateError.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch and store photos.
    // Dedup enforced by DB unique constraints:
    //   (trip_id, google_photo_reference) — same ref can't exist twice
    //   (trip_id, content_hash) — same image bytes can't exist twice
    // Every insert computes content_hash, so both constraints are always active.
    let photosAdded = 0;
    let photosSkipped = 0;
    const targetPhotoCount = 20;
    const allPhotos = place.photos || [];
    console.log(`[Google Photos] Activity: Place has ${allPhotos.length} photos available, targeting ${targetPhotoCount} unique`);

    // Get day info for caption
    let dayCaption = '';
    if (activity.day_id) {
      // Get the day and all trip days to calculate day number
      const { data: tripDays } = await supabase
        .from('trip_days')
        .select('id, date')
        .eq('trip_id', tripId)
        .order('date', { ascending: true });

      if (tripDays && tripDays.length > 0) {
        // Get unique dates and calculate day number
        const uniqueDates = [...new Set(tripDays.map(d => d.date))].sort();
        const activityDay = tripDays.find(d => d.id === activity.day_id);
        if (activityDay) {
          const dayIndex = uniqueDates.indexOf(activityDay.date);
          if (dayIndex !== -1) {
            const dayNumber = dayIndex + 1;
            const date = new Date(activityDay.date);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            dayCaption = `Day ${dayNumber} · ${dateStr} | `;
          }
        }
      }
    }

    // Get existing photo references AND content hashes to avoid duplicates
    // Check at TRIP level, not just activity level, to prevent same photo appearing for different activities
    const { data: existingPhotos } = await supabase
      .from('trip_media')
      .select('google_photo_reference, content_hash, file_url')
      .eq('trip_id', tripId);

    const existingRefs = new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) || []);
    const existingHashes = new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) || []);
    const existingUrls = new Set(existingPhotos?.map(p => p.file_url).filter(Boolean) || []);

    // Process photos until we have enough unique ones (or run out of photos)
    for (const photo of allPhotos) {
      // Stop once we have enough unique photos
      if (photosAdded >= targetPhotoCount) {
        break;
      }

      try {
        // Skip if we already have this photo reference
        if (existingRefs.has(photo.name)) {
          photosSkipped++;
          continue;
        }

        // Fetch photo from Google
        const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=1600`;
        const photoResponse = await fetch(photoUrl);

        if (!photoResponse.ok) continue;

        const photoBuffer = await photoResponse.arrayBuffer();
        const photoBytes = new Uint8Array(photoBuffer);

        // Compute content hash to detect identical images with different reference IDs
        const contentHash = crypto.createHash('sha256').update(photoBytes).digest('hex');

        // Skip if we already have this exact image content
        if (existingHashes.has(contentHash)) {
          photosSkipped++;
          continue;
        }

        // Upload to Supabase Storage
        const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
        const storagePath = `travel/${tripId}/activities/${activityId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('singularity-uploads')
          .upload(storagePath, photoBytes, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('singularity-uploads')
          .getPublicUrl(storagePath);

        // Skip if this exact URL already exists in the trip
        if (existingUrls.has(urlData.publicUrl)) {
          photosSkipped++;
          continue;
        }

        // Create TripMedia record with google_photo_reference and content_hash for dedup
        // Auto-approve Google photos so they display immediately
        // Store activity name in caption for display purposes
        // Use upsert with onConflict to handle race conditions gracefully
        const attribution = photo.authorAttributions?.[0];
        const { error: insertError } = await supabase
          .from('trip_media')
          .upsert({
            trip_id: tripId,
            user_id: userId,
            parent_type: 'activity',
            parent_id: activityId,
            file_url: urlData.publicUrl,
            media_type: 'image',
            width: photo.widthPx,
            height: photo.heightPx,
            caption: `${dayCaption}${activity.name}`, // Store day info + activity name for display
            is_google_sourced: true,
            approved: true,  // Auto-approve Google photos
            google_attribution_name: attribution?.displayName,
            google_attribution_uri: attribution?.uri,
            google_photo_reference: photo.name,
            content_hash: contentHash
          }, {
            onConflict: 'trip_id,content_hash',
            ignoreDuplicates: true
          });

        if (insertError) {
          // Duplicate constraint violation is expected, just skip
          if (insertError.code === '23505') {
            photosSkipped++;
            continue;
          }
          console.error('Photo insert error:', insertError);
          continue;
        }

        // Add to existing sets to prevent duplicates within same batch
        existingRefs.add(photo.name);
        existingHashes.add(contentHash);
        existingUrls.add(urlData.publicUrl);
        photosAdded++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (photoError) {
        console.error('Photo processing error:', photoError);
      }
    }

    const photoMessage = photosSkipped > 0
      ? `${photosAdded} photos added, ${photosSkipped} duplicates skipped.`
      : `${photosAdded} photos added.`;

    res.json({
      success: true,
      data: {
        google_place_id: place.id,
        data: updateData,
        photos_added: photosAdded,
        photos_skipped: photosSkipped,
        message: `Fetched data from Google Places. ${photoMessage}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/activities/:activityId/fetch-google error:', error);
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
 * GET /api/v1/travel/trips/:tripId/media
 * Get all media for a trip
 */
router.get('/trips/:tripId/media', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;
    const { parent_type, parent_id } = req.query;

    let query = supabase
      .from('trip_media')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order');

    if (parent_type) {
      query = query.eq('parent_type', parent_type);
    }

    if (parent_id) {
      query = query.eq('parent_id', parent_id);
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
    console.error('GET /travel/trips/:tripId/media error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/media
 * Create a new media item
 */
router.post('/trips/:tripId/media', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const mediaData: CreateTripMediaRequest = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get max sort order
    const { data: existing } = await supabase
      .from('trip_media')
      .select('sort_order')
      .eq('trip_id', tripId)
      .eq('parent_type', mediaData.parent_type)
      .eq('parent_id', mediaData.parent_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('trip_media')
      .insert({
        trip_id: tripId,
        user_id: userId,
        parent_type: mediaData.parent_type,
        parent_id: mediaData.parent_id,
        file_url: mediaData.file_url,
        thumbnail_url: mediaData.thumbnail_url,
        media_type: mediaData.media_type,
        original_filename: mediaData.original_filename,
        mime_type: mediaData.mime_type,
        file_size_bytes: mediaData.file_size_bytes,
        width: mediaData.width,
        height: mediaData.height,
        caption: mediaData.caption,
        sort_order: sortOrder,
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
    console.error('POST /travel/trips/:tripId/media error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/media/bulk
 * Create multiple media items
 */
router.post('/trips/:tripId/media/bulk', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { media } = req.body;

    if (!Array.isArray(media) || media.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'media array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const mediaItems = media.map((m: CreateTripMediaRequest, index: number) => ({
      trip_id: tripId,
      user_id: userId,
      parent_type: m.parent_type,
      parent_id: m.parent_id,
      file_url: m.file_url,
      thumbnail_url: m.thumbnail_url,
      media_type: m.media_type,
      original_filename: m.original_filename,
      mime_type: m.mime_type,
      file_size_bytes: m.file_size_bytes,
      width: m.width,
      height: m.height,
      caption: m.caption,
      sort_order: index,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('trip_media')
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
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/media/bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/media/:mediaId
 * Update a media item
 */
router.put('/trips/:tripId/media/:mediaId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, mediaId } = req.params;
    const updates = req.body;

    // Check ownership
    const { data: media, error: mediaError } = await supabase
      .from('trip_media')
      .select('user_id')
      .eq('id', mediaId)
      .eq('trip_id', tripId)
      .single();

    if (mediaError || !media || media.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_media')
      .update(updates)
      .eq('id', mediaId)
      .eq('trip_id', tripId)
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
    console.error('PUT /travel/trips/:tripId/media/:mediaId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/media/:mediaId
 * Delete a media item
 */
router.delete('/trips/:tripId/media/:mediaId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, mediaId } = req.params;

    // Check ownership
    const { data: media, error: mediaError } = await supabase
      .from('trip_media')
      .select('user_id')
      .eq('id', mediaId)
      .eq('trip_id', tripId)
      .single();

    if (mediaError || !media || media.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_media')
      .delete()
      .eq('id', mediaId)
      .eq('trip_id', tripId);

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
    console.error('DELETE /travel/trips/:tripId/media/:mediaId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/media/deduplicate
 * Remove duplicate media by content hash
 * Computes hash for photos missing it, then removes duplicates keeping the oldest
 */
router.post('/trips/:tripId/media/deduplicate', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Get all media for this trip
    const { data: allMedia, error: mediaError } = await supabase
      .from('trip_media')
      .select('id, file_url, content_hash, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (mediaError) {
      return res.status(400).json({
        success: false,
        error: mediaError.message,
        timestamp: new Date().toISOString()
      });
    }

    if (!allMedia || allMedia.length === 0) {
      return res.json({
        success: true,
        message: 'No media to deduplicate',
        stats: { total: 0, duplicates_removed: 0 },
        timestamp: new Date().toISOString()
      });
    }

    // Compute content hash for any media missing it
    const mediaWithHashes: Array<{ id: string; hash: string }> = [];
    let hashesComputed = 0;

    for (const media of allMedia) {
      let hash = media.content_hash;

      if (!hash && media.file_url) {
        try {
          // Fetch the image and compute hash
          const response = await fetch(media.file_url);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');

            // Update the record with the computed hash
            await supabase
              .from('trip_media')
              .update({ content_hash: hash })
              .eq('id', media.id);

            hashesComputed++;
          }
        } catch (fetchError) {
          console.error(`Failed to fetch media ${media.id}:`, fetchError);
          continue;
        }
      }

      if (hash) {
        mediaWithHashes.push({ id: media.id, hash });
      }
    }

    // Group by hash and find duplicates
    const hashGroups = new Map<string, string[]>();
    for (const { id, hash } of mediaWithHashes) {
      const group = hashGroups.get(hash) || [];
      group.push(id);
      hashGroups.set(hash, group);
    }

    // Delete duplicates (keep the first/oldest one in each group)
    const idsToDelete: string[] = [];
    for (const [hash, ids] of hashGroups) {
      if (ids.length > 1) {
        // Keep the first (oldest due to sort order), delete the rest
        idsToDelete.push(...ids.slice(1));
      }
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('trip_media')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        return res.status(400).json({
          success: false,
          error: deleteError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: `Removed ${idsToDelete.length} duplicate photos`,
      stats: {
        total: allMedia.length,
        hashes_computed: hashesComputed,
        duplicates_removed: idsToDelete.length,
        remaining: allMedia.length - idsToDelete.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/media/deduplicate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/media/bulk-delete
 * Delete multiple media items at once
 */
router.post('/trips/:tripId/media/bulk-delete', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { media_ids } = req.body;

    if (!Array.isArray(media_ids) || media_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'media_ids array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Verify all media items belong to this trip and user
    const { data: mediaItems, error: verifyError } = await supabase
      .from('trip_media')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .in('id', media_ids);

    if (verifyError) {
      return res.status(400).json({
        success: false,
        error: verifyError.message,
        timestamp: new Date().toISOString()
      });
    }

    const validIds = mediaItems?.map(m => m.id) || [];
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid media items found',
        timestamp: new Date().toISOString()
      });
    }

    // Delete the media items
    const { error: deleteError } = await supabase
      .from('trip_media')
      .delete()
      .in('id', validIds);

    if (deleteError) {
      return res.status(400).json({
        success: false,
        error: deleteError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Deleted ${validIds.length} photos`,
      deleted_count: validIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/media/bulk-delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/media/reorder
 * Reorder media items
 */
router.put('/trips/:tripId/media/reorder', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { parent_type, parent_id, media_ids } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Update sort orders
    for (let i = 0; i < media_ids.length; i++) {
      await supabase
        .from('trip_media')
        .update({ sort_order: i })
        .eq('id', media_ids[i])
        .eq('trip_id', tripId);
    }

    res.json({
      success: true,
      message: 'Media reordered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /travel/trips/:tripId/media/reorder error:', error);
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
 * GET /api/v1/travel/trips/:tripId/sharing
 * Get all sharing records for a trip
 */
router.get('/trips/:tripId/sharing', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_sharing')
      .select('*, users!shared_with_user_id(id, name, email)')
      .eq('trip_id', tripId);

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
    console.error('GET /travel/trips/:tripId/sharing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/sharing
 * Share a trip with a user
 */
router.post('/trips/:tripId/sharing', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { email, permission = 'view' } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if already shared
    const { data: existing } = await supabase
      .from('trip_sharing')
      .select('id')
      .eq('trip_id', tripId)
      .eq('shared_with_user_id', targetUser.id)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Already shared with this user',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_sharing')
      .insert({
        trip_id: tripId,
        shared_with_user_id: targetUser.id,
        permission,
        created_at: new Date().toISOString()
      })
      .select('*, users!shared_with_user_id(id, name, email)')
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
    console.error('POST /travel/trips/:tripId/sharing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/sharing/:shareId
 * Update sharing permission
 */
router.put('/trips/:tripId/sharing/:shareId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, shareId } = req.params;
    const { permission } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trip_sharing')
      .update({ permission })
      .eq('id', shareId)
      .eq('trip_id', tripId)
      .select('*, users!shared_with_user_id(id, name, email)')
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
    console.error('PUT /travel/trips/:tripId/sharing/:shareId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/sharing/:shareId
 * Remove sharing
 */
router.delete('/trips/:tripId/sharing/:shareId', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, shareId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trip_sharing')
      .delete()
      .eq('id', shareId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Sharing removed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/sharing/:shareId error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/sharing/public
 * Make trip public
 */
router.post('/trips/:tripId/sharing/public', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { slug, password } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id, public_slug')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const publicSlug = slug || trip.public_slug || crypto.randomBytes(4).toString('hex');
    const hashedPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : null;

    const { data, error } = await supabase
      .from('trips')
      .update({
        is_public: true,
        public_slug: publicSlug,
        share_password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
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
        ...data,
        share_url: `${process.env.FRONTEND_URL || ''}/trip/${publicSlug}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/sharing/public error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/sharing/public
 * Make trip private
 */
router.delete('/trips/:tripId/sharing/public', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('trips')
      .update({
        is_public: false,
        public_slug: null,
        share_password_hash: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Trip made private',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/sharing/public error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// (Public /public/:slug handler is registered earlier in this file,
// before travelImportRoutes is mounted, so that the import sub-router's
// blanket authenticateUser middleware doesn't reject the request.)

// =============================================
// PACKING
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/packing
 * Get packing checklist
 */
router.get('/trips/:tripId/packing', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from('trips')
      .select('packing_checklist')
      .eq('id', tripId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: data.packing_checklist || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /travel/trips/:tripId/packing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/v1/travel/trips/:tripId/packing
 * Update packing checklist
 */
router.put('/trips/:tripId/packing', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { checklist } = req.body;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('trips')
      .update({
        packing_checklist: checklist,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
      .select('packing_checklist')
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
      data: data.packing_checklist,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PUT /travel/trips/:tripId/packing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PATCH /api/v1/travel/trips/:tripId/packing/toggle
 * Toggle packing item checked status
 */
router.patch('/trips/:tripId/packing/toggle', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { item_index } = req.body;

    // Get trip with packing list
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id, packing_checklist')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const checklist = trip.packing_checklist || [];
    if (item_index < 0 || item_index >= checklist.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item index',
        timestamp: new Date().toISOString()
      });
    }

    checklist[item_index].checked = !checklist[item_index].checked;

    const { data, error } = await supabase
      .from('trips')
      .update({
        packing_checklist: checklist,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
      .select('packing_checklist')
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
      data: data.packing_checklist,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('PATCH /travel/trips/:tripId/packing/toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/packing
 * Add packing item
 */
router.post('/trips/:tripId/packing', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { item, category } = req.body;

    // Get trip with packing list
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id, packing_checklist')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const checklist = trip.packing_checklist || [];
    checklist.push({ item, checked: false, category });

    const { data, error } = await supabase
      .from('trips')
      .update({
        packing_checklist: checklist,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId)
      .select('packing_checklist')
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
      data: data.packing_checklist,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/packing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/packing/:itemIndex
 * Remove packing item
 */
router.delete('/trips/:tripId/packing/:itemIndex', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, itemIndex } = req.params;
    const index = parseInt(itemIndex, 10);

    // Get trip with packing list
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id, packing_checklist')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    const checklist = trip.packing_checklist || [];
    if (index < 0 || index >= checklist.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item index',
        timestamp: new Date().toISOString()
      });
    }

    checklist.splice(index, 1);

    const { error } = await supabase
      .from('trips')
      .update({
        packing_checklist: checklist,
        updated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Item removed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/packing/:itemIndex error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// CALENDAR SYNC
// =============================================

/**
 * POST /api/v1/travel/trips/:tripId/calendar/sync
 * Sync trip to Google Calendar
 */
router.post('/trips/:tripId/calendar/sync', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { calendar_id } = req.body;

    // TODO: Implement Google Calendar sync
    // This would use the existing Google Calendar OAuth integration

    res.json({
      success: true,
      message: 'Trip synced to calendar',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/calendar/sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/calendar/sync
 * Remove trip from Google Calendar
 */
router.delete('/trips/:tripId/calendar/sync', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // TODO: Implement Google Calendar unsync
    // This would remove all calendar events associated with this trip

    res.json({
      success: true,
      message: 'Trip removed from calendar',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/calendar/sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/activities/:activityId/calendar/sync
 * Sync activity to Google Calendar
 */
router.post('/trips/:tripId/activities/:activityId/calendar/sync', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;
    const { calendar_id } = req.body;

    // TODO: Implement Google Calendar sync for individual activity

    res.json({
      success: true,
      message: 'Activity synced to calendar',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/activities/:activityId/calendar/sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/travel/trips/:tripId/activities/:activityId/calendar/sync
 * Remove activity from Google Calendar
 */
router.delete('/trips/:tripId/activities/:activityId/calendar/sync', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, activityId } = req.params;

    // TODO: Implement Google Calendar unsync for individual activity

    res.json({
      success: true,
      message: 'Activity removed from calendar',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DELETE /travel/trips/:tripId/activities/:activityId/calendar/sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// SCHEDULE ASSEMBLY (Phase 4)
// =============================================

interface ScheduleItem {
  time_start: string; // HH:MM format
  time_end: string;
  event_type: 'activity' | 'meal' | 'transit' | 'buffer' | 'logistics';
  title: string;
  description?: string;
  notes?: string;
  tips?: string[];
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  google_maps_url?: string;
  // Transit-specific
  travel_mode?: 'walking' | 'driving' | 'transit' | 'taxi' | 'ferry';
  travel_minutes?: number;
  travel_distance_km?: number;
  travel_from_name?: string;
  travel_to_name?: string;
  // Cost & Booking
  cost_estimate?: number;
  cost_currency?: string;
  booking_required?: boolean;
  booking_url?: string;
  // Link to research
  research_item_id?: string;
}

interface DaySchedule {
  day_id: string;
  date: string;
  items: ScheduleItem[];
}

/**
 * POST /api/v1/travel/trips/:tripId/assemble-schedule
 * Assemble a 15-minute precision daily schedule from Phase 2 (hotels) and Phase 3 (activities) data
 *
 * Query params:
 * - validate_only=true: Dry run, just validate existing schedule without regenerating
 * - skip_enrichment=true: Skip pre-flight Google data fetch for activities
 */
router.post('/trips/:tripId/assemble-schedule', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  const log = (step: string, details?: Record<string, unknown>) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[AssembleSchedule][${elapsed}s] ${step}`, details ? JSON.stringify(details) : '');
  };

  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const validateOnly = req.query.validate_only === 'true';
    const skipEnrichment = req.query.skip_enrichment === 'true';

    log('START', { tripId, validateOnly, skipEnrichment });

    // 1. Verify trip ownership
    log('Step 1: Verifying trip ownership');
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      log('FAIL: Trip not found', { tripError });
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }
    log('Step 1 complete', { tripName: trip.name });

    // 2. Get trip days
    log('Step 2: Fetching trip days');
    const { data: days } = await supabase
      .from('trip_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('date', { ascending: true });

    if (!days || days.length === 0) {
      log('FAIL: No days found');
      return res.status(400).json({
        success: false,
        error: 'No days found for this trip. Please generate days first.',
        timestamp: new Date().toISOString()
      });
    }
    log('Step 2 complete', { daysCount: days.length });

    // 3. Get segments
    log('Step 3: Fetching segments');
    const { data: segments } = await supabase
      .from('trip_segments')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_date', { ascending: true });

    log('Step 3 complete', { segmentsCount: segments?.length || 0 });

    // 4. Get accommodations
    log('Step 4: Fetching accommodations');
    const { data: accommodations } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date', { ascending: true });
    log('Step 4 complete', { accommodationsCount: accommodations?.length || 0 });

    // 5. Get activities (research items converted to activities)
    log('Step 5: Fetching activities');
    const { data: activities } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_backup', false)
      .order('sort_order', { ascending: true });

    log('Step 5 complete', { activitiesCount: activities?.length || 0 });

    // 6. Get research items (for additional context)
    log('Step 6: Fetching research items');
    const { data: researchItems } = await supabase
      .from('trip_research_items')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_approved', true);
    log('Step 6 complete', { researchItemsCount: researchItems?.length || 0 });

    // 6a. Get flights (for arrival/departure time validation)
    log('Step 6a: Fetching flights');
    const { data: flights } = await supabase
      .from('trip_flights')
      .select('*')
      .eq('trip_id', tripId);
    log('Step 6a complete', { flightsCount: flights?.length || 0 });

    // 6b. Pre-flight: Enrich activities with Google data if needed
    // Skips activities that already have google_data_fetched_at set
    // Also fetches alternate activities for enrichment (with fewer photos)
    let activitiesEnriched = 0;
    let activitiesSkipped = 0;
    let reviewsAnalyzed = 0;

    // Get all activities including alternates for enrichment
    log('Step 6b: Fetching all activities for enrichment');
    const { data: allActivitiesForEnrichment } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true });
    log('Step 6b complete', { totalActivitiesForEnrichment: allActivitiesForEnrichment?.length || 0 });

    // Get Anthropic API key for review analysis (used later for schedule generation too)
    log('Step 6c: Getting Anthropic API key');
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    const anthropicApiKeyForEnrichment = keyData?.api_key;
    log('Step 6c complete', { hasAnthropicKey: !!anthropicApiKeyForEnrichment });

    if (!skipEnrichment && allActivitiesForEnrichment && allActivitiesForEnrichment.length > 0) {
      // Get Google API key from environment (GOOGLE_PLACES_API_KEY)
      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
      log('Step 7: ENRICHMENT PHASE', {
        hasGoogleKey: !!googleApiKey,
        activitiesToProcess: allActivitiesForEnrichment.length
      });

      if (googleApiKey) {
        // Enrich per-segment to provide location bias for Google Places API
        log('Step 7: Starting Google enrichment per-segment...');
        const enrichmentStartTime = Date.now();
        let totalPhotosAdded = 0;
        const allEnrichErrors: string[] = [];

        // Build segment location + accommodation lookup
        const segmentMap = new Map<string, { latitude?: number; longitude?: number; name?: string; country?: string }>();
        for (const seg of (segments || [])) {
          segmentMap.set(seg.id, { latitude: seg.latitude, longitude: seg.longitude, name: seg.name, country: seg.country });
        }
        const accommBySegment = new Map<string, string>();
        for (const acc of (accommodations || [])) {
          if (acc.segment_id) accommBySegment.set(acc.segment_id, acc.name);
        }

        // Group activities by segment_id
        const activitiesBySegmentId = new Map<string, typeof allActivitiesForEnrichment>();
        for (const act of allActivitiesForEnrichment) {
          const sid = (act as any).segment_id || '_none';
          if (!activitiesBySegmentId.has(sid)) activitiesBySegmentId.set(sid, []);
          activitiesBySegmentId.get(sid)!.push(act);
        }

        for (const [segId, segActivities] of activitiesBySegmentId) {
          const segInfo = segmentMap.get(segId);
          const segLocation = segInfo?.latitude && segInfo?.longitude
            ? { latitude: segInfo.latitude, longitude: segInfo.longitude }
            : undefined;
          const segAccommName = accommBySegment.get(segId);

          const enrichResult = await ScheduleValidationService.enrichActivitiesWithGoogleData(
            tripId,
            userId,
            segActivities as any,
            googleApiKey,
            anthropicApiKeyForEnrichment,
            segLocation,
            segAccommName,
            segInfo?.country
          );
          activitiesEnriched += enrichResult.enriched;
          activitiesSkipped += enrichResult.skipped;
          reviewsAnalyzed += enrichResult.reviewsAnalyzed;
          totalPhotosAdded += enrichResult.photosAdded;
          allEnrichErrors.push(...enrichResult.errors);
        }

        const enrichmentDuration = ((Date.now() - enrichmentStartTime) / 1000).toFixed(2);

        log('Step 7 ENRICHMENT COMPLETE', {
          duration: `${enrichmentDuration}s`,
          enriched: activitiesEnriched,
          skipped: activitiesSkipped,
          photosAdded: totalPhotosAdded,
          reviewsAnalyzed,
          errors: allEnrichErrors.length,
          errorSamples: allEnrichErrors.slice(0, 5)
        });

        // Reload primary activities with updated Google data
        if (activitiesEnriched > 0 && activities) {
          const { data: refreshedActivities } = await supabase
            .from('trip_activities')
            .select('*')
            .eq('trip_id', tripId)
            .eq('is_backup', false)
            .order('sort_order', { ascending: true });
          if (refreshedActivities) {
            (activities as any[]).splice(0, activities.length, ...refreshedActivities);
          }
        }
      }
    }

    // 6b. Validate-only mode: Just validate existing schedule without regenerating
    if (validateOnly) {
      const { data: existingScheduleItems } = await supabase
        .from('daily_schedule_items')
        .select(`
          *,
          day:trip_days(id, date, segment_id)
        `)
        .eq('trip_id', tripId)
        .order('day_id')
        .order('sort_order');

      if (!existingScheduleItems || existingScheduleItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No schedule items found to validate. Generate schedule first.',
          timestamp: new Date().toISOString()
        });
      }

      // Transform items to flatten the day relation (Supabase returns array for single relation)
      const itemsForValidation = existingScheduleItems.map((item: any) => ({
        ...item,
        day: Array.isArray(item.day) ? item.day[0] : item.day,
      }));

      // Run validation (including flight time checks)
      const validation = await ScheduleValidationService.validateSchedule(
        tripId,
        itemsForValidation,
        (activities || []) as any,
        accommodations || [],
        flights || []
      );

      // Update validation status on each schedule item
      for (const item of existingScheduleItems) {
        await ScheduleValidationService.updateScheduleItemValidation(item.id, validation.issues);
      }

      return res.json({
        success: true,
        message: 'Schedule validated',
        data: {
          days_scheduled: new Set(existingScheduleItems.map((i: any) => i.day_id)).size,
          total_items: existingScheduleItems.length,
          activities_enriched: activitiesEnriched,
          validation,
        },
        timestamp: new Date().toISOString()
      } as AssembleScheduleResponse);
    }

    // 7. Delete existing schedule items for this trip (full rebuild)
    log('Step 8: Deleting existing schedule items');
    const { error: deleteError, count: deletedCount } = await supabase
      .from('daily_schedule_items')
      .delete({ count: 'exact' })
      .eq('trip_id', tripId);
    log('Step 8 complete', { deletedItems: deletedCount || 0 });

    // 7b. Compute travel times using Google Routes API
    log('Step 8b: Computing travel times');
    const routesApiKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    let travelTimesPromptSection = '';
    try {
      const travelTimes = await computeTravelTimesForTrip(
        tripId,
        (days || []).map((d: any) => ({ id: d.id, date: d.date })),
        (activities || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          latitude: a.latitude,
          longitude: a.longitude,
          activity_type: a.activity_type,
          activity_sub_type: a.activity_sub_type,
          sort_order: a.sort_order,
          day_id: a.day_id,
          date: a.date,
        })),
        (accommodations || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          latitude: a.latitude,
          longitude: a.longitude,
          check_in_date: a.check_in_date,
          check_out_date: a.check_out_date,
        })),
        routesApiKey || null,
        userId
      );
      travelTimesPromptSection = formatTravelTimesForPrompt(travelTimes);
      log('Step 8b complete', {
        apiCalls: travelTimes.apiCallCount,
        totalTravelMinutes: travelTimes.totalTravelMinutes,
        daysWithRoutes: travelTimes.days.filter(d => d.routes.length > 0).length,
      });
    } catch (routesError) {
      log('Step 8b: Routes computation failed, continuing without travel times', {
        error: String(routesError),
      });
    }

    // 8. Prepare context for AI schedule generation
    const scheduleContext = {
      trip: {
        name: trip.name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        destination: trip.destination,
        traveler_count: trip.traveler_count
      },
      days: days.map((d: any) => ({
        id: d.id,
        date: d.date,
        day_number: d.day_number,
        segment_id: d.segment_id,
        theme: d.theme || d.agenda_notes
      })),
      segments: (segments || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        start_date: s.start_date,
        end_date: s.end_date,
        primary_location: s.primary_location
      })),
      accommodations: (accommodations || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        check_in_date: a.check_in_date,
        check_out_date: a.check_out_date,
        check_in_time: a.check_in_time || '15:00',
        check_out_time: a.check_out_time || '11:00',
        address: a.address,
        latitude: a.latitude,
        longitude: a.longitude
      })),
      activities: (activities || []).map((a: any) => ({
        id: a.id,
        day_id: a.day_id,
        name: a.name,
        description: a.description,
        activity_type: a.activity_type,
        activity_sub_type: a.activity_sub_type,
        time_block: a.time_block,
        start_time: a.start_time,
        duration_minutes: a.duration_minutes || a.estimated_duration_minutes || 60,
        location_name: a.location_name,
        location_address: a.location_address,
        latitude: a.latitude,
        longitude: a.longitude,
        cost_estimate: a.cost_estimate,
        booking_required: a.booking_required,
        booking_url: a.booking_url
      })),
      research: (researchItems || []).map((r: any) => ({
        id: r.id,
        segment_id: r.segment_id,
        day_id: r.day_id,
        name: r.name,
        category: r.category,
        time_block: r.time_block,
        duration_hours: r.duration_hours,
        location_name: r.location_name,
        latitude: r.latitude,
        longitude: r.longitude,
        cost_estimate: r.cost_estimate,
        google_maps_url: r.google_maps_url,
        tips: r.tips
      })),
      flights: (flights || []).map((f: any) => ({
        id: f.id,
        direction: f.direction,
        airline: f.airline,
        flight_number: f.flight_number,
        departure_airport: f.departure_airport,
        arrival_airport: f.arrival_airport,
        departure_datetime: f.departure_datetime,
        arrival_datetime: f.arrival_datetime
      }))
    };

    // 9. Call Claude API to generate the schedule
    // Reuse keyData from earlier enrichment step (or fetch if not yet retrieved)
    if (!keyData) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        timestamp: new Date().toISOString()
      });
    }

    const anthropicApiKey = keyData.api_key;

    const systemPrompt = `You are a travel itinerary assembly assistant. Your task is to take trip data (days, activities, accommodations, flights) and create a detailed 15-minute precision daily schedule.

RULES:
1. All times must be in 24-hour HH:MM format (e.g., "09:00", "14:30")
2. Round all times to 15-minute increments (00, 15, 30, 45)
3. USE the provided travel times exactly when available — each already includes a 10-min buffer. If no travel times are provided, estimate based on driving/walking.
4. Include buffer time between activities (15-30 min)
5. Add logical transit events between activities at different locations
6. Consider meal times (breakfast 7-9 AM, lunch 12-2 PM, dinner 6-8 PM)
7. Add hotel check-in and check-out logistics events on appropriate days
8. Keep activities within reasonable hours (8 AM - 10 PM unless specified)

FLIGHT TIME RULES (CRITICAL):
9. If there is an OUTBOUND flight, the first day schedule MUST start AFTER the arrival time + 60 minutes buffer.
   - Example: If outbound flight arrives at 11:00, the EARLIEST any activity can start is 12:00 (after clearing customs/baggage/etc)
   - Add an "Arrive at airport" logistics event at the flight arrival time
   - Add a "Pick up rental car" or "Transfer to hotel" event after arrival if applicable
10. If there is a RETURN flight, the last day schedule MUST end 2.5 hours BEFORE the departure time.
   - Example: If return flight departs at 18:00, the LAST activity must end by 15:30 at latest
   - Add a "Depart for airport" transit event before the departure buffer
11. Parse flight times from the ISO 8601 datetime strings (e.g., "2026-06-15T11:00:00+00:00" means arrival at 11:00)
   - The LOCAL time is embedded in the datetime (the timezone offset converts it to UTC, but the local time is what matters for scheduling)

OUTPUT FORMAT: Return a JSON array of day schedules with this exact structure:
[
  {
    "day_id": "uuid-of-the-day",
    "date": "YYYY-MM-DD",
    "items": [
      {
        "time_start": "HH:MM",
        "time_end": "HH:MM",
        "event_type": "activity|meal|transit|buffer|logistics",
        "title": "Event title",
        "description": "Optional description",
        "location_name": "Optional location",
        "travel_mode": "walking|driving|transit|taxi|ferry",
        "travel_minutes": 15,
        "research_item_id": "optional-uuid-if-linked-to-research"
      }
    ]
  }
]

Return ONLY valid JSON, no markdown or other text.`;

    const userPrompt = `Create a detailed 15-minute precision daily schedule for this trip:

${JSON.stringify(scheduleContext, null, 2)}
${travelTimesPromptSection ? `\n${travelTimesPromptSection}` : ''}

Generate a schedule that:
1. Assigns specific times to each activity based on their time_block (morning, afternoon, evening) and duration
2. Adds transit events between activities at different locations — use the pre-computed travel times above if provided
3. Includes hotel check-in on arrival days and check-out on departure days
4. Adds meal breaks if not already included in activities
5. Includes reasonable buffer time between packed activities
6. CRITICAL: If flights are provided, ensure the first day starts AFTER the outbound flight arrival time + 60 min buffer, and the last day ends BEFORE the return flight departure - 2.5 hours

Return the complete schedule as a JSON array.`;

    // Call Claude API using SDK with extended timeout
    log('Step 10: Calling Claude API for schedule generation', {
      contextSize: JSON.stringify(scheduleContext).length,
      daysInContext: scheduleContext.days.length,
      activitiesInContext: scheduleContext.activities.length
    });
    const aiStartTime = Date.now();

    // Create Anthropic client with 10 minute timeout for large trips
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
      timeout: 600000 // 10 minutes
    });

    let claudeData: { content: Array<{ text?: string }> };
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000, // Balanced tokens for large trips (41 days)
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      });
      claudeData = response as unknown as { content: Array<{ text?: string }> };
    } catch (apiError: any) {
      const aiDuration = ((Date.now() - aiStartTime) / 1000).toFixed(2);
      if (apiError.status === 'timeout' || apiError.code === 'ETIMEDOUT' || apiError.message?.includes('timeout')) {
        log('FAIL: Claude API timeout after 10 minutes', { duration: aiDuration });
        return res.status(504).json({
          success: false,
          error: 'AI schedule generation timed out',
          details: 'The request took longer than 10 minutes. Try a smaller trip or fewer activities.',
          timestamp: new Date().toISOString()
        });
      }
      log('FAIL: Claude API error', { error: apiError.message || String(apiError), duration: aiDuration });
      return res.status(500).json({
        success: false,
        error: 'Failed to generate schedule with AI',
        details: apiError.message || String(apiError),
        timestamp: new Date().toISOString()
      });
    }

    const aiDuration = ((Date.now() - aiStartTime) / 1000).toFixed(2);
    log('Step 10 Claude API response received', { duration: `${aiDuration}s` });

    // Validate we got content
    if (!claudeData?.content?.[0]?.text) {
      log('FAIL: Claude API returned empty response');
      return res.status(500).json({
        success: false,
        error: 'Claude API returned empty response',
        timestamp: new Date().toISOString()
      });
    }

    let scheduleJson: DaySchedule[];

    try {
      // Extract JSON from response
      const responseText = claudeData.content[0]?.text || '';
      log('Step 11: Parsing AI response', { responseLength: responseText.length });
      log('Step 11: AI response preview', { first500: responseText.substring(0, 500) });
      log('Step 11: AI response end', { last500: responseText.substring(Math.max(0, responseText.length - 500)) });

      // Try to find JSON in the response (handle potential markdown wrapping)
      let jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Response might be truncated, try to find partial JSON starting with [
        const arrayStart = responseText.indexOf('[');
        if (arrayStart === -1) {
          log('FAIL: No JSON array found in AI response', { fullResponse: responseText.substring(0, 2000) });
          throw new Error('No JSON array found in response');
        }
        // Get everything from [ to the end
        jsonMatch = [responseText.substring(arrayStart)];
      }

      log('Step 11: JSON array found', { length: jsonMatch[0].length });

      // Try to parse, if it fails try to repair truncated JSON
      let jsonString = jsonMatch[0];
      try {
        scheduleJson = JSON.parse(jsonString);
      } catch (initialError) {
        log('Step 11: Initial JSON parse failed, attempting repair', { error: String(initialError) });

        // Try to find the last complete day object (ends with }] for items array, then } for day object)
        // Pattern: ..."items": [...]}
        // Find all occurrences of complete day endings
        const dayEndPattern = /\}\s*\]\s*\}\s*,?/g;
        let lastGoodEnd = -1;
        let match;
        while ((match = dayEndPattern.exec(jsonString)) !== null) {
          lastGoodEnd = match.index + match[0].length;
        }

        if (lastGoodEnd > 0) {
          // Truncate to last complete day and close the array
          let repairedJson = jsonString.substring(0, lastGoodEnd);
          // Remove trailing comma if present
          repairedJson = repairedJson.replace(/,\s*$/, '');
          // Close the array
          repairedJson += ']';
          log('Step 11: Attempting to parse repaired JSON', {
            originalLength: jsonString.length,
            repairedLength: repairedJson.length,
            truncatedAt: lastGoodEnd
          });
          try {
            scheduleJson = JSON.parse(repairedJson);
            log('Step 11: Repaired JSON parsed successfully (partial schedule)', {
              daysInSchedule: scheduleJson.length,
              totalItems: scheduleJson.reduce((sum: number, d: any) => sum + (d.items?.length || 0), 0),
              wasRepaired: true
            });
          } catch (repairError) {
            // Repair failed, throw original error
            throw initialError;
          }
        } else {
          // Couldn't find a good truncation point
          throw initialError;
        }
      }

      if (!scheduleJson || scheduleJson.length === 0) {
        throw new Error('Parsed schedule is empty');
      }

      log('Step 11 JSON parsed successfully', {
        daysInSchedule: scheduleJson.length,
        totalItems: scheduleJson.reduce((sum, d) => sum + (d.items?.length || 0), 0)
      });
    } catch (parseError) {
      const responseText = claudeData.content[0]?.text || '';
      log('FAIL: JSON parse error', {
        error: String(parseError),
        responsePreview: responseText.substring(0, 1000)
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI-generated schedule',
        details: String(parseError),
        timestamp: new Date().toISOString()
      });
    }

    // 10. Insert schedule items into database
    const scheduleItems: any[] = [];
    let sortOrder = 0;

    // Build set of valid research item IDs to validate AI-generated IDs
    const validResearchItemIds = new Set(
      (researchItems || []).map((r: any) => r.id)
    );

    // Valid event types for the database
    const validEventTypes = new Set(['activity', 'meal', 'transit', 'buffer', 'logistics']);

    // Map common AI-generated types to valid types
    const eventTypeMapping: Record<string, string> = {
      'rest': 'buffer',
      'break': 'buffer',
      'free_time': 'buffer',
      'free time': 'buffer',
      'leisure': 'activity',
      'sightseeing': 'activity',
      'attraction': 'activity',
      'tour': 'activity',
      'travel': 'transit',
      'transport': 'transit',
      'driving': 'transit',
      'walk': 'transit',
      'flight': 'logistics',
      'hotel': 'logistics',
      'check_in': 'logistics',
      'check-in': 'logistics',
      'check_out': 'logistics',
      'check-out': 'logistics',
      'accommodation': 'logistics',
      'breakfast': 'meal',
      'lunch': 'meal',
      'dinner': 'meal',
      'snack': 'meal',
      'food': 'meal'
    };

    for (const daySchedule of scheduleJson) {
      const day = days.find((d: any) => d.id === daySchedule.day_id || d.date === daySchedule.date);
      if (!day) continue;

      const segment = segments?.find((s: any) => s.id === day.segment_id);

      for (const item of daySchedule.items) {
        // Validate research_item_id - only use it if it exists in our valid set
        const researchItemId = item.research_item_id && validResearchItemIds.has(item.research_item_id)
          ? item.research_item_id
          : null;

        // Validate and map event_type
        let eventType = item.event_type?.toLowerCase()?.trim() || 'activity';
        if (!validEventTypes.has(eventType)) {
          eventType = eventTypeMapping[eventType] || 'activity'; // Default to 'activity' if unknown
        }

        scheduleItems.push({
          trip_id: tripId,
          day_id: day.id,
          segment_id: segment?.id || null,
          time_start: item.time_start,
          time_end: item.time_end,
          event_type: eventType,
          title: item.title,
          description: item.description || null,
          notes: item.notes || null,
          tips: item.tips || null,
          location_name: item.location_name || null,
          location_address: item.location_address || null,
          location_lat: item.location_lat || null,
          location_lng: item.location_lng || null,
          google_maps_url: item.google_maps_url || null,
          travel_mode: item.travel_mode || null,
          travel_minutes: item.travel_minutes || null,
          travel_distance_km: item.travel_distance_km || null,
          travel_from_name: item.travel_from_name || null,
          travel_to_name: item.travel_to_name || null,
          research_item_id: researchItemId,
          cost_estimate: item.cost_estimate || null,
          cost_currency: item.cost_currency || 'EUR',
          booking_required: item.booking_required || false,
          booking_url: item.booking_url || null,
          sort_order: sortOrder++
        });
      }

      // Update day assembly status
      await supabase
        .from('trip_days')
        .update({
          assembly_status: 'assembled',
          assembly_summary: {
            total_events: daySchedule.items.length,
            total_transit_mins: daySchedule.items
              .filter((i: ScheduleItem) => i.event_type === 'transit')
              .reduce((sum: number, i: ScheduleItem) => sum + (i.travel_minutes || 0), 0),
            earliest_start: daySchedule.items[0]?.time_start,
            latest_end: daySchedule.items[daySchedule.items.length - 1]?.time_end
          }
        })
        .eq('id', day.id);
    }

    // Batch insert schedule items
    log('Step 12: Inserting schedule items', { itemsToInsert: scheduleItems.length });
    let insertedItemIds: string[] = [];
    if (scheduleItems.length > 0) {
      const { data: insertedItems, error: insertError } = await supabase
        .from('daily_schedule_items')
        .insert(scheduleItems)
        .select('id, day_id, time_start, time_end, event_type, title, location_name, location_lat, location_lng, research_item_id');

      if (insertError) {
        log('FAIL: Insert error', { error: insertError.message });
        return res.status(500).json({
          success: false,
          error: 'Failed to save schedule items',
          details: insertError.message,
          timestamp: new Date().toISOString()
        });
      }

      insertedItemIds = (insertedItems || []).map((i: any) => i.id);
      log('Step 12 complete', { insertedCount: insertedItemIds.length });

      // 13. Post-assembly validation
      log('Step 13: Running post-assembly validation');
      // Fetch inserted items with day info for validation
      const { data: fetchedItemsForValidation } = await supabase
        .from('daily_schedule_items')
        .select(`
          id, day_id, time_start, time_end, event_type, title,
          location_name, location_lat, location_lng, research_item_id,
          day:trip_days(id, date, segment_id)
        `)
        .eq('trip_id', tripId)
        .order('day_id')
        .order('sort_order');

      if (fetchedItemsForValidation && fetchedItemsForValidation.length > 0) {
        // Transform items to flatten the day relation (Supabase returns array for single relation)
        const itemsForValidation = fetchedItemsForValidation.map((item: any) => ({
          ...item,
          day: Array.isArray(item.day) ? item.day[0] : item.day,
        }));

        const validation = await ScheduleValidationService.validateSchedule(
          tripId,
          itemsForValidation,
          (activities || []) as any,
          accommodations || [],
          flights || []
        );

        // Update validation status on each schedule item
        for (const item of fetchedItemsForValidation) {
          await ScheduleValidationService.updateScheduleItemValidation(item.id, validation.issues);
        }

        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        log('SUCCESS: Schedule assembled and validated', {
          totalDuration: `${totalDuration}s`,
          daysScheduled: scheduleJson.length,
          totalItems: scheduleItems.length,
          activitiesEnriched,
          validationErrors: validation.summary.errors,
          validationWarnings: validation.summary.warnings
        });

        return res.json({
          success: true,
          message: 'Schedule assembled and validated',
          data: {
            days_scheduled: scheduleJson.length,
            total_items: scheduleItems.length,
            activities_enriched: activitiesEnriched,
            validation,
          },
          timestamp: new Date().toISOString()
        } as AssembleScheduleResponse);
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('SUCCESS: Schedule assembled (no validation)', {
      totalDuration: `${totalDuration}s`,
      daysScheduled: scheduleJson.length,
      totalItems: scheduleItems.length,
      activitiesEnriched
    });

    res.json({
      success: true,
      message: 'Schedule assembled successfully',
      data: {
        days_scheduled: scheduleJson.length,
        total_items: scheduleItems.length,
        activities_enriched: activitiesEnriched,
      },
      timestamp: new Date().toISOString()
    } as AssembleScheduleResponse);

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[AssembleSchedule][${elapsed}s] UNCAUGHT ERROR:`, error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/segments/:segmentId/enrich-activities
 * Enrich only the activities belonging to a specific segment with Google Places data
 */
router.post('/trips/:tripId/segments/:segmentId/enrich-activities', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  const log = (msg: string, details?: Record<string, unknown>) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[SegmentEnrich][${elapsed}s] ${msg}`, details ? JSON.stringify(details) : '');
  };

  try {
    const userId = req.user!.id;
    const { tripId, segmentId } = req.params;

    log('START', { tripId, segmentId });

    // 1. Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found', timestamp: new Date().toISOString() });
    }

    // 2. Verify segment exists and belongs to trip
    const { data: segment, error: segError } = await supabase
      .from('trip_segments')
      .select('id, name, start_date, end_date, latitude, longitude, country')
      .eq('id', segmentId)
      .eq('trip_id', tripId)
      .single();

    if (segError || !segment) {
      return res.status(404).json({ success: false, error: 'Segment not found', timestamp: new Date().toISOString() });
    }

    log('Segment found', { name: segment.name, start: segment.start_date, end: segment.end_date });

    // 3. Get all activities for this segment (by segment_id)
    const { data: segmentActivities } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .eq('segment_id', segmentId)
      .order('sort_order', { ascending: true });

    if (!segmentActivities || segmentActivities.length === 0) {
      return res.json({
        success: true,
        message: 'No activities found for this segment',
        data: { enriched: 0, skipped: 0, photosAdded: 0, reviewsAnalyzed: 0, errors: [] },
        timestamp: new Date().toISOString()
      });
    }

    log('Activities found', { count: segmentActivities.length });

    // 4. Get Google API key
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(400).json({ success: false, error: 'Google Places API key not configured', timestamp: new Date().toISOString() });
    }

    // 5. Get Anthropic API key for review analysis
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    const anthropicApiKey = keyData?.api_key;

    // 5b. Get accommodation name for this segment (for hotel restaurant resolution)
    const { data: segAccomm } = await supabase
      .from('trip_accommodations')
      .select('name')
      .eq('segment_id', segmentId)
      .limit(1)
      .single();

    // 6. Enrich activities with segment location bias
    const segmentLocation = segment.latitude && segment.longitude
      ? { latitude: segment.latitude, longitude: segment.longitude }
      : undefined;
    log('Starting enrichment...', { activitiesCount: segmentActivities.length, hasLocation: !!segmentLocation });
    const enrichResult = await ScheduleValidationService.enrichActivitiesWithGoogleData(
      tripId,
      userId,
      segmentActivities as any,
      googleApiKey,
      anthropicApiKey,
      segmentLocation,
      segAccomm?.name,
      segment.country
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('COMPLETE', {
      duration: `${duration}s`,
      enriched: enrichResult.enriched,
      skipped: enrichResult.skipped,
      photosAdded: enrichResult.photosAdded,
      reviewsAnalyzed: enrichResult.reviewsAnalyzed,
      errors: enrichResult.errors.length,
    });

    // 7. Auto-trigger AI content enrichment (fire-and-forget)
    // Runs AFTER Google Places data is in place:
    //   a) Restaurant detail enrichment (signature dishes, review analysis)
    //   b) Activity detail enrichment (deep_dive, practical_details)
    if (anthropicApiKey && googleApiKey) {
      enrichRestaurantDetails(tripId, userId, googleApiKey, anthropicApiKey, segmentId)
        .then(r => log('Restaurant enrichment complete', { enriched: r.enriched, skipped: r.skipped }))
        .catch(e => console.error('[SegmentEnrich] Restaurant enrichment error:', e));

      enrichActivityDetails(tripId, userId, googleApiKey, anthropicApiKey, segmentId)
        .then(r => log('Activity detail enrichment complete', { enriched: r.enriched, skipped: r.skipped }))
        .catch(e => console.error('[SegmentEnrich] Activity detail enrichment error:', e));
    }

    return res.json({
      success: true,
      message: `Enriched ${enrichResult.enriched} activities for segment "${segment.name}"`,
      data: {
        enriched: enrichResult.enriched,
        skipped: enrichResult.skipped,
        photosAdded: enrichResult.photosAdded,
        reviewsAnalyzed: enrichResult.reviewsAnalyzed,
        errors: enrichResult.errors,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SegmentEnrich][${elapsed}s] ERROR:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/segments/:segmentId/timing-enrichment
 * Phase 2 enrichment: replace generic meals with real restaurants + compute travel times
 */
router.post('/trips/:tripId/segments/:segmentId/timing-enrichment', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  const log = (msg: string, details?: Record<string, unknown>) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[TimingEnrich][${elapsed}s] ${msg}`, details ? JSON.stringify(details) : '');
  };

  try {
    const userId = req.user!.id;
    const { tripId, segmentId } = req.params;

    log('START', { tripId, segmentId });

    // 1. Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found', timestamp: new Date().toISOString() });
    }

    // 2. Verify segment exists and belongs to trip
    const { data: segment, error: segError } = await supabase
      .from('trip_segments')
      .select('id, name, start_date, end_date')
      .eq('id', segmentId)
      .eq('trip_id', tripId)
      .single();

    if (segError || !segment) {
      return res.status(404).json({ success: false, error: 'Segment not found', timestamp: new Date().toISOString() });
    }

    log('Segment found', { name: segment.name, start: segment.start_date, end: segment.end_date });

    // 3. Get Google API key
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(400).json({ success: false, error: 'Google Places API key not configured', timestamp: new Date().toISOString() });
    }

    // 4. Get Anthropic API key for dish analysis
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    const anthropicApiKey = keyData?.api_key;

    // 5. Run restaurant suggestions for this segment
    log('Starting restaurant suggestions...');
    const mealResult = await RestaurantSuggestionService.suggestRestaurantsForTrip(
      tripId,
      userId,
      googleApiKey,
      anthropicApiKey,
      segmentId
    );

    log('Restaurant suggestions complete', {
      processed: mealResult.mealsProcessed,
      applied: mealResult.suggestionsApplied,
      alternates: mealResult.alternatesCreated,
    });

    // 6. Get segment activities + days + accommodations for travel time computation
    const { data: segDays } = await supabase
      .from('trip_days')
      .select('id, date')
      .eq('trip_id', tripId)
      .gte('date', segment.start_date)
      .lte('date', segment.end_date)
      .order('date', { ascending: true });

    const { data: segActivities } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .eq('segment_id', segmentId)
      .eq('is_backup', false)
      .order('sort_order', { ascending: true });

    const { data: accommodations } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date', { ascending: true });

    let routesComputed = 0;
    let travelMinutesTotal = 0;

    if (segDays && segDays.length > 0 && segActivities && segActivities.length > 0) {
      log('Computing travel times...', { days: segDays.length, activities: segActivities.length });

      const travelResult = await computeTravelTimesForTrip(
        tripId,
        segDays,
        segActivities as any,
        (accommodations || []) as any,
        googleApiKey,
        userId
      );

      routesComputed = travelResult.apiCallCount;
      travelMinutesTotal = travelResult.totalTravelMinutes;

      log('Travel times complete', { routes: routesComputed, totalMinutes: travelMinutesTotal });
    }

    // Auto-trigger restaurant detail enrichment (fire-and-forget)
    if (anthropicApiKey && googleApiKey) {
      enrichRestaurantDetails(tripId, userId, googleApiKey, anthropicApiKey, segmentId)
        .then(r => log('Restaurant enrichment complete', { enriched: r.enriched, skipped: r.skipped }))
        .catch(e => console.error('[TimingEnrich] Restaurant enrichment error:', e));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('COMPLETE', { duration: `${duration}s` });

    return res.json({
      success: true,
      message: `Timing enrichment complete for segment "${segment.name}"`,
      data: {
        meals_suggested: mealResult.suggestionsApplied,
        alternates_created: mealResult.alternatesCreated,
        routes_computed: routesComputed,
        travel_minutes_total: travelMinutesTotal,
        errors: mealResult.errors,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[TimingEnrich][${elapsed}s] ERROR:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/enrich-restaurant-details
 * Dedicated restaurant enrichment: fetches reviews and extracts dining recommendations via AI
 */
router.post('/trips/:tripId/enrich-restaurant-details', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const segmentId = req.query.segmentId as string | undefined;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found', timestamp: new Date().toISOString() });
    }

    // Get API keys
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(400).json({ success: false, error: 'Google Places API key not configured', timestamp: new Date().toISOString() });
    }

    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!keyData?.api_key) {
      return res.status(400).json({ success: false, error: 'Anthropic API key not configured', timestamp: new Date().toISOString() });
    }

    const result = await enrichRestaurantDetails(tripId, userId, googleApiKey, keyData.api_key, segmentId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[RestaurantEnrichEndpoint] Complete in ${duration}s`, result);

    return res.json({
      success: true,
      message: `Restaurant enrichment complete: ${result.enriched} enriched, ${result.skipped} skipped`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[RestaurantEnrichEndpoint][${elapsed}s] ERROR:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/enrich-activity-details
 * AI-powered enrichment for activities missing deep_dive and practical_details.
 * Delegates to the enrichActivityDetails service function.
 */
router.post('/trips/:tripId/enrich-activity-details', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const segmentId = req.query.segmentId as string | undefined;
    const activityId = req.query.activityId as string | undefined;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found', timestamp: new Date().toISOString() });
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(400).json({ success: false, error: 'Google Places API key not configured', timestamp: new Date().toISOString() });
    }

    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!keyData?.api_key) {
      return res.status(400).json({ success: false, error: 'Anthropic API key not configured', timestamp: new Date().toISOString() });
    }

    const result = await enrichActivityDetails(tripId, userId, googleApiKey, keyData.api_key, segmentId, activityId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[ActivityDetailEnrichEndpoint] Complete in ${duration}s`, result);

    return res.json({
      success: true,
      message: `Activity detail enrichment complete: ${result.enriched} enriched, ${result.skipped} skipped`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[ActivityDetailEnrichEndpoint][${elapsed}s] ERROR:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/deep-enrich
 * Orchestrates the gap-filler enrichment step:
 * - Activity deep_dive gaps
 * - Restaurant review gaps
 * - Trip-level deep overview
 * - Segment-level narrative synthesis
 * - Day-level tour guide narrative
 */
router.post('/trips/:tripId/deep-enrich', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found', timestamp: new Date().toISOString() });
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(400).json({ success: false, error: 'Google Places API key not configured', timestamp: new Date().toISOString() });
    }

    const anthropicKeyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!anthropicKeyData?.api_key) {
      return res.status(400).json({ success: false, error: 'Anthropic API key not configured', timestamp: new Date().toISOString() });
    }

    const perplexityKeyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'perplexity');

    const { runDeepEnrichment } = await import('../services/deep-enrichment');
    const result = await runDeepEnrichment(
      tripId,
      userId,
      googleApiKey,
      anthropicKeyData.api_key,
      perplexityKeyData?.api_key
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[DeepEnrichEndpoint] Complete in ${duration}s`, result);

    return res.json({
      success: true,
      message: `Deep enrichment complete`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[DeepEnrichEndpoint][${elapsed}s] ERROR:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/travel/trips/:tripId/schedule
 * Get assembled daily schedule items for a trip
 */
router.get('/trips/:tripId/schedule', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;

    // Verify trip access
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get schedule items
    const { data: scheduleItems, error: itemsError } = await supabase
      .from('daily_schedule_items')
      .select(`
        *,
        day:trip_days(id, date, day_number),
        segment:trip_segments(id, name)
      `)
      .eq('trip_id', tripId)
      .order('day_id')
      .order('sort_order');

    if (itemsError) {
      return res.status(500).json({
        success: false,
        error: itemsError.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: scheduleItems || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GET /travel/trips/:tripId/schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/suggest-restaurants
 * Find and replace generic meal slots ("Breakfast", "Lunch", "Dinner")
 * with real restaurant suggestions using Google Places.
 *
 * Query params:
 * - dry_run=true: Just find generic meals without replacing them
 */
router.post('/trips/:tripId/suggest-restaurants', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const dryRun = req.query.dry_run === 'true';

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get Google API key
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(400).json({
        success: false,
        error: 'No Google API key configured',
        timestamp: new Date().toISOString()
      });
    }

    // Get Anthropic API key for review analysis (optional)
    const keyData2 = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    const anthropicApiKey = keyData2?.api_key;

    if (dryRun) {
      // Just find generic meals and return them
      const { data: activities } = await supabase
        .from('trip_activities')
        .select('*')
        .eq('trip_id', tripId)
        .eq('is_backup', false)
        .order('sort_order', { ascending: true });

      const genericMeals = RestaurantSuggestionService.findGenericMealSlots(activities || []);

      return res.json({
        success: true,
        data: {
          generic_meals_found: genericMeals.length,
          meals: genericMeals,
        },
        timestamp: new Date().toISOString()
      });
    }

    // Run restaurant suggestions
    const result = await RestaurantSuggestionService.suggestRestaurantsForTrip(
      tripId,
      userId,
      googleApiKey,
      anthropicApiKey
    );

    res.json({
      success: true,
      data: {
        meals_processed: result.mealsProcessed,
        suggestions_applied: result.suggestionsApplied,
        alternates_created: result.alternatesCreated,
        errors: result.errors,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('POST /travel/trips/:tripId/suggest-restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/segments/:segmentId/meal-research
 * AI-powered meal research: Perplexity web search → Claude synthesis → Google Places grounding.
 * Finds authentic, local restaurant picks to replace generic meal activities.
 *
 * Body (optional): { preferences?: MealResearchPreferences }
 * Falls back to saved travel_settings.meal_preferences if no body prefs.
 */
router.post('/trips/:tripId/segments/:segmentId/meal-research', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const { tripId, segmentId } = req.params;

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found', timestamp: new Date().toISOString() });
    }

    // Verify segment
    const { data: segment, error: segError } = await supabase
      .from('trip_segments')
      .select('id, name')
      .eq('id', segmentId)
      .eq('trip_id', tripId)
      .single();

    if (segError || !segment) {
      return res.status(404).json({ success: false, error: 'Segment not found', timestamp: new Date().toISOString() });
    }

    // Get API keys
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res.status(500).json({ success: false, error: 'Google Places API key not configured', timestamp: new Date().toISOString() });
    }

    const perplexityKeyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'perplexity');
    if (!perplexityKeyData) {
      return res.status(400).json({ success: false, error: 'No Perplexity API key configured. Add one in Settings → API Keys.', timestamp: new Date().toISOString() });
    }

    const anthropicKeyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!anthropicKeyData) {
      return res.status(400).json({ success: false, error: 'No Anthropic API key configured.', timestamp: new Date().toISOString() });
    }

    // Get meal preferences: body > saved > defaults
    let preferences = req.body?.preferences;
    if (!preferences) {
      const { data: settings } = await supabase
        .from('travel_settings')
        .select('meal_preferences')
        .eq('user_id', userId)
        .single();
      preferences = settings?.meal_preferences;
    }
    if (!preferences) {
      preferences = {
        dining_style: 'balanced',
        priorities: ['authenticity', 'local_specialties'],
        avoid: ['tourist_traps'],
        cuisine_interests: ['regional_specialties'],
        budget: 'moderate',
        dietary_restrictions: [],
      };
    }

    // Run meal research
    const { researchMealsForSegment } = await import('../services/meal-research');
    const result = await researchMealsForSegment(
      tripId, segmentId, userId,
      perplexityKeyData.api_key,
      anthropicKeyData.api_key,
      googleApiKey,
      preferences,
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      success: true,
      message: `Meal research complete for ${segment.name}: ${result.mealsResearched} meals researched, ${result.placesGrounded} grounded with Google Places`,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('POST /travel/trips/:tripId/segments/:segmentId/meal-research error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================
// ACCOMMODATION AI ENRICHMENT
// =============================================

/**
 * POST /api/v1/travel/trips/:tripId/accommodations/:accommodationId/enrich-ai
 * AI-powered enrichment: Perplexity web search → Claude synthesis → DB update
 */
router.post('/trips/:tripId/accommodations/:accommodationId/enrich-ai', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, accommodationId } = req.params;

    // Check trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip || trip.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Get accommodation
    const { data: accommodation, error: accError } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('id', accommodationId)
      .eq('trip_id', tripId)
      .single();

    if (accError || !accommodation) {
      return res.status(404).json({ success: false, error: 'Accommodation not found' });
    }

    // Get API keys
    const perplexityKeyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'perplexity');
    const anthropicKeyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');

    if (!anthropicKeyData) {
      return res.status(400).json({ success: false, error: 'No Anthropic API key configured' });
    }

    // Phase 1: Perplexity web search
    let perplexityText = '';
    if (perplexityKeyData) {
      try {
        const searchQuery = `"${accommodation.name}" ${accommodation.address || ''} hotel amenities parking breakfast pool restaurant nearby attractions family-friendly reviews tips`;
        const perplexityResp = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKeyData.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: `You are researching accommodation details for a family trip. Find specific, factual information about this property including:
1. Parking availability and cost
2. Breakfast options and cost
3. Pool details (type, kids allowed, heated)
4. On-site restaurants/bars
5. Gym/spa
6. Kitchen facilities, laundry
7. The neighborhood/area, walkability, nearby landmarks within walking distance
8. GUEST REVIEW HIGHLIGHTS: What do guests consistently praise? What do they love most?
9. CHECK-IN TIPS: Early check-in policy, late checkout, what to ask for at reception
10. ROOM TIPS: Best room types, best views, floors to request, room upgrade strategies
11. THINGS GUESTS SHOULD KNOW: Any quirks, construction, noise, hidden fees, what to bring
12. FAMILY-SPECIFIC: Kids clubs, family amenities, kid-friendly pools, high chairs, cribs`
              },
              {
                role: 'user',
                content: searchQuery
              }
            ],
            max_tokens: 2000,
            temperature: 0.2,
          }),
        });

        if (perplexityResp.ok) {
          const perplexityResult: any = await perplexityResp.json();
          perplexityText = perplexityResult.choices?.[0]?.message?.content || '';
        }
      } catch (pErr) {
        console.error('Perplexity search error (non-fatal):', pErr);
      }
    }

    // Phase 2: Claude synthesis
    const anthropic = new Anthropic({ apiKey: anthropicKeyData.api_key });
    const synthesisPrompt = `Extract structured accommodation details from the web research below. If no web research is available, use your knowledge of "${accommodation.name}" at "${accommodation.address || ''}".

${perplexityText ? `Web research:\n${perplexityText}` : 'No web research available — use your knowledge.'}

Existing data we already have:
- Name: ${accommodation.name}
- Address: ${accommodation.address || 'unknown'}
- Room type: ${accommodation.room_type || 'unknown'}
- Amenities (flat list): ${JSON.stringify(accommodation.amenities || [])}
- Notes: ${accommodation.notes || 'none'}

Return a JSON object with EXACTLY this structure (use null for unknown fields, do NOT guess):
{
  "property_type": "hotel" | "resort" | "vacation_rental" | "apartment" | "boutique" | "pousada" | "bed_and_breakfast" | "hostel",
  "star_rating": <number 1-5 or null>,
  "parking": {
    "available": <boolean>,
    "type": "on_site" | "street" | "garage" | "valet" | "none",
    "cost_per_day": <number or null>,
    "currency": "EUR" | "USD" | etc,
    "free": <boolean>,
    "notes": "<string or null>"
  },
  "breakfast": {
    "included": <boolean>,
    "type": "buffet" | "continental" | "full" | "cooked_to_order" | "none",
    "cost_per_person": <number or null>,
    "currency": "EUR" | "USD" | etc,
    "hours": "<string like '7:00-10:30' or null>",
    "notes": "<string or null>"
  },
  "amenities_structured": {
    "pool": { "exists": <boolean>, "type": "indoor" | "outdoor" | "both" | null, "kid_pool": <boolean>, "heated": <boolean>, "adults_only": <boolean> },
    "gym": <boolean>,
    "spa": <boolean>,
    "restaurant_on_site": <boolean>,
    "bar": <boolean>,
    "kitchen": { "type": "full" | "kitchenette" | "none" },
    "laundry": <boolean>,
    "wifi": <boolean>,
    "air_conditioning": <boolean>,
    "elevator": <boolean>,
    "concierge": <boolean>,
    "room_service": <boolean>,
    "airport_shuttle": <boolean>,
    "ev_charging": <boolean>,
    "pet_friendly": <boolean>
  },
  "neighborhood": "<name of neighborhood/district>",
  "nearby_landmarks": [
    { "name": "<landmark>", "distance": "<e.g. 200m>", "walk_minutes": <number> }
  ],
  "guest_insights": {
    "what_guests_love": "<What do reviewers consistently praise? Top 2-3 things guests love (e.g. 'Stunning river views from every room, exceptional breakfast buffet with mimosa bar, friendly staff')>",
    "check_in_tips": "<Early check-in policy, what to ask at reception, any upgrade strategies (e.g. 'Early check-in often possible by noon-1pm if requested. Ask about suite upgrades — availability is common midweek')>",
    "room_tips": "<Best room types, best views, floors to request (e.g. 'Request high floor river-view room. Corner suites on floors 6-8 have panoramic Tagus views')>",
    "things_to_know": "<Quirks, hidden fees, noise, construction, what to bring (e.g. 'City tax €4/night paid at check-in. Pool is adults-only. Parking is €25/day — street parking available nearby')>",
    "family_tips": "<Family-specific tips: cribs, high chairs, kids clubs, family-friendly dining (e.g. 'Cribs available on request. Kids eat free at breakfast. No dedicated kids pool but beach is 5 min walk')>",
    "best_features": ["<feature 1>", "<feature 2>", "<feature 3>"],
    "review_highlights": ["<short quote or insight from reviews>", "<another highlight>"]
  }
}

Return ONLY valid JSON, no markdown.`;

    const claudeResp = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const claudeText = claudeResp.content[0]?.type === 'text' ? claudeResp.content[0].text : '';
    let enrichment: any;
    try {
      let jsonStr = claudeText;
      if (jsonStr.includes('```json')) jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      else if (jsonStr.includes('```')) jsonStr = jsonStr.replace(/```\n?/g, '');
      enrichment = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error('Failed to parse enrichment JSON:', claudeText.slice(0, 500));
      return res.status(500).json({ success: false, error: 'Failed to parse AI enrichment response' });
    }

    // Phase 3: Update DB
    const updateData: Record<string, any> = {
      enriched_at: new Date().toISOString(),
      enrichment_source: perplexityText ? 'perplexity_claude' : 'claude',
      updated_at: new Date().toISOString(),
    };

    if (enrichment.property_type) updateData.property_type = enrichment.property_type;
    if (enrichment.star_rating) updateData.star_rating = enrichment.star_rating;
    if (enrichment.parking) updateData.parking = enrichment.parking;
    if (enrichment.breakfast) updateData.breakfast = enrichment.breakfast;
    if (enrichment.amenities_structured) updateData.amenities_structured = enrichment.amenities_structured;
    if (enrichment.neighborhood) updateData.neighborhood = enrichment.neighborhood;
    if (enrichment.nearby_landmarks?.length > 0) updateData.nearby_landmarks = enrichment.nearby_landmarks;
    if (enrichment.guest_insights) updateData.guest_insights = enrichment.guest_insights;

    const { error: updateError } = await supabase
      .from('trip_accommodations')
      .update(updateData)
      .eq('id', accommodationId);

    if (updateError) {
      console.error('Enrichment update error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to save enrichment data' });
    }

    res.json({
      success: true,
      data: {
        enrichment,
        fields_updated: Object.keys(updateData).length,
        source: updateData.enrichment_source,
      },
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/accommodations/:accommodationId/enrich-ai error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/accommodations/:accommodationId/enrich-airbnb
 * Enrich an Airbnb accommodation using the Airbnb listing API
 * Fetches photos, amenities, host info, check-in/out times directly from Airbnb
 */
router.post('/trips/:tripId/accommodations/:accommodationId/enrich-airbnb', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, accommodationId } = req.params;

    // Verify trip ownership
    const { data: trip } = await supabase.from('trips').select('id').eq('id', tripId).eq('user_id', userId).single();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

    // Get accommodation
    const { data: acc } = await supabase.from('trip_accommodations').select('*').eq('id', accommodationId).eq('trip_id', tripId).single();
    if (!acc) return res.status(404).json({ success: false, error: 'Accommodation not found' });

    // Must have an Airbnb URL
    const airbnbUrl = acc.website;
    if (!airbnbUrl || !extractAirbnbListingId(airbnbUrl)) {
      return res.status(400).json({ success: false, error: 'Accommodation does not have a valid Airbnb listing URL' });
    }

    const result = await enrichFromAirbnb(tripId, accommodationId, userId, airbnbUrl);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'Airbnb enrichment failed' });
    }

    res.json({
      success: true,
      data: {
        photosAdded: result.photosAdded,
        photosSkipped: result.photosSkipped,
        fieldsUpdated: result.fieldsUpdated,
        message: `Enriched from Airbnb. ${result.photosAdded} photos added.`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/accommodations/:accommodationId/enrich-airbnb error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/accommodations/:accommodationId/upload-confirmation
 * Upload a confirmation document (PDF/image) for an accommodation
 */
router.post('/trips/:tripId/accommodations/:accommodationId/upload-confirmation', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, accommodationId } = req.params;
    const { file, filename, mimeType } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ success: false, error: 'file and filename are required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ success: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` });
    }

    // Verify trip ownership
    const { data: trip } = await supabase.from('trips').select('id').eq('id', tripId).eq('user_id', userId).single();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

    // Verify accommodation belongs to this trip
    const { data: acc } = await supabase.from('trip_accommodations').select('id, name').eq('id', accommodationId).eq('trip_id', tripId).single();
    if (!acc) return res.status(404).json({ success: false, error: 'Accommodation not found' });

    // Decode base64
    const base64Data = file.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size (10MB max)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large. Maximum 10MB.' });
    }

    // Upload to Supabase Storage
    const ext = filename.split('.').pop() || 'pdf';
    const storagePath = `travel/${tripId}/confirmations/${accommodationId}/confirmation.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('singularity-uploads')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload file' });
    }

    const { data: urlData } = supabase.storage.from('singularity-uploads').getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Upsert trip_media record (replace existing confirmation doc if any)
    const { data: existing } = await supabase
      .from('trip_media')
      .select('id')
      .eq('trip_id', tripId)
      .eq('parent_type', 'accommodation')
      .eq('parent_id', accommodationId)
      .eq('media_type', 'document')
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('trip_media').update({
        file_url: publicUrl,
        original_filename: filename,
        mime_type: mimeType,
        file_size_bytes: buffer.length,
      }).eq('id', existing[0].id);
    } else {
      await supabase.from('trip_media').insert({
        trip_id: tripId,
        user_id: userId,
        parent_type: 'accommodation',
        parent_id: accommodationId,
        file_url: publicUrl,
        media_type: 'document',
        original_filename: filename,
        mime_type: mimeType,
        file_size_bytes: buffer.length,
        sort_order: 0,
      });
    }

    res.json({
      success: true,
      data: { fileUrl: publicUrl, filename },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /travel/trips/:tripId/accommodations/:accommodationId/upload-confirmation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/flights/:flightId/upload-confirmation
 * Upload a confirmation document (PDF/image) for a flight
 */
router.post('/trips/:tripId/flights/:flightId/upload-confirmation', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, flightId } = req.params;
    const { file, filename, mimeType } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ success: false, error: 'file and filename are required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ success: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` });
    }

    const { data: trip } = await supabase.from('trips').select('id').eq('id', tripId).eq('user_id', userId).single();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

    const { data: flight } = await supabase.from('trip_flights').select('id').eq('id', flightId).eq('trip_id', tripId).single();
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    const base64Data = file.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large. Maximum 10MB.' });
    }

    const ext = filename.split('.').pop() || 'pdf';
    const storagePath = `travel/${tripId}/confirmations/flights/${flightId}/confirmation.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('singularity-uploads')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload file' });
    }

    const { data: urlData } = supabase.storage.from('singularity-uploads').getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    const { data: existing } = await supabase.from('trip_media').select('id')
      .eq('trip_id', tripId).eq('parent_type', 'flight').eq('parent_id', flightId).eq('media_type', 'document').limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('trip_media').update({
        file_url: publicUrl, original_filename: filename, mime_type: mimeType, file_size_bytes: buffer.length,
      }).eq('id', existing[0].id);
    } else {
      await supabase.from('trip_media').insert({
        trip_id: tripId, user_id: userId, parent_type: 'flight', parent_id: flightId,
        file_url: publicUrl, media_type: 'document', original_filename: filename,
        mime_type: mimeType, file_size_bytes: buffer.length, sort_order: 0,
      });
    }

    res.json({ success: true, data: { fileUrl: publicUrl, filename }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('POST flights upload-confirmation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/travel/trips/:tripId/driving/:drivingId/upload-confirmation
 * Upload a confirmation document (PDF/image) for a car rental
 */
router.post('/trips/:tripId/driving/:drivingId/upload-confirmation', authenticateUser, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { tripId, drivingId } = req.params;
    const { file, filename, mimeType } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ success: false, error: 'file and filename are required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ success: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` });
    }

    const { data: trip } = await supabase.from('trips').select('id').eq('id', tripId).eq('user_id', userId).single();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

    const { data: driving } = await supabase.from('trip_driving').select('id').eq('id', drivingId).eq('trip_id', tripId).single();
    if (!driving) return res.status(404).json({ success: false, error: 'Driving record not found' });

    const base64Data = file.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large. Maximum 10MB.' });
    }

    const ext = filename.split('.').pop() || 'pdf';
    const storagePath = `travel/${tripId}/confirmations/driving/${drivingId}/confirmation.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('singularity-uploads')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload file' });
    }

    const { data: urlData } = supabase.storage.from('singularity-uploads').getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    const { data: existing } = await supabase.from('trip_media').select('id')
      .eq('trip_id', tripId).eq('parent_type', 'driving').eq('parent_id', drivingId).eq('media_type', 'document').limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('trip_media').update({
        file_url: publicUrl, original_filename: filename, mime_type: mimeType, file_size_bytes: buffer.length,
      }).eq('id', existing[0].id);
    } else {
      await supabase.from('trip_media').insert({
        trip_id: tripId, user_id: userId, parent_type: 'driving', parent_id: drivingId,
        file_url: publicUrl, media_type: 'document', original_filename: filename,
        mime_type: mimeType, file_size_bytes: buffer.length, sort_order: 0,
      });
    }

    res.json({ success: true, data: { fileUrl: publicUrl, filename }, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('POST driving upload-confirmation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
