/**
 * Travel Import & Settings API Routes
 *
 * Part of the trip import workflow - see docs/travel-module-prd.md for full documentation.
 *
 * WORKFLOW OVERVIEW:
 *   1. User maintains Family Profile and Claude Instructions in travel_settings (this file)
 *   2. User researches in Claude.ai with deep research mode
 *   3. Claude outputs segment-X-research.json files
 *   4. User imports JSON via /travel/import endpoints (this file) -> creates trip_research_items
 *   5. User reviews/approves items in the app
 *   6. Approved items can be imported as trip_activities
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import {
  TravelSettings,
  TripImportPayload,
  TripImportOptions,
  TripImportResult,
  TripImportValidationResult,
  TripResearchItem,
  UpdateResearchItemRequest,
  ExpansionOutput,
  HotelResearchPayload,
  HotelOption,
} from '@singularity/shared-types';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
router.use(authenticateUser);

// =============================================
// TRAVEL SETTINGS
// =============================================

/**
 * GET /api/v1/travel/settings
 * Get the current user's travel settings
 */
router.get('/settings', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('travel_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Return null if no settings exist yet
    return res.json({
      success: true,
      data: data || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/v1/travel/settings
 * Create or update the user's travel settings
 */
router.put('/settings', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { claude_instructions, family_profile, output_template } = req.body;

    // Check if settings exist
    const { data: existing } = await supabase
      .from('travel_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let data, error;

    if (existing) {
      // Update existing
      const result = await supabase
        .from('travel_settings')
        .update({
          claude_instructions,
          family_profile,
          output_template,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from('travel_settings')
        .insert({
          user_id: userId,
          claude_instructions,
          family_profile,
          output_template,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/v1/travel/settings/claude-instructions
 * Update only the Claude instructions
 */
router.patch('/settings/claude-instructions', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { claude_instructions } = req.body;

    // Upsert
    const { data, error } = await supabase
      .from('travel_settings')
      .upsert(
        {
          user_id: userId,
          claude_instructions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/v1/travel/settings/family-profile
 * Update only the family profile
 */
router.patch('/settings/family-profile', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { family_profile } = req.body;

    // Upsert
    const { data, error } = await supabase
      .from('travel_settings')
      .upsert(
        {
          user_id: userId,
          family_profile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/v1/travel/settings/meal-preferences
 * Update only the meal research preferences
 */
router.patch('/settings/meal-preferences', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { meal_preferences } = req.body;

    const { data, error } = await supabase
      .from('travel_settings')
      .upsert(
        {
          user_id: userId,
          meal_preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================
// TRIP IMPORT
// =============================================

/**
 * POST /api/v1/travel/import
 *
 * Full import of Claude's research output.
 * Creates trip (optional), segment, days, and research items.
 *
 * Part of the trip import workflow - see docs/travel-module-prd.md
 */
router.post('/import', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const payload: TripImportPayload = req.body.payload;
    const options: TripImportOptions = req.body.options || {};

    // ── Sanitize family names in imported content ──
    // Research JSON may contain specific family names from the AI generation session
    // that don't match the actual user. Replace with generic references.
    try {
      const { data: settings } = await supabase
        .from('travel_settings')
        .select('family_profile')
        .eq('user_id', userId)
        .single();

      const actualFamilyName = (settings?.family_profile as any)?.family?.name;

      // Detect family names in the payload that aren't the user's actual name
      // Common patterns: "the X family", "the Xs", "X family"
      const payloadStr = JSON.stringify(payload);
      const familyNameRegex = /(?:the\s+)?(\b[A-Z][a-z]+)\s+family/g;
      const detectedNames = new Set<string>();
      let match;
      while ((match = familyNameRegex.exec(payloadStr)) !== null) {
        const name = match[1];
        // Skip if it matches actual family name, or is a common word
        if (name === actualFamilyName) continue;
        if (['Royal', 'Holy', 'Imperial', 'National', 'Local', 'Portuguese', 'Host'].includes(name)) continue;
        detectedNames.add(name);
      }

      if (detectedNames.size > 0) {
        console.log(`[Import] Sanitizing family names: ${[...detectedNames].join(', ')} → generic`);
        // Deep-replace all string values in the payload
        const sanitize = (obj: any): any => {
          if (typeof obj === 'string') {
            let result = obj;
            for (const name of detectedNames) {
              result = result.replace(new RegExp(`the ${name} family`, 'gi'), 'your family');
              result = result.replace(new RegExp(`The ${name} family`, 'g'), 'Your family');
              result = result.replace(new RegExp(`the ${name}s `, 'gi'), 'the family ');
              result = result.replace(new RegExp(`The ${name}s `, 'g'), 'The family ');
              result = result.replace(new RegExp(`${name} family`, 'gi'), 'the family');
            }
            return result;
          }
          if (Array.isArray(obj)) return obj.map(sanitize);
          if (obj && typeof obj === 'object') {
            const out: any = {};
            for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v);
            return out;
          }
          return obj;
        };
        Object.assign(payload, sanitize(payload));
      }
    } catch (sanitizeErr) {
      // Non-fatal — continue with import even if sanitization fails
      console.error('[Import] Family name sanitization error (non-fatal):', sanitizeErr);
    }

    // Set defaults
    const opts = {
      create_trip: options.trip_id ? false : true,
      create_segment: true,
      create_days: true,
      create_research_items: true,
      import_approved_as_activities: false,
      auto_approve_must_do: true,
      ...options,
    };

    let tripId = options.trip_id;
    let segmentId: string = '';
    const errors: string[] = [];
    const created = {
      trip: false,
      segment: false,
      days: 0,
      research_items: 0,
      activities: 0,
    };

    // ========================================
    // 1. Create or verify Trip
    // ========================================

    if (opts.create_trip && !tripId) {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          name: payload.metadata.trip_name,
          start_date: payload.metadata.dates.start,
          end_date: payload.metadata.dates.end,
          destination: payload.segment.location?.location_name || payload.segment.name,
          status: 'planning',
          traveler_count: 5, // Default, can be updated later
        })
        .select()
        .single();

      if (tripError) {
        return res.status(500).json({
          success: false,
          error: `Failed to create trip: ${tripError.message}`,
          timestamp: new Date().toISOString(),
        });
      }

      tripId = trip.id;
      created.trip = true;
    }

    if (!tripId) {
      return res.status(400).json({
        success: false,
        error: 'No trip_id provided and create_trip is false',
        timestamp: new Date().toISOString(),
      });
    }

    // ========================================
    // 2. Create or Update Segment
    // ========================================

    // If segment_id is provided, update existing segment instead of creating new one
    if (options.segment_id) {
      segmentId = options.segment_id;

      // CRITICAL: Validate dates match before proceeding with import
      const { data: existingSegment, error: fetchError } = await supabase
        .from('trip_segments')
        .select('id, name, start_date, end_date')
        .eq('id', segmentId)
        .single();

      if (fetchError) {
        return res.status(400).json({
          success: false,
          error: `Cannot find segment with ID ${segmentId}`,
          timestamp: new Date().toISOString(),
        });
      }

      const jsonStartDate = payload.metadata.dates.start;
      const jsonEndDate = payload.metadata.dates.end;
      const dbStartDate = existingSegment.start_date;
      const dbEndDate = existingSegment.end_date;

      // Calculate day counts
      const jsonDayCount = Math.ceil(
        (new Date(jsonEndDate).getTime() - new Date(jsonStartDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1; // +1 because both start and end dates are inclusive
      const segmentDayCount = Math.ceil(
        (new Date(dbEndDate).getTime() - new Date(dbStartDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // First check: Day counts MUST match - if not, cannot import at all
      if (jsonDayCount !== segmentDayCount) {
        return res.status(400).json({
          success: false,
          error: `DAY COUNT MISMATCH: Cannot import. JSON file has ${jsonDayCount} days but segment "${existingSegment.name}" has ${segmentDayCount} days. The number of days must match exactly. Please regenerate the JSON file with the correct number of days (${segmentDayCount} days: ${dbStartDate} to ${dbEndDate}).`,
          day_count_mismatch: {
            json_days: jsonDayCount,
            segment_days: segmentDayCount,
            json_dates: { start: jsonStartDate, end: jsonEndDate },
            segment_dates: { start: dbStartDate, end: dbEndDate },
            segment_name: existingSegment.name,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Second check: If day counts match but dates are different, allow date correction
      if (jsonStartDate !== dbStartDate || jsonEndDate !== dbEndDate) {
        return res.status(400).json({
          success: false,
          error: `DATE MISMATCH: JSON file has dates ${jsonStartDate} to ${jsonEndDate}, but segment "${existingSegment.name}" has dates ${dbStartDate} to ${dbEndDate}. The dates can be corrected since the day count matches (${segmentDayCount} days).`,
          date_mismatch: {
            json_dates: { start: jsonStartDate, end: jsonEndDate },
            segment_dates: { start: dbStartDate, end: dbEndDate },
            segment_name: existingSegment.name,
            day_count: segmentDayCount,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Process segment-level alternatives (no replaces field) - alternatives are at root level of payload
      const segmentAlternatives = payload.alternatives?.filter(
        (alt: any) => !alt.replaces || (!alt.replaces.scheduled_activity_id && !alt.replaces.scheduled_activity_name)
      ) || [];

      // Update the existing segment with the research data
      // IMPORTANT: Do NOT update dates - trip basics is the master plan
      // Only update research content (city_info, route_stops, etc.)
      const segmentData = {
        // name: payload.segment.name,  // Don't change name either - master plan owns it
        description: payload.segment.description,
        theme: payload.segment.theme,  // V3
        // start_date and end_date are NEVER updated - master plan owns these
        location_name: payload.segment.location?.location_name,
        latitude: payload.segment.location?.latitude,
        longitude: payload.segment.location?.longitude,
        timezone: payload.segment.location?.timezone,
        country: payload.segment.location?.country,
        country_code: payload.segment.location?.country_code,
        city_info: payload.segment.city_info,  // V3: now supports sections, culture, cuisine
        local_food: payload.segment.local_food,
        packing_list: payload.segment.packing_list,
        booking_priorities: payload.segment.booking_priorities,
        accommodation: payload.segment.accommodation,  // V3
        driving_from_previous: payload.segment.driving?.from_previous_segment,
        driving_notes: payload.segment.driving?.driving_notes,
        route_stops: payload.route_stops || null,  // Route stops along driving routes (at payload root level)
        segment_alternatives: segmentAlternatives.length > 0 ? segmentAlternatives : null,  // General backup activities
        research_status: 'completed',
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('trip_segments')
        .update(segmentData)
        .eq('id', segmentId);

      if (updateError) {
        errors.push(`Failed to update segment: ${updateError.message}`);
      } else {
        created.segment = true;
      }
    } else if (opts.create_segment) {
      // Process segment-level alternatives (no replaces field) - alternatives are at root level of payload
      const segmentAlternativesForCreate = payload.alternatives?.filter(
        (alt: any) => !alt.replaces || (!alt.replaces.scheduled_activity_id && !alt.replaces.scheduled_activity_name)
      ) || [];

      const segmentData = {
        trip_id: tripId,
        name: payload.segment.name,
        description: payload.segment.description,
        theme: payload.segment.theme,  // V3
        start_date: payload.metadata.dates.start,
        end_date: payload.metadata.dates.end,
        location_name: payload.segment.location?.location_name,
        latitude: payload.segment.location?.latitude,
        longitude: payload.segment.location?.longitude,
        timezone: payload.segment.location?.timezone,
        country: payload.segment.location?.country,
        country_code: payload.segment.location?.country_code,
        city_info: payload.segment.city_info,  // V3: now supports sections, culture, cuisine
        local_food: payload.segment.local_food,
        packing_list: payload.segment.packing_list,
        booking_priorities: payload.segment.booking_priorities,
        accommodation: payload.segment.accommodation,  // V3
        driving_from_previous: payload.segment.driving?.from_previous_segment,
        driving_notes: payload.segment.driving?.driving_notes,
        route_stops: payload.route_stops || null,  // Route stops along driving routes (at payload root level)
        segment_alternatives: segmentAlternativesForCreate.length > 0 ? segmentAlternativesForCreate : null,  // General backup activities
        sort_order: payload.metadata.segment_number,
      };

      const { data: segment, error: segmentError } = await supabase
        .from('trip_segments')
        .insert(segmentData)
        .select()
        .single();

      if (segmentError) {
        errors.push(`Failed to create segment: ${segmentError.message}`);
      } else {
        segmentId = segment.id;
        created.segment = true;
      }
    }

    // ========================================
    // 3. Create Days
    // ========================================

    // Handle both v2 (array) and v3 (nested { days: [...] }) formats
    const importDays = Array.isArray(payload.days)
      ? payload.days
      : (payload.days as any)?.days || [];

    if (opts.create_days && importDays.length > 0) {
      // First, delete existing days for this segment to avoid duplicates
      // Also clean up orphaned days (null segment_id) for the same dates
      const datesToCleanup = importDays.map((d: any) => d.date).filter(Boolean);

      if (segmentId) {
        // Get existing days for this segment
        const { data: existingDays } = await supabase
          .from('trip_days')
          .select('id')
          .eq('segment_id', segmentId);

        if (existingDays && existingDays.length > 0) {
          const existingDayIds = existingDays.map((d: { id: string }) => d.id);

          // Delete activities for these days first (but keep backup activities - they're segment-level)
          const { error: deleteActivitiesError } = await supabase
            .from('trip_activities')
            .delete()
            .in('day_id', existingDayIds)
            .eq('is_backup', false);  // Only delete non-backup activities linked to days

          if (deleteActivitiesError) {
            console.warn('Failed to delete existing activities:', deleteActivitiesError.message);
          }

          // Delete existing days
          const { error: deleteDaysError } = await supabase
            .from('trip_days')
            .delete()
            .eq('segment_id', segmentId);

          if (deleteDaysError) {
            console.warn('Failed to delete existing days:', deleteDaysError.message);
          }
        }

        // Delete existing backup activities (alternatives) for this segment
        // They will be recreated from the import
        const { error: deleteBackupActivitiesError } = await supabase
          .from('trip_activities')
          .delete()
          .eq('segment_id', segmentId)
          .eq('is_backup', true);

        if (deleteBackupActivitiesError) {
          console.warn('Failed to delete existing backup activities:', deleteBackupActivitiesError.message);
        }

        // Delete existing research items for this segment
        // They will be recreated from the import
        const { error: deleteResearchError } = await supabase
          .from('trip_research_items')
          .delete()
          .eq('segment_id', segmentId);

        if (deleteResearchError) {
          console.warn('Failed to delete existing research items:', deleteResearchError.message);
        }
      }

      // Also clean up orphaned days (null segment_id) for the same dates in this trip
      if (datesToCleanup.length > 0) {
        const { data: orphanedDays } = await supabase
          .from('trip_days')
          .select('id')
          .eq('trip_id', tripId)
          .is('segment_id', null)
          .in('date', datesToCleanup);

        if (orphanedDays && orphanedDays.length > 0) {
          const orphanedDayIds = orphanedDays.map((d: { id: string }) => d.id);

          // Delete activities for orphaned days
          await supabase
            .from('trip_activities')
            .delete()
            .in('day_id', orphanedDayIds);

          // Delete orphaned days
          await supabase
            .from('trip_days')
            .delete()
            .eq('trip_id', tripId)
            .is('segment_id', null)
            .in('date', datesToCleanup);
        }
      }

      const daysData = importDays.map((day: any) => ({
        trip_id: tripId,
        segment_id: segmentId || null,
        date: day.date,
        day_number: day.day_number,
        title: day.title,
        theme: day.theme,
        overview: day.overview,
        weather_high_c: day.weather?.high_c,
        weather_low_c: day.weather?.low_c,
        weather_conditions: day.weather?.conditions,
        photo_opportunities: day.photo_opportunities,
        notes: day.notes,
        sort_order: day.day_number,
        // V3 fields
        schedule: day.schedule,  // V3: time-based schedule items
        meals: day.meals,  // V3: structured meal plans
        logistics: day.logistics,  // V3: driving, parking, tickets
        backup_plan: day.backup_plan,  // V3: if_rain, if_tired, if_kids_meltdown
      }));

      const { data: days, error: daysError } = await supabase
        .from('trip_days')
        .insert(daysData)
        .select();

      if (daysError) {
        errors.push(`Failed to create some days: ${daysError.message}`);
      } else if (days) {
        created.days = days.length;

        // ========================================
        // 3b. Create Activities from Schedule Items
        // ========================================
        // Convert V3 schedule items to activities
        for (const day of days) {
          const originalDay = importDays.find((d: any) => d.day_number === day.day_number);
          const scheduleItems = originalDay?.schedule;

          if (scheduleItems && Array.isArray(scheduleItems) && scheduleItems.length > 0) {
            // Get research_items to match against schedule items
            const researchItems = payload.research_items || [];

            const activitiesData = scheduleItems.map((item: any, idx: number) => {
              // Parse time like "9:20am", "10:15am", "15:30", or "3:00" to 24h format.
              // When the input omits am/pm, infer the period from:
              //   1. 24-hour format (hours > 12): keep as-is
              //   2. Activity-name heuristics: meals & afternoon keywords → PM; wake/breakfast → AM
              //   3. Fallback: if 1 ≤ hours ≤ 7 and no morning keyword, assume PM (itineraries rarely schedule 1–7 AM)
              let startTime: string | null = null;
              const timeMatch = item.time?.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
              if (timeMatch) {
                let hours = parseInt(timeMatch[1], 10);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
                const period = timeMatch[3]?.toLowerCase();

                if (period === 'pm' && hours !== 12) {
                  hours += 12;
                } else if (period === 'am' && hours === 12) {
                  hours = 0;
                } else if (!period && hours <= 12) {
                  // Ambiguous 12-hour input — infer from activity name context.
                  // (See also: scripts/fix-portugal-trip.mjs for the matching
                  // data-cleanup rules applied to previously-imported trips.)
                  const nameLower = (item.activity_name || '').toLowerCase();
                  const isMorning =
                    /\b(wake|breakfast|morning|sunrise|dawn|check.?out|checkout|depart|airport|flight|early|load\s+car|pack)\b/.test(nameLower);
                  const isStrongEvening =
                    /\b(dinner|supper|sunset|sundown|evening|night|bedtime|golden\s+hour|late\s+(cruise|dinner|lunch|walk))\b/.test(nameLower);
                  const isAfternoon =
                    /\b(lunch|afternoon|siesta|nap|rest|rest\/nap|check.?in|check-in|return\s+to|back\s+to\s+hotel)\b/.test(nameLower);

                  if (isStrongEvening) {
                    if (hours !== 12) hours += 12;
                  } else if (isMorning) {
                    if (hours === 12) hours = 0; // 12:xx AM → 00:xx
                  } else if (isAfternoon && hours >= 1 && hours <= 7) {
                    // Afternoon keyword only shifts hours 1-7; 8-11 are
                    // ambiguous (9am pool / 9pm pool both plausible).
                    hours += 12;
                  } else if (hours >= 1 && hours <= 4) {
                    // Hours 1-4 AM are essentially never scheduled — assume PM
                    hours += 12;
                  }
                  // Otherwise (hours 5-11 with no evidence, or hours 12) leave as-is
                }
                startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              }

              // Map activity_type to our categories
              const activityTypeMap: Record<string, string> = {
                'main_activity': 'activity',
                'meal': 'restaurant',
                'rest': 'downtime',
                'transport': 'transport',
                'free_time': 'downtime',
                'activity': 'activity',
                'attraction': 'activity',
                'restaurant': 'restaurant',
              };

              // Infer activity type (category + sub_type) from activity name if not provided
              const inferActivityType = (name: string): { category: string; sub_type: string | null } => {
                const nameLower = name.toLowerCase();
                // Restaurant/meals — infer meal sub_type
                if (nameLower.includes('lunch') || nameLower.includes('dinner') ||
                    nameLower.includes('breakfast') || nameLower.includes('meal') ||
                    nameLower.includes('snack') || nameLower.includes('eat') ||
                    nameLower.includes('restaurant') || nameLower.includes('café') ||
                    nameLower.includes('cafe') || nameLower.includes('gelato') ||
                    nameLower.includes('pastéis') || nameLower.includes('pasteis')) {
                  let sub_type: string = 'other';
                  if (nameLower.includes('breakfast') || nameLower.includes('morning')) sub_type = 'breakfast';
                  else if (nameLower.includes('lunch') || nameLower.includes('midday')) sub_type = 'lunch';
                  else if (nameLower.includes('dinner') || nameLower.includes('supper')) sub_type = 'dinner';
                  else if (nameLower.includes('snack') || nameLower.includes('gelato') || nameLower.includes('ice cream') || nameLower.includes('pastry') || nameLower.includes('pastéis') || nameLower.includes('pasteis')) sub_type = 'snack';
                  else if (nameLower.includes('coffee') || nameLower.includes('café') || nameLower.includes('cafe') || nameLower.includes('espresso')) sub_type = 'coffee';
                  return { category: 'restaurant', sub_type };
                }
                // Logistics — check-in/out, packing
                if (nameLower.includes('check out') || nameLower.includes('checkout')) {
                  return { category: 'logistics', sub_type: 'check_out' };
                }
                if (nameLower.includes('check in') || nameLower.includes('checkin')) {
                  return { category: 'logistics', sub_type: 'check_in' };
                }
                if (nameLower.includes('pack') || nameLower.includes('luggage') || nameLower.includes('load car')) {
                  return { category: 'logistics', sub_type: 'packing' };
                }
                // Transport — infer sub_type
                if (nameLower.includes('drive') || nameLower.includes('depart') ||
                    nameLower.includes('arrive') || nameLower.includes('return to') ||
                    nameLower.includes('flight') || nameLower.includes('taxi') ||
                    nameLower.includes('uber') || nameLower.includes('transfer')) {
                  let sub_type: string = 'local';
                  if (nameLower.includes('drive') || nameLower.includes('depart') || nameLower.includes('road trip') || nameLower.includes('return to')) sub_type = 'long_haul';
                  else if (nameLower.includes('flight') || nameLower.includes('fly') || nameLower.includes('airport')) sub_type = 'flight';
                  else if (nameLower.includes('ferry') || nameLower.includes('boat')) sub_type = 'ferry';
                  else if (nameLower.includes('train') || nameLower.includes('rail') || nameLower.includes('metro')) sub_type = 'train';
                  else if (nameLower.includes('walk') || nameLower.includes('stroll') || nameLower.includes('on foot')) sub_type = 'walking';
                  return { category: 'transport', sub_type };
                }
                // Downtime — rest, relaxation, pool
                if (nameLower.includes('rest') || nameLower.includes('nap') ||
                    nameLower.includes('sleep') || nameLower.includes('relax') ||
                    nameLower.includes('downtime') || nameLower.includes('free time')) {
                  let sub_type: string = 'rest';
                  if (nameLower.includes('pool')) sub_type = 'pool';
                  else if (nameLower.includes('relax')) sub_type = 'relaxation';
                  return { category: 'downtime', sub_type };
                }
                if (nameLower.includes('pool time') || nameLower.includes('pool')) {
                  return { category: 'downtime', sub_type: 'pool' };
                }
                // Activity sub-types
                if (nameLower.includes('beach') || nameLower.includes('praia') ||
                    nameLower.includes('swimming') || nameLower.includes('swim')) {
                  return { category: 'activity', sub_type: 'beach' };
                }
                if (nameLower.includes('hike') || nameLower.includes('trail') || nameLower.includes('cliff walk')) {
                  return { category: 'activity', sub_type: 'hike' };
                }
                if (nameLower.includes('sunset') || nameLower.includes('viewpoint') ||
                    nameLower.includes('photo') || nameLower.includes('vista') || nameLower.includes('miradouro')) {
                  return { category: 'activity', sub_type: 'viewpoint' };
                }
                if (nameLower.includes('kayak') || nameLower.includes('paddleboard') ||
                    nameLower.includes('surf') || nameLower.includes('snorkel')) {
                  return { category: 'activity', sub_type: 'water_sport' };
                }
                if (nameLower.includes('museum') || nameLower.includes('gallery')) {
                  return { category: 'activity', sub_type: 'museum' };
                }
                if (nameLower.includes('tour') || nameLower.includes('guided')) {
                  return { category: 'activity', sub_type: 'tour' };
                }
                if (nameLower.includes('shop') || nameLower.includes('market') || nameLower.includes('bazaar')) {
                  return { category: 'activity', sub_type: 'shopping' };
                }
                if (nameLower.includes('fortress') || nameLower.includes('castle') ||
                    nameLower.includes('palace') || nameLower.includes('monument') || nameLower.includes('church')) {
                  return { category: 'activity', sub_type: 'sightseeing' };
                }
                if (nameLower.includes('boat') || nameLower.includes('horseback') || nameLower.includes('horse riding')) {
                  return { category: 'activity', sub_type: nameLower.includes('horse') ? 'horseback' : 'outdoor' };
                }
                return { category: 'activity', sub_type: 'other' };
              };

              // Try to find matching research_item for rich content
              // Use fuzzy word-based matching to handle name variations
              const activityNameLower = (item.activity_name || '').toLowerCase();
              const locationLower = (item.location || '').toLowerCase();

              // Helper function for fuzzy word matching
              const fuzzyMatch = (str1: string, str2: string): boolean => {
                // First try exact substring match
                if (str1.includes(str2) || str2.includes(str1)) {
                  return true;
                }
                // Extract significant words (skip common Portuguese articles/prepositions)
                const stopWords = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'the', 'of', 'and', 'in', 'at', 'to', '&']);
                const getWords = (s: string) => s.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

                const words1 = getWords(str1);
                const words2 = getWords(str2);

                if (words1.length === 0 || words2.length === 0) return false;

                // Count matching words
                const matchingWords = words1.filter(w1 =>
                  words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))
                );

                // Match if at least 60% of the smaller word set matches
                const minWords = Math.min(words1.length, words2.length);
                return matchingWords.length >= minWords * 0.6;
              };

              // Match against research items. Prefer activity-name matches.
              // Location-based fallback is restricted to restaurant/meal activities,
              // because transit/rest/sleep activities share location names with nearby
              // points of interest (e.g. "Walk to Jerónimos" in "Belém" must NOT inherit
              // the Tower of Belém's content, and "REST/NAP" at a Lagos hotel must NOT
              // inherit a Benagil boat tour's content).
              const mealNamePattern = /\b(lunch|dinner|breakfast|meal|snack|eat|restaurant|café|cafe|gelato|pastéis|pasteis|brunch|coffee)\b/i;
              const isMealActivity =
                item.activity_type === 'meal' ||
                item.activity_type === 'restaurant' ||
                mealNamePattern.test(item.activity_name || '');

              // First pass: exact/fuzzy match on the activity name
              let matchedResearch = researchItems.find((r: any) => {
                const researchNameLower = (r.name || '').toLowerCase();
                return activityNameLower && fuzzyMatch(activityNameLower, researchNameLower);
              });
              // Second pass (meals only): allow location-based fallback
              if (!matchedResearch && isMealActivity && locationLower) {
                matchedResearch = researchItems.find((r: any) => {
                  const researchNameLower = (r.name || '').toLowerCase();
                  return fuzzyMatch(locationLower, researchNameLower);
                });
              }

              // Determine activity type - use explicit type, then infer from name
              let activityCategory: string;
              let activitySubType: string | null = null;
              if (item.activity_type) {
                activityCategory = activityTypeMap[item.activity_type] || 'activity';
                // Infer sub_type even when category is explicit
                const inferred = inferActivityType(item.activity_name || '');
                if (inferred.category === activityCategory) {
                  activitySubType = inferred.sub_type;
                }
              } else {
                const inferred = inferActivityType(item.activity_name || '');
                activityCategory = inferred.category;
                activitySubType = inferred.sub_type;
              }

              // Build activity data with rich content if available
              const activityData: any = {
                trip_id: tripId,
                segment_id: segmentId || null,
                day_id: day.id,
                name: item.activity_name,
                activity_type: activityCategory,
                activity_sub_type: activitySubType,
                location_name: item.location,
                start_time: startTime,
                description: item.notes,
                sort_order: idx,
              };

              // Add rich content from matched research_item
              if (matchedResearch) {
                if (matchedResearch.deep_dive) {
                  activityData.deep_dive = matchedResearch.deep_dive;
                }
                if (matchedResearch.kid_engagement) {
                  activityData.kid_engagement = matchedResearch.kid_engagement;
                }
                if (matchedResearch.source_url) {
                  activityData.booking_url = matchedResearch.source_url;
                }
                // Store why_relevant in why_its_great column
                if (matchedResearch.why_relevant) {
                  const whyRelevant = matchedResearch.why_relevant as any;
                  activityData.why_its_great = typeof whyRelevant === 'string'
                    ? whyRelevant
                    : (whyRelevant.for_family || whyRelevant.unique_value || JSON.stringify(whyRelevant));
                }
                if (matchedResearch.location) {
                  activityData.latitude = matchedResearch.location.latitude;
                  activityData.longitude = matchedResearch.location.longitude;
                  activityData.address = matchedResearch.location.address;
                  activityData.google_maps_url = matchedResearch.location.google_maps_url;
                }
                // Build restaurant_details from research item's flat fields
                if (matchedResearch.cuisine_type || matchedResearch.signature_dishes || matchedResearch.ambience || matchedResearch.dietary_options) {
                  activityData.restaurant_details = {
                    ...(matchedResearch.cuisine_type ? { cuisine_type: matchedResearch.cuisine_type } : {}),
                    ...(matchedResearch.signature_dishes ? { signature_dishes: matchedResearch.signature_dishes.map((d: string) => ({ name: d, description: '', source: 'imported' as const })) } : {}),
                    ...(matchedResearch.ambience ? { ambience: matchedResearch.ambience } : {}),
                    ...(matchedResearch.dietary_options ? { dietary_options: matchedResearch.dietary_options } : {}),
                  };
                }
              }

              return activityData;
            });

            const { data: activities, error: activitiesError } = await supabase
              .from('trip_activities')
              .insert(activitiesData)
              .select();

            if (activitiesError) {
              errors.push(`Failed to create activities for day ${day.day_number}: ${activitiesError.message}`);
            } else if (activities) {
              created.activities += activities.length;
            }
          }
        }
      }
    }

    // ========================================
    // 3b. Create Alternative Activities (linked to main activities)
    // ========================================

    // Process alternatives that have a 'replaces' field linking them to specific activities
    // Alternatives are at root level of payload
    const linkedAlternatives = payload.alternatives?.filter(
      (alt: any) => alt.replaces && (alt.replaces.scheduled_activity_id || alt.replaces.scheduled_activity_name)
    ) || [];

    if (linkedAlternatives.length > 0 && tripId) {
      // Get all activities for this segment to match alternatives by name
      const { data: segmentActivities } = await supabase
        .from('trip_activities')
        .select('id, name')
        .eq('trip_id', tripId);

      const activityNameToId = new Map(
        segmentActivities?.map((a: { id: string; name: string }) => [a.name.toLowerCase(), a.id]) || []
      );

      // Helper to check if a string is a valid UUID
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      for (const alt of linkedAlternatives) {
        // Check if this alternative already exists
        const { data: existingLinkedAlt } = await supabase
          .from('trip_activities')
          .select('id')
          .eq('trip_id', tripId)
          .eq('name', alt.name)
          .eq('is_backup', true)
          .maybeSingle();

        if (existingLinkedAlt) {
          continue; // Skip if already exists
        }

        // Find the activity this alternative replaces
        let alternateToId: string | null = null;
        if (alt.replaces?.scheduled_activity_id && isUuid(alt.replaces.scheduled_activity_id)) {
          // Valid UUID - use it directly
          alternateToId = alt.replaces.scheduled_activity_id;
        } else if (alt.replaces?.scheduled_activity_name) {
          // Look up by name
          alternateToId = activityNameToId.get(alt.replaces.scheduled_activity_name.toLowerCase()) || null;
        } else if (alt.replaces?.scheduled_activity_id) {
          // Non-UUID ID (like "sagres-boat-tour-grotto") - try to match to research item and find activity
          // Look for an activity with similar name pattern
          const idToMatch = alt.replaces.scheduled_activity_id.toLowerCase();
          for (const [name, id] of activityNameToId.entries()) {
            // Check if the name contains significant parts of the ID (ignore prefixes like "sagres-")
            const idParts = idToMatch.split('-').filter(p => p.length > 3);
            if (idParts.some(part => name.includes(part))) {
              alternateToId = id;
              break;
            }
          }
        }

        // Create the alternative activity
        // Map priority to valid database values: must_do, recommended, optional, if_time
        const activityPriorityMap: Record<string, string> = {
          'must_do': 'must_do',
          'recommended': 'recommended',
          'optional': 'optional',
          'if_time': 'if_time',
          'alternative': 'optional',  // alternatives default to optional
          'backup': 'optional',
          'should_do': 'recommended',
          'could_do': 'optional',
        };
        const mappedPriority = alt.priority ? (activityPriorityMap[alt.priority.toLowerCase()] || 'optional') : 'optional';

        const alternativeActivityData: any = {
          trip_id: tripId,
          segment_id: segmentId || null,
          name: alt.name,
          activity_type: alt.item_type || 'activity',
          is_backup: true,
          alternate_to_activity_id: alternateToId,
          alternative_type: 'direct_replacement',
          alternative_trigger: alt.trigger,
          why_not_scheduled: alt.why_not_scheduled,
          priority: mappedPriority,
          sort_order: 999,  // Sort alternatives at end
        };

        // Add location if provided
        if (alt.location) {
          alternativeActivityData.location_name = alt.location.area;
          alternativeActivityData.address = alt.location.address;
          alternativeActivityData.latitude = alt.location.latitude;
          alternativeActivityData.longitude = alt.location.longitude;
          alternativeActivityData.google_maps_url = alt.location.google_maps_url;
        }

        // Add rich content if provided
        if (alt.deep_dive) {
          alternativeActivityData.deep_dive = alt.deep_dive;
        }
        if (alt.kid_engagement) {
          alternativeActivityData.kid_engagement = alt.kid_engagement;
        }
        if (alt.practical) {
          alternativeActivityData.practical_details = {
            hours: alt.practical.hours,
            time_needed: alt.practical.time_needed,
          };
        }

        const { error: altError } = await supabase
          .from('trip_activities')
          .insert(alternativeActivityData);

        if (altError) {
          errors.push(`Failed to create alternative activity "${alt.name}": ${altError.message}`);
        } else {
          created.activities++;
        }
      }
    }

    // ========================================
    // 3c. Create General Alternative Activities (not linked to specific activities)
    // ========================================
    const generalAlternatives = payload.alternatives?.filter(
      (alt: any) => !alt.replaces || (!alt.replaces.scheduled_activity_id && !alt.replaces.scheduled_activity_name)
    ) || [];

    if (generalAlternatives.length > 0 && tripId) {
      for (const alt of generalAlternatives) {
        // Check if this alternative already exists as an activity
        const { data: existingAlt } = await supabase
          .from('trip_activities')
          .select('id')
          .eq('trip_id', tripId)
          .eq('name', alt.name)
          .eq('is_backup', true)
          .maybeSingle();

        if (existingAlt) {
          continue; // Skip if already exists
        }

        // Map priority to valid database values: must_do, recommended, optional, if_time
        const activityPriorityMap: Record<string, string> = {
          'must_do': 'must_do',
          'recommended': 'recommended',
          'optional': 'optional',
          'if_time': 'if_time',
          'alternative': 'optional',
          'backup': 'optional',
          'should_do': 'recommended',
          'could_do': 'optional',
        };
        const mappedPriority = alt.priority ? (activityPriorityMap[alt.priority.toLowerCase()] || 'optional') : 'optional';

        const generalAltData: any = {
          trip_id: tripId,
          segment_id: segmentId || null,
          name: alt.name,
          activity_type: alt.item_type || 'activity',
          is_backup: true,
          alternate_to_activity_id: null, // General alternative, not linked to specific activity
          alternative_type: 'general_option',
          alternative_trigger: alt.trigger,
          why_not_scheduled: alt.why_not_scheduled,
          priority: mappedPriority,
          sort_order: 999,
        };

        // Add location if provided
        if (alt.location) {
          generalAltData.location_name = alt.location.area;
          generalAltData.address = alt.location.address;
          generalAltData.latitude = alt.location.latitude;
          generalAltData.longitude = alt.location.longitude;
          generalAltData.google_maps_url = alt.location.google_maps_url;
        }

        // Add rich content if provided
        if (alt.deep_dive) {
          generalAltData.deep_dive = alt.deep_dive;
        }
        if (alt.kid_engagement) {
          generalAltData.kid_engagement = alt.kid_engagement;
        }
        if (alt.practical) {
          generalAltData.practical_details = {
            hours: alt.practical.hours,
            time_needed: alt.practical.time_needed,
          };
        }

        const { error: genAltError } = await supabase
          .from('trip_activities')
          .insert(generalAltData);

        if (genAltError) {
          errors.push(`Failed to create general alternative "${alt.name}": ${genAltError.message}`);
        } else {
          created.activities++;
        }
      }
    }

    // ========================================
    // 4. Create Research Items
    // ========================================

    if (opts.create_research_items && payload.research_items?.length > 0) {
      // Normalize item_type to valid database values
      const normalizeItemType = (type: string): string => {
        const validTypes = [
          'restaurant', 'hike', 'attraction', 'beach', 'hotel',
          'activity', 'shop', 'service', 'viewpoint', 'transport'
        ];
        const typeMap: Record<string, string> = {
          'accommodation': 'hotel',
          'museum': 'attraction',
          'tour': 'activity',
          'experience': 'activity',
          'neighborhood': 'attraction',
          'landmark': 'attraction',
          'site': 'attraction',
          'park': 'attraction',
          'winery': 'restaurant',
          'cafe': 'restaurant',
          'bar': 'restaurant',
        };
        const normalized = type?.toLowerCase() || 'attraction';
        if (validTypes.includes(normalized)) return normalized;
        return typeMap[normalized] || 'attraction';
      };

      // Normalize priority to valid database values
      const normalizePriority = (priority: string): string => {
        const validPriorities = ['must_do', 'recommended', 'optional', 'backup', 'if_time'];
        const priorityMap: Record<string, string> = {
          'alternative': 'backup',
          'must-do': 'must_do',
          'mustdo': 'must_do',
          'required': 'must_do',
          'essential': 'must_do',
          'nice_to_have': 'optional',
          'nice-to-have': 'optional',
          'low': 'if_time',
        };
        const normalized = priority?.toLowerCase() || 'recommended';
        if (validPriorities.includes(normalized)) return normalized;
        return priorityMap[normalized] || 'recommended';
      };

      const itemsData = payload.research_items.map((item) => ({
        trip_id: tripId,
        segment_id: segmentId || null,

        // Required - normalize item_type to valid database values
        item_type: normalizeItemType(item.item_type),
        name: item.name,
        source_url: item.source_url,
        // Default source_name if missing
        source_name: item.source_name || 'Claude Research Agent',
        why_relevant: item.why_relevant,

        // Classification - normalize priority to valid database values
        category: item.category,
        priority: normalizePriority(item.priority || ''),
        status:
          opts.auto_approve_must_do && normalizePriority(item.priority || '') === 'must_do' ? 'approved' : 'unprocessed',

        // V3 Location (structured) - takes precedence
        location: item.location,
        // Legacy location fields (fallback)
        location_name: item.location?.area || item.location_name,
        address: item.location?.address || item.address,
        latitude: item.location?.latitude || item.latitude,
        longitude: item.location?.longitude || item.longitude,
        google_maps_url: item.location?.google_maps_url || item.google_maps_url,
        google_place_id: item.google_place_id,

        // V3 Ratings (structured)
        ratings: item.ratings,
        // Legacy quality fields
        rating: item.ratings?.score || item.rating,
        review_count: item.ratings?.count || item.review_count,
        review_summary: item.review_summary,
        price_level: item.price_level,

        // V3 Deep Dive (complete structured content)
        deep_dive: item.deep_dive,

        // V3 Kid Engagement (named children with scripts)
        kid_engagement: item.kid_engagement,
        // Legacy family fields
        kid_friendly: item.kid_friendly,
        min_age: item.min_age,
        stroller_friendly: item.stroller_friendly,

        // V3 Practical (structured)
        practical: item.practical,
        // Legacy practical fields
        hours_text: item.practical?.hours || item.hours_text,
        cost_estimate_text: item.practical?.cost?.description || item.cost_estimate_text,
        cost_estimate_value: item.cost_estimate_value,
        cost_currency: item.cost_currency || 'EUR',
        reservation_required: item.practical?.reservation?.required || item.reservation_required,
        booking_url: item.practical?.reservation?.url || item.booking_url,
        website: item.website,
        phone: item.phone,

        // V3 Photo opportunities
        photo_opportunities: item.photo_opportunities,

        // Type-specific details stored in JSONB columns per the 022 migration
        // Hike details
        hike_details: item.item_type === 'hike' ? {
          alltrails_url: item.alltrails_url,
          distance_km: item.distance_km,
          elevation_gain_m: item.elevation_gain_m,
          difficulty: item.difficulty,
          trail_type: item.trail_type,
          shaded: item.shaded,
          trail_surface: item.trail_surface,
        } : undefined,

        // Restaurant details
        restaurant_details: item.item_type === 'restaurant' ? {
          cuisine_type: item.cuisine_type,
          signature_dishes: item.signature_dishes,
          ambience: item.ambience,
          dietary_options: item.dietary_options,
        } : undefined,

        // Beach details
        beach_details: item.item_type === 'beach' ? {
          water_conditions: item.water_conditions,
          facilities: item.facilities,
          parking_notes: item.parking_notes,
        } : undefined,

        // Attraction/historical context (per 022 migration schema)
        historical_context: item.historical_context,
        what_to_see: item.what_to_see,

        // V3 Assignment with specific time
        assigned_day: item.assigned_day,
        assigned_time: item.assigned_time,  // V3: specific time like "9:00-11:00am"
        assigned_time_block: item.assigned_time_block,  // Legacy
        assigned_date: item.assigned_date,

        // Additional
        additional_sources: item.additional_sources,
        raw_data: item.raw_data,
      }));

      const { data: items, error: itemsError } = await supabase
        .from('trip_research_items')
        .insert(itemsData)
        .select();

      if (itemsError) {
        errors.push(`Failed to create some research items: ${itemsError.message}`);
      } else if (items) {
        created.research_items = items.length;
      }
    }

    // ========================================
    // 5. Optionally import must_do items as activities
    // ========================================

    if (opts.import_approved_as_activities && segmentId) {
      // Get the created days for mapping
      const { data: tripDays } = await supabase
        .from('trip_days')
        .select('id, day_number, date')
        .eq('segment_id', segmentId);

      const dayMap = new Map(tripDays?.map((d) => [d.day_number, d.id]) || []);

      // Get approved research items
      const { data: approvedItems } = await supabase
        .from('trip_research_items')
        .select('*')
        .eq('segment_id', segmentId)
        .eq('status', 'approved');

      if (approvedItems && approvedItems.length > 0) {
        for (const item of approvedItems) {
          if (item.assigned_day && dayMap.has(item.assigned_day)) {
            const dayId = dayMap.get(item.assigned_day);

            // Import to activity using the database function
            const { error: importError } = await supabase.rpc('import_research_item_to_activity', {
              p_research_item_id: item.id,
              p_day_id: dayId,
            });

            if (!importError) {
              created.activities++;
            }
          }
        }
      }
    }

    // ========================================
    // Return Result
    // ========================================

    return res.json({
      success: errors.length === 0,
      trip_id: tripId,
      segment_id: segmentId,
      created,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    } as TripImportResult & { timestamp: string });
  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/travel/import/validate
 *
 * Validate a research JSON before importing.
 * Returns any issues found.
 */
router.post('/import/validate', async (req: Request, res: Response): Promise<any> => {
  try {
    const payload: TripImportPayload = req.body;
    const { segment_id } = req.query;  // Optional: validate against existing segment
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check metadata
    if (!payload.metadata) {
      issues.push('Missing metadata section');
    } else {
      if (!payload.metadata.trip_name) issues.push('Missing metadata.trip_name');
      if (!payload.metadata.dates?.start) issues.push('Missing metadata.dates.start');
      if (!payload.metadata.dates?.end) issues.push('Missing metadata.dates.end');
    }

    // Check segment
    if (!payload.segment) {
      issues.push('Missing segment section');
    } else {
      if (!payload.segment.name) issues.push('Missing segment.name');
    }

    // CRITICAL: Validate dates against existing segment if segment_id provided
    if (segment_id && payload.metadata?.dates) {
      const { data: existingSegment, error: segmentError } = await supabase
        .from('trip_segments')
        .select('id, name, start_date, end_date')
        .eq('id', segment_id)
        .single();

      if (segmentError) {
        issues.push(`Cannot find segment with ID ${segment_id}`);
      } else if (existingSegment) {
        const jsonStartDate = payload.metadata.dates.start;
        const jsonEndDate = payload.metadata.dates.end;
        const dbStartDate = existingSegment.start_date;
        const dbEndDate = existingSegment.end_date;

        // Calculate day counts
        const jsonDayCount = Math.ceil(
          (new Date(jsonEndDate).getTime() - new Date(jsonStartDate).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
        const segmentDayCount = Math.ceil(
          (new Date(dbEndDate).getTime() - new Date(dbStartDate).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        if (jsonDayCount !== segmentDayCount) {
          issues.push(
            `DAY COUNT MISMATCH: JSON has ${jsonDayCount} days but segment "${existingSegment.name}" has ${segmentDayCount} days. ` +
            `Cannot import - please regenerate JSON with ${segmentDayCount} days (${dbStartDate} to ${dbEndDate}).`
          );
        } else if (jsonStartDate !== dbStartDate || jsonEndDate !== dbEndDate) {
          warnings.push(
            `DATE MISMATCH: JSON has ${jsonStartDate} to ${jsonEndDate}, but segment has ${dbStartDate} to ${dbEndDate}. ` +
            `Day count matches (${segmentDayCount} days), so dates can be corrected during import.`
          );
        }
      }
    }

    // Detect v3 format (has _template_version, metadata.version starts with "3", or nested days structure)
    const isV3 = (payload as any)._template_version === '3.0' ||
                 (payload.metadata as any)?.version?.startsWith('3') ||
                 (payload.days && !Array.isArray(payload.days) && Array.isArray((payload.days as any).days));

    // Check research items
    if (!payload.research_items || payload.research_items.length === 0) {
      warnings.push('No research items - this is unusual');
    } else {
      payload.research_items.forEach((item, idx) => {
        if (!item.item_type) issues.push(`research_items[${idx}]: Missing item_type`);
        if (!item.name) issues.push(`research_items[${idx}]: Missing name`);
        // V3 has complete deep_dive content, so source_url is less critical
        if (!item.source_url && !isV3) {
          issues.push(`research_items[${idx}]: Missing source_url (critical for expansion)`);
        }
        if (!item.source_name) warnings.push(`research_items[${idx}]: Missing source_name`);
        // V3 might not have why_relevant in same place
        if (!item.why_relevant && !isV3) warnings.push(`research_items[${idx}]: Missing why_relevant`);
      });

      // Check for items without source_url
      const noSource = payload.research_items.filter((i) => !i.source_url).length;
      if (noSource > 0 && !isV3) {
        warnings.push(`${noSource} items missing source_url - these cannot be expanded later`);
      }

      // Check item count (less strict for v3 since it has more content per item)
      if (payload.research_items.length < 15 && !isV3) {
        warnings.push(
          `Only ${payload.research_items.length} research items - consider adding more variety`
        );
      }
    }

    // Check days - handle both v2 (array) and v3 (nested { days: [...] }) formats
    const daysArray = Array.isArray(payload.days)
      ? payload.days
      : (payload.days as any)?.days || [];

    if (daysArray.length === 0) {
      warnings.push('No days defined - you can add these later');
    } else {
      daysArray.forEach((day: any, idx: number) => {
        if (!day.date) issues.push(`days[${idx}]: Missing date`);
        if (!day.day_number) issues.push(`days[${idx}]: Missing day_number`);
      });
    }

    const result: TripImportValidationResult = {
      valid: issues.length === 0,
      issues,
      warnings,
      summary: {
        research_items: payload.research_items?.length || 0,
        days: daysArray.length,
        items_with_source: payload.research_items?.filter((i) => i.source_url).length || 0,
        items_by_type:
          payload.research_items?.reduce(
            (acc, item) => {
              acc[item.item_type] = (acc[item.item_type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ) || {},
        items_by_priority:
          payload.research_items?.reduce(
            (acc, item) => {
              if (item.priority) acc[item.priority] = (acc[item.priority] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ) || {},
      },
    };

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({
      valid: false,
      issues: ['Invalid JSON structure'],
      error: error.message,
      warnings: [],
      summary: { research_items: 0, days: 0, items_with_source: 0, items_by_type: {}, items_by_priority: {} },
    });
  }
});

/**
 * POST /api/v1/travel/import/hotels
 *
 * Import hotel research options as research items.
 * Part of the Phase 2 hotel research workflow.
 */
router.post('/import/hotels', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { payload, trip_id, segment_id } = req.body as {
      payload: HotelResearchPayload;
      trip_id: string;
      segment_id: string;
    };

    if (!payload || !trip_id || !segment_id) {
      return res.status(400).json({
        success: false,
        error: 'payload, trip_id, and segment_id are required',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify trip belongs to user
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, name')
      .eq('id', trip_id)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify segment belongs to trip
    const { data: segment, error: segmentError } = await supabase
      .from('trip_segments')
      .select('id, name')
      .eq('id', segment_id)
      .eq('trip_id', trip_id)
      .single();

    if (segmentError || !segment) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found or does not belong to this trip',
        timestamp: new Date().toISOString(),
      });
    }

    const errors: string[] = [];
    let createdCount = 0;

    // Convert hotel options to research items with item_type='hotel'
    for (const hotel of payload.hotels) {
      const researchItem = {
        trip_id: trip_id,
        segment_id: segment_id,
        item_type: 'hotel',
        name: hotel.name,
        status: 'unprocessed',
        priority: hotel.pick_type === 'BEST_OVERALL' ? 'must_do' :
                  hotel.pick_type === 'BEST_VALUE' ? 'should_do' :
                  hotel.pick_type === 'BEST_LUXURY' ? 'should_do' : 'could_do',
        category: 'accommodation',

        // Location
        location_name: hotel.location?.neighborhood,
        address: hotel.location?.address,
        latitude: hotel.location?.latitude,
        longitude: hotel.location?.longitude,

        // Ratings
        rating: hotel.ratings?.overall_score,
        review_count: hotel.ratings?.review_count,
        review_summary: hotel.ratings?.family_sentiment,

        // Cost
        cost_estimate_text: hotel.pricing?.cash_rate_per_night
          ? `${hotel.pricing.cash_rate_per_night}${hotel.pricing.currency ? ` ${hotel.pricing.currency}` : ''}/night`
          : hotel.pricing?.points_option?.points_per_night
            ? `${hotel.pricing.points_option.points_per_night.toLocaleString()} ${hotel.pricing.points_option.program || 'points'}/night`
            : undefined,
        booking_url: hotel.pricing?.booking_url,
        website: hotel.source_url,

        // Hotel-specific data stored in raw_data JSONB
        raw_data: {
          hotel_research: {
            // Property info
            brand: hotel.brand,
            chain: hotel.chain,
            property_type: hotel.property_type,
            star_rating: hotel.star_rating,

            // Classification
            pick_type: hotel.pick_type,
            redemption_type: hotel.redemption_type,
            recommendation_reason: hotel.recommendation_reason,

            // Evaluation scores
            scores: hotel.scores,

            // Pricing details
            pricing: hotel.pricing,

            // Benefits
            elite_benefits: hotel.elite_benefits,
            fhr_benefits: hotel.pricing?.fhr,

            // Family assessment
            family_assessment: hotel.family_assessment,

            // Pros/Cons/Risks
            pros: hotel.pros,
            cons: hotel.cons,
            risks: hotel.risks,

            // Booking
            booking_instructions: hotel.booking_instructions,
          },
        },

        // Why relevant
        why_relevant: `${hotel.pick_type}: ${hotel.recommendation_reason || 'Hotel option for this segment'}`,

        // Source
        source_name: hotel.source_name || 'Hotel Research Agent',
        source_url: hotel.source_url || hotel.pricing?.booking_url,
      };

      const { error: insertError } = await supabase
        .from('trip_research_items')
        .insert(researchItem);

      if (insertError) {
        errors.push(`Failed to import ${hotel.name}: ${insertError.message}`);
      } else {
        createdCount++;
      }
    }

    // Update segment to note hotel research is done
    await supabase
      .from('trip_segments')
      .update({
        accommodation: {
          hotel_research_imported: true,
          hotel_count: payload.hotels.length,
          summary: payload.summary,
          imported_at: new Date().toISOString(),
        },
      })
      .eq('id', segment_id);

    return res.json({
      success: errors.length === 0,
      trip_id,
      segment_id,
      created: {
        research_items: createdCount,
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Hotel import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/travel/import/template
 *
 * Returns the expected JSON template information.
 */
router.get('/import/template', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;

    // Get user's output template from settings
    const { data: settings } = await supabase
      .from('travel_settings')
      .select('output_template')
      .eq('user_id', userId)
      .single();

    return res.json({
      success: true,
      template: settings?.output_template || null,
      required_sections: ['metadata', 'segment', 'research_items', 'days'],
      required_fields: {
        'metadata.trip_name': 'string',
        'metadata.dates.start': 'YYYY-MM-DD',
        'metadata.dates.end': 'YYYY-MM-DD',
        'segment.name': 'string',
        'research_items[].item_type': 'restaurant|hike|attraction|beach|activity|...',
        'research_items[].name': 'string',
        'research_items[].source_url': 'URL - critical for later expansion',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================
// RESEARCH ITEMS CRUD
// =============================================

/**
 * GET /api/v1/travel/trips/:tripId/research-items
 * Get all research items for a trip
 */
router.get('/trips/:tripId/research-items', async (req: Request, res: Response): Promise<any> => {
  try {
    const { tripId } = req.params;
    const { status, item_type, priority, segment_id, assigned_day } = req.query;

    let query = supabase
      .from('trip_research_items')
      .select('*, segment:trip_segments(id, name)')
      .eq('trip_id', tripId)
      .order('assigned_day', { ascending: true, nullsFirst: false })
      .order('assigned_time_block', { ascending: true })
      .order('priority', { ascending: true });

    if (status) query = query.eq('status', status);
    if (item_type) query = query.eq('item_type', item_type);
    if (priority) query = query.eq('priority', priority);
    if (segment_id) query = query.eq('segment_id', segment_id);
    if (assigned_day) query = query.eq('assigned_day', Number(assigned_day));

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/travel/research-items/:id
 * Get a single research item
 */
router.get('/research-items/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('trip_research_items')
      .select('*, segment:trip_segments(id, name, location_name)')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Research item not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/v1/travel/research-items/:id
 * Update a research item (status, priority, assignment, notes)
 */
router.patch('/research-items/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updates: UpdateResearchItemRequest = req.body;

    const { data, error } = await supabase
      .from('trip_research_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/travel/research-items/:id/import-to-activity
 * Import a research item as an activity
 */
router.post('/research-items/:id/import-to-activity', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { day_id } = req.body;

    if (!day_id) {
      return res.status(400).json({
        success: false,
        error: 'day_id is required',
        timestamp: new Date().toISOString(),
      });
    }

    const { data: activityId, error } = await supabase.rpc('import_research_item_to_activity', {
      p_research_item_id: id,
      p_day_id: day_id,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      activity_id: activityId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/travel/research-items/:id
 * Delete a research item
 */
router.delete('/research-items/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('trip_research_items').delete().eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/travel/research-items/bulk-update
 * Update multiple research items at once
 */
router.post('/research-items/bulk-update', async (req: Request, res: Response): Promise<any> => {
  try {
    const { ids, updates } = req.body as { ids: string[]; updates: UpdateResearchItemRequest };

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required',
        timestamp: new Date().toISOString(),
      });
    }

    const { data, error } = await supabase
      .from('trip_research_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      updated_count: data?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================
// EXPANSION (Phase 2 - Claude API)
// Transforms research facts into rich narrative content
// =============================================

const EXPANSION_SYSTEM_PROMPT = `You are a tour guide writer creating rich, engaging content for a family travel app.

Your job is to take structured research data about a place and transform it into:
1. An engaging narrative (deep_dive_content)
2. Age-specific engagement scripts for kids
3. A practical visit script
4. Photo guidance

WRITING STYLE:
- Write like a knowledgeable friend, not a guidebook
- Be specific and concrete, not generic
- Include sensory details (what you'll see, hear, smell)
- Connect to kids' interests and understanding levels
- Be honest about challenges
- Make history come alive through stories, not facts

FOR KID ENGAGEMENT:
- Age 7: Can understand cause/effect, enjoys challenges, can read simple signs
- Age 5: Concrete thinking, loves discovery, needs things broken into games
- Age 3: Sensory-focused, short attention span, needs physical engagement

OUTPUT FORMAT:
Return valid JSON matching the ExpansionOutput type exactly. Do not wrap in markdown code blocks.`;

function buildExpansionPrompt(item: TripResearchItem, segmentCityInfo: any, familyProfile: any): string {
  const whyRelevant = typeof item.why_relevant === 'object'
    ? (item.why_relevant as any)?.for_family
    : item.why_relevant;

  const historicalContext = typeof item.historical_context === 'object'
    ? (item.historical_context as any)?.summary
    : item.historical_context;

  return `Generate rich tour-guide content for this research item.

## CONTEXT: Where This Fits

This is part of a trip to ${segmentCityInfo?.location?.location_name || 'this destination'}.

Historical context of the region:
${segmentCityInfo?.deep_history?.intro || segmentCityInfo?.overview || 'Not provided'}

## THE PLACE TO EXPAND

Name: ${item.name}
Type: ${item.item_type}
Why it matters: ${whyRelevant || 'Not specified'}

Basic facts:
- Location: ${item.address || item.location_name || 'Not specified'}
- Hours: ${item.hours_text || 'Check website'}
- Cost: ${item.cost_estimate_text || 'Not specified'}
- Time needed: ${JSON.stringify(item.time_needed) || '1-2 hours'}

Historical context already gathered:
${historicalContext || 'None provided'}

What to see:
${JSON.stringify(item.what_to_see || [], null, 2)}

Kid assessment already done:
${JSON.stringify(item.kid_assessment || {}, null, 2)}

Review summary:
${JSON.stringify(item.review_summary || {}, null, 2)}

## THE FAMILY

${JSON.stringify(familyProfile?.family || {}, null, 2)}

Travel style: ${familyProfile?.travel_style?.philosophy || 'Active mornings, rest midday, light evenings'}

## YOUR TASK

Generate:

1. **deep_dive_content** (500-800 words)
   Write an engaging narrative that:
   - Opens with something that grabs attention
   - Explains why this place matters (history, significance)
   - Describes what the family will experience
   - Weaves in practical details naturally
   - Closes with what makes it memorable

2. **kid_engagement**
   For each age (7, 5, 3), provide 4-6 specific things to:
   - Point out to them
   - Ask them about
   - Let them do
   Make these SPECIFIC to this place, not generic.

   Add conversation_starters (for the walk/drive there) and games (to play while visiting).

3. **visit_script**
   - arrival: What to do in the first 5 minutes
   - flow: The best order to see things
   - highlight_moments: 3-5 specific moments to not miss
   - exit_strategy: How to wrap up with kids

4. **photo_guide**
   3-5 specific photo opportunities with exact locations and tips for getting kids to cooperate.

5. **practical_details_extended**
   Insider tips, warnings, money-saving ideas, stroller info, bathrooms, food, rest spots.

Return ONLY valid JSON matching this structure:
{
  "deep_dive_content": "string",
  "kid_engagement": {
    "age_7": ["string"],
    "age_5": ["string"],
    "age_3": ["string"],
    "conversation_starters": ["string"],
    "games": ["string"]
  },
  "visit_script": {
    "arrival": "string",
    "flow": "string",
    "highlight_moments": ["string"],
    "exit_strategy": "string"
  },
  "photo_guide": [
    {
      "shot": "string",
      "where": "string",
      "when": "string",
      "how": "string",
      "with_kids": "string"
    }
  ],
  "practical_details_extended": {
    "insider_tips": ["string"],
    "warnings": ["string"],
    "money_saving": ["string"],
    "with_stroller": "string",
    "bathroom_locations": "string",
    "food_nearby": "string",
    "rest_spots": "string"
  }
}`;
}

/**
 * POST /api/v1/travel/research-items/:id/expand
 *
 * Phase 2: Expand a research item into rich narrative content using Claude API.
 * Takes the facts from Phase 1 and transforms them into engaging prose.
 */
router.post('/research-items/:id/expand', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // 1. Get the research item
    const { data: item, error: itemError } = await supabase
      .from('trip_research_items')
      .select('*')
      .eq('id', id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({
        success: false,
        error: 'Research item not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if already expanded
    if (item.expanded_at) {
      return res.json({
        success: true,
        message: 'Item already expanded',
        data: item,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Get the segment's city_info for context
    let segmentCityInfo = {};
    if (item.segment_id) {
      const { data: segment } = await supabase
        .from('trip_segments')
        .select('city_info, location_name, name')
        .eq('id', item.segment_id)
        .single();

      if (segment) {
        segmentCityInfo = segment.city_info || {};
      }
    }

    // 3. Get family profile from travel settings
    const { data: settings } = await supabase
      .from('travel_settings')
      .select('family_profile')
      .eq('user_id', userId)
      .single();

    const familyProfile = settings?.family_profile || {};

    // 4. Build the prompt
    const prompt = buildExpansionPrompt(item as TripResearchItem, segmentCityInfo, familyProfile);

    // 5. Call Claude API
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: EXPANSION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    // 6. Parse the response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const expansion: ExpansionOutput = JSON.parse(jsonText);

    // 7. Save to database
    const { data: updated, error: updateError } = await supabase
      .from('trip_research_items')
      .update({
        status: 'expanded',
        expanded_at: new Date().toISOString(),
        expanded_by: 'claude-api',
        deep_dive_content: expansion.deep_dive_content,
        kid_engagement: expansion.kid_engagement,
        visit_script: expansion.visit_script,
        photo_guide: expansion.photo_guide,
        practical_details_extended: expansion.practical_details_extended,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 8. Return the expanded item
    return res.json({
      success: true,
      data: updated,
      expansion,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Expansion error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/travel/research-items/expand-bulk
 *
 * Expand multiple research items at once.
 */
router.post('/research-items/expand-bulk', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { ids } = req.body as { ids: string[] };

    if (!ids || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get family profile once for all items
    const { data: settings } = await supabase
      .from('travel_settings')
      .select('family_profile')
      .eq('user_id', userId)
      .single();

    const familyProfile = settings?.family_profile || {};
    const anthropic = new Anthropic();

    const results: any[] = [];
    const errors: any[] = [];

    for (const id of ids) {
      try {
        // Get item
        const { data: item, error: itemError } = await supabase
          .from('trip_research_items')
          .select('*')
          .eq('id', id)
          .single();

        if (itemError || !item) {
          errors.push({ id, error: 'Item not found' });
          continue;
        }

        if (item.expanded_at) {
          results.push({ id, status: 'already_expanded' });
          continue;
        }

        // Get segment context
        let segmentCityInfo = {};
        if (item.segment_id) {
          const { data: segment } = await supabase
            .from('trip_segments')
            .select('city_info')
            .eq('id', item.segment_id)
            .single();
          segmentCityInfo = segment?.city_info || {};
        }

        // Build prompt and call Claude
        const prompt = buildExpansionPrompt(item as TripResearchItem, segmentCityInfo, familyProfile);

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: EXPANSION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          errors.push({ id, error: 'Invalid response type' });
          continue;
        }

        let jsonText = content.text;
        const jsonMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        const expansion: ExpansionOutput = JSON.parse(jsonText);

        // Save
        const { error: updateError } = await supabase
          .from('trip_research_items')
          .update({
            status: 'expanded',
            expanded_at: new Date().toISOString(),
            expanded_by: 'claude-api',
            deep_dive_content: expansion.deep_dive_content,
            kid_engagement: expansion.kid_engagement,
            visit_script: expansion.visit_script,
            photo_guide: expansion.photo_guide,
            practical_details_extended: expansion.practical_details_extended,
          })
          .eq('id', id);

        if (updateError) {
          errors.push({ id, error: updateError.message });
        } else {
          results.push({ id, status: 'expanded' });
        }

      } catch (err: any) {
        errors.push({ id, error: err.message });
      }
    }

    return res.json({
      success: errors.length === 0,
      expanded: results.filter(r => r.status === 'expanded').length,
      already_expanded: results.filter(r => r.status === 'already_expanded').length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================
// TRAVEL GUIDE TEMPLATES
// =============================================

/**
 * GET /api/v1/travel/guide/phases
 * Get all travel guide phases
 */
router.get('/guide/phases', async (req: Request, res: Response): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('travel_guide_phases')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/travel/guide/templates/:phaseNumber
 * Get all templates for a phase (user customized or defaults)
 */
router.get('/guide/templates/:phaseNumber', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const phaseNumber = parseInt(req.params.phaseNumber, 10);

    if (isNaN(phaseNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase number',
        timestamp: new Date().toISOString(),
      });
    }

    // Use the helper function to get templates with customization status
    const { data, error } = await supabase.rpc('get_travel_phase_templates', {
      p_user_id: userId,
      p_phase_number: phaseNumber,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/travel/guide/templates/:phaseNumber/:templateKey
 * Get a specific template (user customized or default)
 */
router.get('/guide/templates/:phaseNumber/:templateKey', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const phaseNumber = parseInt(req.params.phaseNumber, 10);
    const templateKey = req.params.templateKey;

    if (isNaN(phaseNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase number',
        timestamp: new Date().toISOString(),
      });
    }

    // Use the helper function to get the template
    const { data: content, error } = await supabase.rpc('get_travel_template', {
      p_user_id: userId,
      p_phase_number: phaseNumber,
      p_template_key: templateKey,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Get template metadata
    const { data: definition } = await supabase
      .from('travel_guide_template_definitions')
      .select('*')
      .eq('phase_number', phaseNumber)
      .eq('template_key', templateKey)
      .single();

    // Check if user has customization
    const { data: customization } = await supabase
      .from('travel_guide_templates')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('phase_number', phaseNumber)
      .eq('template_key', templateKey)
      .single();

    return res.json({
      success: true,
      data: {
        template_key: templateKey,
        display_name: definition?.display_name || templateKey,
        filename: definition?.filename || `${templateKey}.json`,
        content_type: definition?.content_type || 'json',
        is_input: definition?.is_input ?? true,
        description: definition?.description,
        content,
        is_customized: !!customization,
        customized_at: customization?.updated_at,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/v1/travel/guide/templates/:phaseNumber/:templateKey
 * Create or update a user's template customization
 */
router.put('/guide/templates/:phaseNumber/:templateKey', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const phaseNumber = parseInt(req.params.phaseNumber, 10);
    const templateKey = req.params.templateKey;
    const { content } = req.body;

    if (isNaN(phaseNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase number',
        timestamp: new Date().toISOString(),
      });
    }

    if (content === undefined || content === null) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get template definition to get metadata
    const { data: definition, error: defError } = await supabase
      .from('travel_guide_template_definitions')
      .select('*')
      .eq('phase_number', phaseNumber)
      .eq('template_key', templateKey)
      .single();

    if (defError || !definition) {
      return res.status(404).json({
        success: false,
        error: 'Template definition not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate JSON content if content_type is json
    if (definition.content_type === 'json') {
      try {
        JSON.parse(content);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON content',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Upsert the user's customization
    const { data, error } = await supabase
      .from('travel_guide_templates')
      .upsert(
        {
          user_id: userId,
          phase_number: phaseNumber,
          template_key: templateKey,
          display_name: definition.display_name,
          filename: definition.filename,
          content_type: definition.content_type,
          is_input: definition.is_input,
          content,
          sort_order: definition.sort_order,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,phase_number,template_key' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/travel/guide/templates/:phaseNumber/:templateKey
 * Delete a user's template customization (reverts to default)
 */
router.delete('/guide/templates/:phaseNumber/:templateKey', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const phaseNumber = parseInt(req.params.phaseNumber, 10);
    const templateKey = req.params.templateKey;

    if (isNaN(phaseNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phase number',
        timestamp: new Date().toISOString(),
      });
    }

    const { error } = await supabase
      .from('travel_guide_templates')
      .delete()
      .eq('user_id', userId)
      .eq('phase_number', phaseNumber)
      .eq('template_key', templateKey);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: 'Template customization deleted, reverted to default',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/travel/guide/template-definitions
 * Get all template definitions (for admin/debugging)
 */
router.get('/guide/template-definitions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('travel_guide_template_definitions')
      .select('*')
      .order('phase_number')
      .order('sort_order');

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================
// MEAL IMPORT
// =============================================

/**
 * POST /api/v1/travel/import/meals
 *
 * Import meal research to update existing meal activities with restaurant details.
 * Updates segment_activities entries that currently have generic names like "Dinner".
 */
router.post('/import/meals', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { payload, trip_id } = req.body as {
      payload: {
        meals: Array<{
          activity_id: string;
          original_name: string;
          recommended: {
            name: string;
            why_chosen: string;
            cuisine?: string;
            price_range?: string;
            address?: string;
            google_maps_url?: string;
            reservation_needed?: boolean;
            typical_wait?: string;
            kid_notes?: string;
            must_try?: string[];
            tips?: string;
          };
          alternatives?: Array<{
            name: string;
            why_backup: string;
            cuisine?: string;
            price_range?: string;
          }>;
        }>;
      };
      trip_id: string;
    };

    if (!payload || !trip_id || !payload.meals) {
      return res.status(400).json({
        success: false,
        error: 'payload, trip_id, and payload.meals are required',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify trip belongs to user
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, name')
      .eq('id', trip_id)
      .eq('user_id', userId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found or access denied',
        timestamp: new Date().toISOString(),
      });
    }

    const errors: string[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const meal of payload.meals) {
      // Verify activity exists and belongs to this trip
      const { data: activity, error: activityError } = await supabase
        .from('trip_activities')
        .select('id, trip_id, name')
        .eq('id', meal.activity_id)
        .single();

      if (activityError || !activity) {
        errors.push(`Activity ${meal.activity_id} not found`);
        skippedCount++;
        continue;
      }

      if (activity.trip_id !== trip_id) {
        errors.push(`Activity ${meal.activity_id} does not belong to this trip`);
        skippedCount++;
        continue;
      }

      // Build the update data
      const rec = meal.recommended;
      const updateData: Record<string, unknown> = {
        // Update name to include restaurant name
        name: `${meal.original_name} at ${rec.name}`,
        // Location info
        location_name: rec.name,
        address: rec.address,
        google_maps_url: rec.google_maps_url,
        // Reservation info
        reservation_required: rec.reservation_needed || false,
        reservation_details: rec.typical_wait ? `Typical wait: ${rec.typical_wait}` : undefined,
        // Kid info
        kid_friendliness: rec.kid_notes,
        // Tips and notes
        tips: [
          rec.tips,
          rec.must_try?.length ? `Must try: ${rec.must_try.join(', ')}` : null,
        ].filter(Boolean).join('\n'),
        why_its_great: rec.why_chosen,
        // Store alternatives and details in activity_details JSONB
        activity_details: {
          cuisine: rec.cuisine,
          price_range: rec.price_range,
          alternatives: meal.alternatives,
        },
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { error: updateError } = await supabase
        .from('trip_activities')
        .update(updateData)
        .eq('id', meal.activity_id);

      if (updateError) {
        errors.push(`Failed to update ${meal.activity_id}: ${updateError.message}`);
        skippedCount++;
      } else {
        updatedCount++;
      }
    }

    return res.json({
      success: true,
      data: {
        updated: updatedCount,
        skipped: skippedCount,
        total: payload.meals.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
