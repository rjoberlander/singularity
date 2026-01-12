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

    // Fetch and store photos (up to 40, deduped by content hash)
    let photosAdded = 0;
    let photosSkipped = 0;
    const photos = place.photos?.slice(0, 40) || [];

    // Get existing photo references AND content hashes to avoid duplicates
    const { data: existingPhotos } = await supabase
      .from('trip_media')
      .select('google_photo_reference, content_hash')
      .eq('parent_type', 'segment')
      .eq('parent_id', segmentId);

    const existingRefs = new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) || []);
    const existingHashes = new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) || []);

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

        // Create TripMedia record with google_photo_reference and content_hash for dedup
        const attribution = photo.authorAttributions?.[0];
        await supabase
          .from('trip_media')
          .insert({
            trip_id: tripId,
            user_id: userId,
            parent_type: 'segment',
            parent_id: segmentId,
            file_url: urlData.publicUrl,
            media_type: 'image',
            width: photo.widthPx,
            height: photo.heightPx,
            is_google_sourced: true,
            approved: null,
            google_attribution_name: attribution?.displayName,
            google_attribution_uri: attribution?.uri,
            google_photo_reference: photo.name,
            content_hash: contentHash
          });

        // Add to existing sets to prevent duplicates within same batch
        existingRefs.add(photo.name);
        existingHashes.add(contentHash);
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
    }

    // Fetch and store photos (up to 40, deduped by content hash)
    let photosAdded = 0;
    let photosSkipped = 0;
    const photos = place.photos?.slice(0, 40) || [];
    console.log(`[Google Photos] Activity: Place has ${place.photos?.length || 0} photos available, processing ${photos.length}`);

    // Get existing photo references AND content hashes to avoid duplicates
    const { data: existingPhotos } = await supabase
      .from('trip_media')
      .select('google_photo_reference, content_hash')
      .eq('parent_type', 'activity')
      .eq('parent_id', activityId);

    const existingRefs = new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) || []);
    const existingHashes = new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) || []);

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

        // Create TripMedia record with google_photo_reference and content_hash for dedup
        const attribution = photo.authorAttributions?.[0];
        await supabase
          .from('trip_media')
          .insert({
            trip_id: tripId,
            user_id: userId,
            parent_type: 'activity',
            parent_id: activityId,
            file_url: urlData.publicUrl,
            media_type: 'image',
            width: photo.widthPx,
            height: photo.heightPx,
            is_google_sourced: true,
            approved: null,
            google_attribution_name: attribution?.displayName,
            google_attribution_uri: attribution?.uri,
            google_photo_reference: photo.name,
            content_hash: contentHash
          });

        // Add to existing sets to prevent duplicates within same batch
        existingRefs.add(photo.name);
        existingHashes.add(contentHash);
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

export default router;
