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
import { AIAPIKeyService } from '../modules/ai-api-keys/services/aiAPIKeyService';
import { ScheduleValidationService } from '../services/schedule-validation';
import type { ValidationResult, AssembleScheduleResponse } from '@singularity/shared-types';

// Import travel import & settings routes (see docs/travel-module-prd.md for workflow)
import travelImportRoutes from './travel-import';

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

// Mount travel import & settings routes (settings, import, research items)
// See docs/travel-module-prd.md for the full workflow documentation
router.use('/', travelImportRoutes);

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
      { data: media },
      { data: sharing }
    ] = await Promise.all([
      supabase.from('trip_flights').select('*').eq('trip_id', id),
      supabase.from('trip_driving').select('*').eq('trip_id', id),
      supabase.from('trip_segments').select('*').eq('trip_id', id).order('sort_order'),
      supabase.from('trip_accommodations').select('*').eq('trip_id', id).order('check_in_date'),
      supabase.from('trip_days').select('*').eq('trip_id', id).order('date'),
      supabase.from('trip_activities').select('*').eq('trip_id', id).order('sort_order'),
      supabase.from('trip_media').select('*').eq('trip_id', id).order('sort_order'),
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
    const validSteps = ['basics', 'accommodations', 'segments', 'days_activities'];
    if (!step || !validSteps.includes(step)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid step. Must be one of: basics, accommodations, segments, days_activities',
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
    const currentProgress = existing.planning_progress || {
      basics: { auto_suggested: false, completed: false },
      accommodations: { auto_suggested: false, completed: false },
      segments: { auto_suggested: false, completed: false },
      days_activities: { auto_suggested: false, completed: false }
    };

    const updatedStepProgress: Record<string, unknown> = { ...currentProgress[step] };

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
      [step]: updatedStepProgress
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
        seat_assignments: flightData.seat_assignments,
        layovers: flightData.layovers,
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

    // Fetch and store photos (up to 20, deduped by content hash)
    let photosAdded = 0;
    let photosSkipped = 0;
    const photos = place.photos?.slice(0, 20) || [];

    // Get existing photo references AND content hashes to avoid duplicates
    // Check at TRIP level, not just segment level, to prevent same photo appearing for different segments
    const { data: existingPhotos } = await supabase
      .from('trip_media')
      .select('google_photo_reference, content_hash, file_url')
      .eq('trip_id', tripId);

    const existingRefs = new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) || []);
    const existingHashes = new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) || []);
    const existingUrls = new Set(existingPhotos?.map(p => p.file_url).filter(Boolean) || []);

    for (const photo of photos) {
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
        website: accommodationData.website,
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
    const updateData: Record<string, unknown> = {
      google_place_id: place.id,
      google_rating: place.rating,
      google_review_count: place.userRatingCount,
      google_price_level: place.priceLevel ? priceLevelMap[place.priceLevel] : undefined,
      opening_hours: openingHours,
      photos_fetched: true,
      // Extended Google Places fields
      google_editorial_summary: place.editorialSummary?.text,
      wheelchair_accessible: place.accessibilityOptions?.wheelchairAccessibleEntrance ?? place.accessibilityOptions?.wheelchairAccessibleSeating,
      good_for_children: place.goodForChildren,
      good_for_groups: place.goodForGroups,
      reservable: place.reservable,
      serves_breakfast: place.servesBreakfast,
      serves_lunch: place.servesLunch,
      serves_dinner: place.servesDinner,
      serves_brunch: place.servesBrunch,
      serves_vegetarian: place.servesVegetarianFood,
      dine_in: place.dineIn,
      takeout: place.takeout,
      delivery: place.delivery,
      outdoor_seating: place.outdoorSeating,
      serves_beer: place.servesBeer,
      serves_wine: place.servesWine,
      serves_cocktails: place.servesCocktails,
      live_music: place.liveMusic,
      allows_dogs: place.allowsDogs
    };

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

    // Fetch and store photos (up to 20, deduped by content hash)
    let photosAdded = 0;
    let photosSkipped = 0;
    const photos = place.photos?.slice(0, 20) || [];
    console.log(`[Google Photos] Activity: Place has ${place.photos?.length || 0} photos available, processing ${photos.length}`);

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

    for (const photo of photos) {
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

    const publicSlug = slug || trip.public_slug || crypto.randomBytes(8).toString('hex');
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
        share_url: `${process.env.FRONTEND_URL}/travel/public/${publicSlug}`
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

/**
 * GET /api/v1/travel/public/:slug
 * Get a public trip by slug
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

    // Check password if required
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

    // Get all related data
    const [
      { data: flights },
      { data: driving },
      { data: segments },
      { data: accommodations },
      { data: days },
      { data: activities },
      { data: media }
    ] = await Promise.all([
      supabase.from('trip_flights').select('*').eq('trip_id', trip.id),
      supabase.from('trip_driving').select('*').eq('trip_id', trip.id),
      supabase.from('trip_segments').select('*').eq('trip_id', trip.id).order('sort_order'),
      supabase.from('trip_accommodations').select('*').eq('trip_id', trip.id).order('check_in_date'),
      supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('date'),
      supabase.from('trip_activities').select('*').eq('trip_id', trip.id).order('sort_order'),
      supabase.from('trip_media').select('*').eq('trip_id', trip.id).order('sort_order')
    ]);

    res.json({
      success: true,
      data: {
        ...trip,
        share_password_hash: undefined, // Never expose password
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
    console.error('GET /travel/public/:slug error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

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
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const validateOnly = req.query.validate_only === 'true';
    const skipEnrichment = req.query.skip_enrichment === 'true';

    // 1. Verify trip ownership
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

    // 2. Get trip days
    const { data: days } = await supabase
      .from('trip_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('date', { ascending: true });

    if (!days || days.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No days found for this trip. Please generate days first.',
        timestamp: new Date().toISOString()
      });
    }

    // 3. Get segments
    const { data: segments } = await supabase
      .from('trip_segments')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_date', { ascending: true });

    // 4. Get accommodations
    const { data: accommodations } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date', { ascending: true });

    // 5. Get activities (research items converted to activities)
    const { data: activities } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_backup', false)
      .order('sort_order', { ascending: true });

    // 6. Get research items (for additional context)
    const { data: researchItems } = await supabase
      .from('trip_research_items')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_approved', true);

    // 6a. Get flights (for arrival/departure time validation)
    const { data: flights } = await supabase
      .from('trip_flights')
      .select('*')
      .eq('trip_id', tripId);

    // 6b. Pre-flight: Enrich activities with Google data if needed
    // Skips activities that already have google_data_fetched_at set
    let activitiesEnriched = 0;
    let activitiesSkipped = 0;
    if (!skipEnrichment && activities && activities.length > 0) {
      // Get Google API key from environment (GOOGLE_PLACES_API_KEY)
      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (googleApiKey) {
        const enrichResult = await ScheduleValidationService.enrichActivitiesWithGoogleData(
          tripId,
          userId,
          activities as any,
          googleApiKey
        );
        activitiesEnriched = enrichResult.enriched;
        activitiesSkipped = enrichResult.skipped;
        console.log(`[Enrichment] Added ${enrichResult.photosAdded} photos`);
        if (enrichResult.errors.length > 0) {
          console.log('Google enrichment warnings:', enrichResult.errors);
        }
        if (activitiesSkipped > 0) {
          console.log(`Skipped ${activitiesSkipped} activities (already enriched)`);
        }

        // Reload activities with updated Google data
        if (activitiesEnriched > 0) {
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
    await supabase
      .from('daily_schedule_items')
      .delete()
      .eq('trip_id', tripId);

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
        time_block: a.time_block,
        start_time: a.start_time,
        duration_minutes: a.duration_minutes || 60,
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
    // Get user's API key using AIAPIKeyService
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');

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
3. Account for travel time between locations (estimate based on driving/walking)
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

Generate a schedule that:
1. Assigns specific times to each activity based on their time_block (morning, afternoon, evening) and duration
2. Adds transit events between activities at different locations
3. Includes hotel check-in on arrival days and check-out on departure days
4. Adds meal breaks if not already included in activities
5. Includes reasonable buffer time between packed activities
6. CRITICAL: If flights are provided, ensure the first day starts AFTER the outbound flight arrival time + 60 min buffer, and the last day ends BEFORE the return flight departure - 2.5 hours

Return the complete schedule as a JSON array.`;

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      })
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json() as { error?: { message?: string } };
      console.error('Claude API error:', errorData);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate schedule with AI',
        details: errorData.error?.message,
        timestamp: new Date().toISOString()
      });
    }

    const claudeData = await claudeResponse.json() as { content: Array<{ text?: string }> };
    let scheduleJson: DaySchedule[];

    try {
      // Extract JSON from response
      const responseText = claudeData.content[0]?.text || '';
      // Try to find JSON in the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      scheduleJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse schedule JSON:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI-generated schedule',
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

    for (const daySchedule of scheduleJson) {
      const day = days.find((d: any) => d.id === daySchedule.day_id || d.date === daySchedule.date);
      if (!day) continue;

      const segment = segments?.find((s: any) => s.id === day.segment_id);

      for (const item of daySchedule.items) {
        // Validate research_item_id - only use it if it exists in our valid set
        const researchItemId = item.research_item_id && validResearchItemIds.has(item.research_item_id)
          ? item.research_item_id
          : null;

        scheduleItems.push({
          trip_id: tripId,
          day_id: day.id,
          segment_id: segment?.id || null,
          time_start: item.time_start,
          time_end: item.time_end,
          event_type: item.event_type,
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
    let insertedItemIds: string[] = [];
    if (scheduleItems.length > 0) {
      const { data: insertedItems, error: insertError } = await supabase
        .from('daily_schedule_items')
        .insert(scheduleItems)
        .select('id, day_id, time_start, time_end, event_type, title, location_name, location_lat, location_lng, research_item_id');

      if (insertError) {
        console.error('Error inserting schedule items:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to save schedule items',
          details: insertError.message,
          timestamp: new Date().toISOString()
        });
      }

      insertedItemIds = (insertedItems || []).map((i: any) => i.id);

      // 11. Post-assembly validation
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
    console.error('POST /travel/trips/:tripId/assemble-schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
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

export default router;
