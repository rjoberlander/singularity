import { supabase } from '../config/supabase';
import { fetchAndStoreTripPhotos } from './google-photo-service';
import type {
  ValidationIssue,
  ValidationResult,
  TripAccommodation,
  TripFlight,
} from '@singularity/shared-types';

// Extended TripActivity type with Google data fetch tracking
interface TripActivityWithGoogleData {
  id: string;
  name: string;
  activity_type?: string;
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
  google_rating?: number;
  google_review_count?: number;
  google_data_fetched_at?: string;
  google_maps_url?: string;
  photos_fetched?: boolean;
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
    weekday_text?: string[];
  };
  reservation_required?: boolean;
  confirmation_status?: string;
  booking_url?: string;
  // Alternate activity tracking
  is_backup?: boolean;
  alternate_to_activity_id?: string;
  alternative_type?: 'direct_replacement' | 'general_option';
  // Restaurant details
  restaurant_details?: {
    cuisine_type?: string;
    signature_dishes?: Array<{
      name: string;
      description: string;
      price?: string;
      kid_friendly?: boolean;
      source?: 'ai_review_analysis' | 'imported';
    }>;
    ambience?: string;
    noise_level?: 'quiet' | 'moderate' | 'loud';
    seating?: 'indoor' | 'outdoor' | 'both';
    highchair?: boolean;
    kids_menu?: boolean;
    dietary_options?: string[];
    reservation_tips?: string;
  };
  // Ticket/admission pricing
  practical_details?: {
    hours?: string;
    cost_breakdown?: {
      adults?: string;
      seniors?: string;
      kids?: string;
      under_x_free?: string;
    };
    ticket_price?: {
      adult?: string;
      child?: string;
      senior?: string;
      family?: string;
      free_under_age?: number;
      currency?: string;
      source?: string;
      fetched_at?: string;
    };
    time_needed?: string;
    avoid_times?: string[];
    best_times?: string[];
    getting_there?: string;
    combo_tickets?: string;
  };
}

// Internal types for schedule items
interface ScheduleItemForValidation {
  id: string;
  day_id: string;
  time_start: string;
  time_end: string;
  event_type: string;
  title: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  research_item_id?: string;
  day?: {
    id: string;
    date: string;
    segment_id?: string;
  };
}

interface DayWithDate {
  id: string;
  date: string;
  segment_id?: string;
}

/**
 * Schedule Validation Service
 * Validates assembled schedules for:
 * - Opening hours conflicts
 * - Travel time feasibility
 * - Hotel amenity mismatches
 * - Meal gaps
 * - Duration realism
 * - Booking requirements
 */
export class ScheduleValidationService {

  /**
   * Run all validators on schedule items
   */
  static async validateSchedule(
    tripId: string,
    scheduleItems: ScheduleItemForValidation[],
    activities: TripActivityWithGoogleData[],
    accommodations: TripAccommodation[],
    flights?: TripFlight[]
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Group schedule items by day
    const itemsByDay = new Map<string, ScheduleItemForValidation[]>();
    for (const item of scheduleItems) {
      const dayId = item.day_id;
      if (!itemsByDay.has(dayId)) {
        itemsByDay.set(dayId, []);
      }
      itemsByDay.get(dayId)!.push(item);
    }

    // Run validators
    for (const [dayId, dayItems] of itemsByDay.entries()) {
      // Sort items by time
      const sortedItems = [...dayItems].sort((a, b) =>
        a.time_start.localeCompare(b.time_start)
      );

      const day = sortedItems[0]?.day;
      if (!day) continue;

      // 1. Validate opening hours
      const openingHoursIssues = await this.validateOpeningHours(sortedItems, activities, day);
      issues.push(...openingHoursIssues);

      // 2. Validate travel time between consecutive activities
      const travelTimeIssues = this.validateTravelTime(sortedItems);
      issues.push(...travelTimeIssues);

      // 3. Check hotel amenity mismatches
      const amenityIssues = this.validateHotelAmenities(sortedItems, accommodations, day);
      issues.push(...amenityIssues);

      // 4. Detect meal gaps
      const mealGapIssues = this.detectMealGaps(sortedItems, day);
      issues.push(...mealGapIssues);

      // 5. Validate duration realism
      const durationIssues = this.validateDurationRealism(sortedItems, activities);
      issues.push(...durationIssues);

      // 6. Check booking requirements
      const bookingIssues = this.checkBookingRequirements(sortedItems, activities, day);
      issues.push(...bookingIssues);
    }

    // 7. Validate flight times (arrival buffer on first day, departure buffer on last day)
    if (flights && flights.length > 0) {
      const flightIssues = this.validateFlightTimes(scheduleItems, flights);
      issues.push(...flightIssues);
    }

    // Calculate summary
    const summary = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      suggestions: issues.filter(i => i.severity === 'suggestion').length,
    };

    return {
      valid: summary.errors === 0 && summary.warnings === 0,
      canProceed: true, // Always allow proceeding - validation is non-blocking
      issues,
      summary,
    };
  }

  /**
   * Validate that activities are scheduled during opening hours
   */
  private static async validateOpeningHours(
    items: ScheduleItemForValidation[],
    activities: TripActivityWithGoogleData[],
    day: DayWithDate
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Get day of week (0 = Sunday, 6 = Saturday)
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    for (const item of items) {
      if (item.event_type !== 'activity') continue;

      // Find matching activity by research_item_id or title
      const activity = activities.find(a =>
        (item.research_item_id && a.id === item.research_item_id) ||
        a.name.toLowerCase() === item.title.toLowerCase()
      );

      if (!activity?.opening_hours?.periods) continue;

      const periods = activity.opening_hours.periods;

      // Find opening hours for this day
      const dayPeriod = periods.find(p => p.open.day === dayOfWeek);

      if (!dayPeriod) {
        // Place is closed on this day
        issues.push({
          severity: 'error',
          category: 'opening_hours',
          scheduleItemId: item.id,
          activityId: activity.id,
          activityName: item.title,
          dayId: day.id,
          date: day.date,
          time: item.time_start,
          message: `${item.title} is closed on ${getDayName(dayOfWeek)}`,
          details: 'This attraction is not open on the scheduled day.',
        });
        continue;
      }

      // Check if scheduled time is within opening hours
      const openTime = dayPeriod.open.time; // e.g., "0900"
      const closeTime = dayPeriod.close.time; // e.g., "1800"
      const scheduledStart = item.time_start.replace(':', ''); // e.g., "09:00" -> "0900"
      const scheduledEnd = item.time_end.replace(':', '');

      if (scheduledStart < openTime || scheduledEnd > closeTime) {
        issues.push({
          severity: 'warning',
          category: 'opening_hours',
          scheduleItemId: item.id,
          activityId: activity.id,
          activityName: item.title,
          dayId: day.id,
          date: day.date,
          time: item.time_start,
          message: `${item.title} opens at ${formatTime(openTime)} - ${formatTime(closeTime)}`,
          details: `Scheduled for ${item.time_start} - ${item.time_end}, but opens ${formatTime(openTime)} - ${formatTime(closeTime)}.`,
          autoFixAvailable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Validate travel time between consecutive activities
   */
  private static validateTravelTime(items: ScheduleItemForValidation[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];

      // Skip transit items
      if (current.event_type === 'transit' || next.event_type === 'transit') continue;

      // Only check if both have locations
      if (!current.location_lat || !current.location_lng) continue;
      if (!next.location_lat || !next.location_lng) continue;

      // Calculate gap between activities
      const currentEnd = timeToMinutes(current.time_end);
      const nextStart = timeToMinutes(next.time_start);
      const gap = nextStart - currentEnd;

      // Estimate travel time based on distance (rough approximation)
      const distance = haversineDistance(
        current.location_lat, current.location_lng,
        next.location_lat, next.location_lng
      );

      // Estimate: 5 km/h walking, 30 km/h driving in city
      const walkingMinutes = Math.ceil((distance / 5) * 60);
      const drivingMinutes = Math.ceil((distance / 30) * 60) + 10; // +10 for parking

      // Use walking for < 2km, driving otherwise
      const estimatedMinutes = distance < 2 ? walkingMinutes : drivingMinutes;

      if (gap < estimatedMinutes) {
        const severity = gap < estimatedMinutes / 2 ? 'warning' : 'suggestion';
        issues.push({
          severity,
          category: 'travel_time',
          scheduleItemId: next.id,
          activityName: next.title,
          dayId: current.day?.id,
          date: current.day?.date,
          time: current.time_end,
          message: `Only ${gap} min between ${current.title} and ${next.title}`,
          details: `Estimated travel time: ${estimatedMinutes} min (${distance.toFixed(1)} km). Gap is ${gap} min.`,
          autoFixAvailable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Validate hotel amenity requirements
   * Checks "pool time" and "breakfast" items against hotel amenities
   */
  private static validateHotelAmenities(
    items: ScheduleItemForValidation[],
    accommodations: TripAccommodation[],
    day: DayWithDate
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Find accommodation for this date
    const accommodation = this.getAccommodationForDate(accommodations, day.date);
    if (!accommodation) return issues;

    for (const item of items) {
      const titleLower = item.title.toLowerCase();

      // Check for pool-related activities
      if (titleLower.includes('pool') || titleLower.includes('swim')) {
        const hasPool = accommodation.amenities?.some(a =>
          a.toLowerCase().includes('pool') || a.toLowerCase().includes('swim')
        );

        if (!hasPool) {
          issues.push({
            severity: 'warning',
            category: 'amenity_mismatch',
            scheduleItemId: item.id,
            activityName: item.title,
            dayId: day.id,
            date: day.date,
            time: item.time_start,
            message: `Pool time scheduled but ${accommodation.name} may not have a pool`,
            details: 'Hotel amenities do not include "pool". Verify pool availability.',
          });
        }
      }

      // Check for breakfast at hotel
      if (titleLower.includes('breakfast') &&
          (titleLower.includes('hotel') || item.location_name?.toLowerCase().includes(accommodation.name.toLowerCase()))) {
        const hasBreakfast = accommodation.amenities?.some(a =>
          a.toLowerCase().includes('breakfast')
        );

        if (!hasBreakfast) {
          issues.push({
            severity: 'warning',
            category: 'amenity_mismatch',
            scheduleItemId: item.id,
            activityName: item.title,
            dayId: day.id,
            date: day.date,
            time: item.time_start,
            message: `Hotel breakfast scheduled but ${accommodation.name} may not include breakfast`,
            details: 'Hotel amenities do not include "breakfast". Verify breakfast availability.',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Detect missing meal gaps
   * Flags if no lunch (11am-3pm) or dinner (6pm-9pm) is scheduled
   */
  private static detectMealGaps(
    items: ScheduleItemForValidation[],
    day: DayWithDate
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const meals = items.filter(i => i.event_type === 'meal');

    // Check for lunch (11:00 - 15:00)
    const hasLunch = meals.some(m => {
      const start = timeToMinutes(m.time_start);
      return start >= 660 && start <= 900; // 11:00 - 15:00
    });

    if (!hasLunch) {
      issues.push({
        severity: 'suggestion',
        category: 'meal_gap',
        dayId: day.id,
        date: day.date,
        time: '12:00',
        message: 'No lunch scheduled between 11am-3pm',
        details: 'Consider adding a lunch break to avoid fatigue.',
        autoFixAvailable: true,
      });
    }

    // Check for dinner (18:00 - 21:00)
    const hasDinner = meals.some(m => {
      const start = timeToMinutes(m.time_start);
      return start >= 1080 && start <= 1260; // 18:00 - 21:00
    });

    if (!hasDinner) {
      issues.push({
        severity: 'suggestion',
        category: 'meal_gap',
        dayId: day.id,
        date: day.date,
        time: '19:00',
        message: 'No dinner scheduled between 6pm-9pm',
        details: 'Consider adding a dinner reservation.',
        autoFixAvailable: true,
      });
    }

    return issues;
  }

  /**
   * Validate duration realism
   * Flags museums <90min, castles <60min, etc.
   */
  private static validateDurationRealism(
    items: ScheduleItemForValidation[],
    activities: TripActivityWithGoogleData[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Minimum recommended durations by activity type
    const minDurations: Record<string, number> = {
      museum: 90,
      castle: 60,
      palace: 90,
      cathedral: 45,
      church: 30,
      monastery: 60,
      hike: 120,
      beach: 120,
    };

    for (const item of items) {
      if (item.event_type !== 'activity') continue;

      const duration = timeToMinutes(item.time_end) - timeToMinutes(item.time_start);
      const titleLower = item.title.toLowerCase();

      // Find matching activity for type detection
      const activity = activities.find(a =>
        (item.research_item_id && a.id === item.research_item_id) ||
        a.name.toLowerCase() === titleLower
      );

      // Check against known activity types
      for (const [type, minMinutes] of Object.entries(minDurations)) {
        if (titleLower.includes(type) || activity?.activity_type === type) {
          if (duration < minMinutes) {
            issues.push({
              severity: 'suggestion',
              category: 'duration',
              scheduleItemId: item.id,
              activityName: item.title,
              dayId: item.day?.id,
              date: item.day?.date,
              time: item.time_start,
              message: `${item.title} may need more than ${duration} min`,
              details: `Typical ${type} visit: ${minMinutes}+ minutes. Scheduled: ${duration} min.`,
              autoFixAvailable: true,
            });
          }
          break;
        }
      }
    }

    return issues;
  }

  /**
   * Check activities that require booking
   */
  private static checkBookingRequirements(
    items: ScheduleItemForValidation[],
    activities: TripActivityWithGoogleData[],
    day: DayWithDate
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const item of items) {
      if (item.event_type !== 'activity') continue;

      // Find matching activity
      const activity = activities.find(a =>
        (item.research_item_id && a.id === item.research_item_id) ||
        a.name.toLowerCase() === item.title.toLowerCase()
      );

      if (activity?.reservation_required && activity?.confirmation_status !== 'confirmed') {
        issues.push({
          severity: 'warning',
          category: 'booking',
          scheduleItemId: item.id,
          activityId: activity.id,
          activityName: item.title,
          dayId: day.id,
          date: day.date,
          time: item.time_start,
          message: `${item.title} requires a reservation`,
          details: activity.booking_url
            ? `Book at: ${activity.booking_url}`
            : 'Reservation required - check website for booking.',
        });
      }
    }

    return issues;
  }

  /**
   * Validate flight times - ensure activities respect arrival/departure times
   * - First day: Activities shouldn't start before flight arrival + buffer (60 min default)
   * - Last day: Activities should end before departure time - airport buffer (120-180 min)
   */
  private static validateFlightTimes(
    items: ScheduleItemForValidation[],
    flights: TripFlight[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Get all days from items
    const dayDates = new Map<string, { date: string; dayId: string }>();
    for (const item of items) {
      if (item.day?.date && item.day?.id) {
        dayDates.set(item.day.date, { date: item.day.date, dayId: item.day.id });
      }
    }

    if (dayDates.size === 0) return issues;

    // Sort dates to find first and last day
    const sortedDates = Array.from(dayDates.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const firstDay = sortedDates[0];
    const lastDay = sortedDates[sortedDates.length - 1];

    // Check outbound flight (arrival at destination)
    const outboundFlight = flights.find(f => f.direction === 'outbound');
    if (outboundFlight?.arrival_datetime) {
      // Parse local datetime to avoid timezone conversion issues
      const arrivalLocal = parseLocalDateTime(outboundFlight.arrival_datetime);
      if (!arrivalLocal) {
        console.warn(`[Flight validation] Could not parse arrival_datetime: ${outboundFlight.arrival_datetime}`);
      }
      const arrivalDateStr = arrivalLocal?.date || '';

      // Check if arrival is on first day
      if (arrivalDateStr === firstDay.date) {
        // Get arrival time in minutes and add buffer (60 minutes)
        const arrivalMinutes = arrivalLocal!.totalMinutes;
        const earliestStartMinutes = arrivalMinutes + 60; // 60 min buffer after arrival

        // Find first activity on that day
        const firstDayItems = items
          .filter(i => i.day?.date === firstDay.date && i.event_type === 'activity')
          .sort((a, b) => a.time_start.localeCompare(b.time_start));

        if (firstDayItems.length > 0) {
          const firstActivity = firstDayItems[0];
          const activityStartMinutes = timeToMinutes(firstActivity.time_start);

          if (activityStartMinutes < earliestStartMinutes) {
            const arrivalTime = formatTimeFromMinutes(arrivalMinutes);
            const earliestTime = formatTimeFromMinutes(earliestStartMinutes);
            issues.push({
              severity: 'warning',
              category: 'travel_time',
              scheduleItemId: firstActivity.id,
              activityName: firstActivity.title,
              dayId: firstDay.dayId,
              date: firstDay.date,
              time: firstActivity.time_start,
              message: `Activity starts before flight arrival + buffer`,
              details: `Flight ${outboundFlight.flight_number || ''} arrives at ${arrivalTime}. With 60 min buffer for immigration/baggage, earliest start is ${earliestTime}. Activity "${firstActivity.title}" starts at ${firstActivity.time_start}.`,
              autoFixAvailable: true,
            });
          }
        }
      }
    }

    // Check return flight (departure from destination)
    const returnFlight = flights.find(f => f.direction === 'return');
    if (returnFlight?.departure_datetime) {
      // Parse local datetime to avoid timezone conversion issues
      const departureLocal = parseLocalDateTime(returnFlight.departure_datetime);
      if (!departureLocal) {
        console.warn(`[Flight validation] Could not parse departure_datetime: ${returnFlight.departure_datetime}`);
      }
      const departureDateStr = departureLocal?.date || '';

      // Check if departure is on last day
      if (departureDateStr === lastDay.date) {
        // Get departure time and subtract airport buffer (150 min = 2.5 hours)
        const departureMinutes = departureLocal!.totalMinutes;
        const latestEndMinutes = departureMinutes - 150; // 2.5 hour buffer before departure

        // Find last activity on that day
        const lastDayItems = items
          .filter(i => i.day?.date === lastDay.date && i.event_type === 'activity')
          .sort((a, b) => b.time_end.localeCompare(a.time_end));

        if (lastDayItems.length > 0 && latestEndMinutes > 0) {
          const lastActivity = lastDayItems[0];
          const activityEndMinutes = timeToMinutes(lastActivity.time_end);

          if (activityEndMinutes > latestEndMinutes) {
            const departureTime = formatTimeFromMinutes(departureMinutes);
            const latestTime = formatTimeFromMinutes(latestEndMinutes);
            issues.push({
              severity: 'warning',
              category: 'travel_time',
              scheduleItemId: lastActivity.id,
              activityName: lastActivity.title,
              dayId: lastDay.dayId,
              date: lastDay.date,
              time: lastActivity.time_end,
              message: `Activity ends too close to flight departure`,
              details: `Flight ${returnFlight.flight_number || ''} departs at ${departureTime}. Recommend arriving 2.5 hours early. Latest activity end: ${latestTime}. Activity "${lastActivity.title}" ends at ${lastActivity.time_end}.`,
              autoFixAvailable: true,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Find accommodation covering a specific date
   */
  private static getAccommodationForDate(
    accommodations: TripAccommodation[],
    date: string
  ): TripAccommodation | undefined {
    return accommodations.find(a => {
      const checkIn = new Date(a.check_in_date);
      const checkOut = new Date(a.check_out_date);
      const targetDate = new Date(date);
      return targetDate >= checkIn && targetDate < checkOut;
    });
  }

  /**
   * Fetch Google Places data for activities missing data
   * Searches Google for activities without google_place_id
   * Fetches photos and stores them in trip_media
   *
   * Photo counts (Google API returns max 10 refs per place):
   * - Primary activities: up to 10 photos
   * - Alternate activities: up to 5 photos
   *
   * Additional enrichment:
   * - For restaurants: Fetches reviews and extracts top 3-5 recommended dishes via AI
   * - For attractions: Fetches ticket/admission pricing when available
   *
   * Returns count of activities enriched
   */
  static async enrichActivitiesWithGoogleData(
    tripId: string,
    userId: string,
    activities: TripActivityWithGoogleData[],
    googleApiKey: string,
    anthropicApiKey?: string
  ): Promise<{ enriched: number; skipped: number; photosAdded: number; reviewsAnalyzed: number; errors: string[] }> {
    const startTime = Date.now();
    const log = (msg: string, details?: Record<string, unknown>) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Enrichment][${elapsed}s] ${msg}`, details ? JSON.stringify(details) : '');
    };

    const errors: string[] = [];
    let enriched = 0;
    let photosAdded = 0;
    let reviewsAnalyzed = 0;

    // Activity types that should never be enriched (categories, not sub-types)
    const NON_ENRICHABLE_TYPES = new Set(['transport', 'downtime', 'logistics', 'sleep', 'rest', 'custom']);

    // Skip these activity names that don't map to a Google Place
    const SKIP_KEYWORDS = [
      'arrive', 'depart', 'pick up', 'check-in', 'check in', 'checkout',
      'wake up', 'kids to bed', 'load car', 'pack', 'pool time', 'siesta', 'nap',
      'sleep', 'morning routine'
    ];

    // Transit name patterns — activities that are travel TO a destination, not the destination itself
    const TRANSIT_NAME_PATTERNS = [
      /^uber\b/i, /^taxi\b/i, /^bus\b/i, /^train\b/i, /^tram\b/i,
      /^drive\s+(to|from|back)\b/i,
      /^walk\s+(to|from|back|down\s+to)\b/i,
      /^travel\s+to\b/i, /^head\s+to\b/i, /^ride\s+to\b/i,
      /^transfer\b/i, /^drop[\s-]*off\b/i,
      /^park\s+at\b/i,
      /\b(back\s+to|to\s+the)\s+(hotel|airport|car|station|accommodation)\b/i,
    ];

    // Generic meal names that should be skipped (at hotel, no specific restaurant)
    const GENERIC_MEAL_PATTERNS = [
      /^breakfast$/i, /^lunch$/i, /^dinner$/i,
      /^hotel breakfast$/i, /^breakfast at hotel$/i, /^breakfast at accommodation$/i,
      /breakfast \(at hotel\)/i, /lunch \(at hotel\)/i, /dinner \(at hotel\)/i,
      /room service/i,
    ];

    // Activity types that are restaurants/food
    const RESTAURANT_TYPES = ['restaurant', 'cafe', 'dining', 'food', 'bakery', 'bar'];

    // Activity types that are attractions with potential ticket prices
    const ATTRACTION_TYPES = ['museum', 'attraction', 'palace', 'castle', 'monument', 'park', 'zoo', 'aquarium', 'theme_park'];

    const shouldSkip = (name: string, activityType?: string) => {
      // Skip non-enrichable activity types entirely
      if (activityType && NON_ENRICHABLE_TYPES.has(activityType)) return true;
      const lower = name.toLowerCase();
      // Check non-meal skip keywords
      if (SKIP_KEYWORDS.some(skip => lower.includes(skip))) return true;
      // Check transit name patterns (e.g. "Uber to X", "Walk to X", "Park at X")
      if (TRANSIT_NAME_PATTERNS.some(p => p.test(name))) return true;
      // Check generic meal patterns (skip "Breakfast" but not "Breakfast at Cafe Lisboa")
      if (GENERIC_MEAL_PATTERNS.some(p => p.test(name))) return true;
      return false;
    };

    const isRestaurant = (activity: TripActivityWithGoogleData) => {
      const type = activity.activity_type?.toLowerCase() || '';
      const name = activity.name.toLowerCase();
      return RESTAURANT_TYPES.some(r => type.includes(r) || name.includes(r));
    };

    const isAttraction = (activity: TripActivityWithGoogleData) => {
      const type = activity.activity_type?.toLowerCase() || '';
      return ATTRACTION_TYPES.some(a => type.includes(a));
    };

    // Filter activities that need Google data
    const needsData = activities.filter(a =>
      !a.google_place_id && !shouldSkip(a.name, a.activity_type)
    );

    const alreadyEnriched = activities.filter(a => a.google_place_id).length;
    const skippedByFilter = activities.filter(a => !a.google_place_id && shouldSkip(a.name, a.activity_type)).length;
    const skipped = alreadyEnriched + skippedByFilter;

    log('START', {
      totalActivities: activities.length,
      needsEnrichment: needsData.length,
      alreadyEnriched,
      skippedByFilter
    });

    // Process sequentially to respect rate limits
    let processedCount = 0;
    for (const activity of needsData) {
      processedCount++;
      const activityStartTime = Date.now();

      try {
        // Search for place using activity name and location
        const searchQuery = activity.location_name
          ? `${activity.name} ${activity.location_name}`
          : activity.name;

        const isAlternate = activity.is_backup || !!activity.alternate_to_activity_id;
        const maxPhotos = isAlternate ? 5 : 10; // Google API returns max 10 photo refs per place

        log(`Processing ${processedCount}/${needsData.length}`, {
          name: activity.name.substring(0, 40),
          isAlternate,
          maxPhotos
        });

        // Build field mask - include reviews for restaurants
        const fieldMask = [
          'places.id', 'places.displayName', 'places.rating', 'places.userRatingCount',
          'places.regularOpeningHours', 'places.photos', 'places.formattedAddress',
          'places.location', 'places.websiteUri', 'places.priceLevel'
        ];

        // Add reviews field for restaurants (requires additional API call)
        if (isRestaurant(activity)) {
          fieldMask.push('places.reviews');
        }

        const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': fieldMask.join(',')
          },
          body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 })
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          log(`FAIL: Google search failed`, { activity: activity.name, status: searchResponse.status, error: errorText.substring(0, 200) });
          errors.push(`Search failed for ${activity.name}: ${searchResponse.status}`);
          continue;
        }

        const searchData = await searchResponse.json() as { places?: Array<{
          id: string;
          displayName?: { text: string };
          rating?: number;
          userRatingCount?: number;
          priceLevel?: string;
          regularOpeningHours?: {
            openNow?: boolean;
            periods?: Array<{ open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } }>;
            weekdayDescriptions?: string[];
          };
          photos?: Array<{ name: string; widthPx: number; heightPx: number; authorAttributions?: Array<{ displayName: string; uri: string }> }>;
          reviews?: Array<{ text?: { text: string }; rating?: number; authorAttribution?: { displayName: string } }>;
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
          websiteUri?: string;
        }> };

        const place = searchData.places?.[0];
        if (!place) {
          log(`No place found`, { activity: activity.name });
          continue;
        }

        log(`Found place`, {
          activity: activity.name.substring(0, 30),
          place: place.displayName?.text?.substring(0, 30),
          rating: place.rating,
          photos: place.photos?.length || 0
        });

        // Convert opening hours
        let openingHours: TripActivityWithGoogleData['opening_hours'] = undefined;
        if (place.regularOpeningHours) {
          openingHours = {
            open_now: place.regularOpeningHours.openNow,
            periods: place.regularOpeningHours.periods?.map(p => ({
              open: { day: p.open?.day, time: `${String(p.open?.hour || 0).padStart(2, '0')}:${String(p.open?.minute || 0).padStart(2, '0')}` },
              close: { day: p.close?.day, time: `${String(p.close?.hour || 0).padStart(2, '0')}:${String(p.close?.minute || 0).padStart(2, '0')}` }
            })),
            weekday_text: place.regularOpeningHours.weekdayDescriptions
          };
        }

        // Convert price level from Google format
        let priceLevel: number | undefined;
        if (place.priceLevel) {
          const priceLevelMap: Record<string, number> = {
            'PRICE_LEVEL_FREE': 0,
            'PRICE_LEVEL_INEXPENSIVE': 1,
            'PRICE_LEVEL_MODERATE': 2,
            'PRICE_LEVEL_EXPENSIVE': 3,
            'PRICE_LEVEL_VERY_EXPENSIVE': 4
          };
          priceLevel = priceLevelMap[place.priceLevel];
        }

        // Update activity with Google data
        const updateData: Record<string, unknown> = {
          google_place_id: place.id,
          google_rating: place.rating,
          google_review_count: place.userRatingCount,
          google_price_level: priceLevel,
          opening_hours: openingHours,
          google_data_fetched_at: new Date().toISOString(),
          photos_fetched: true,
          // Generate Google Maps URL from place_id
          google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.id}`
        };

        if (!activity.address && place.formattedAddress) {
          updateData.address = place.formattedAddress;
        }
        if (!activity.latitude && place.location) {
          updateData.latitude = place.location.latitude;
          updateData.longitude = place.location.longitude;
        }

        // For restaurants: Analyze reviews to extract recommended dishes
        if (isRestaurant(activity) && place.reviews && place.reviews.length > 0 && anthropicApiKey) {
          try {
            log(`Analyzing restaurant reviews`, { activity: activity.name.substring(0, 30), reviewCount: place.reviews.length });
            const recommendedDishes = await this.extractRecommendedDishesFromReviews(
              place.reviews,
              activity.name,
              anthropicApiKey
            );
            if (recommendedDishes && recommendedDishes.length > 0) {
              // Merge with existing restaurant_details or create new
              const existingDetails = activity.restaurant_details || {};
              updateData.restaurant_details = {
                ...existingDetails,
                signature_dishes: recommendedDishes
              };
              reviewsAnalyzed++;
              log(`Extracted dishes`, { activity: activity.name.substring(0, 30), dishes: recommendedDishes.length });
            }
          } catch (reviewError) {
            log(`FAIL: Review analysis failed`, { activity: activity.name, error: String(reviewError) });
          }
        }

        // For attractions: Try to fetch ticket prices (SKIP - too slow and unreliable)
        // Disabled to speed up enrichment
        /*
        if (isAttraction(activity) && place.websiteUri) {
          try {
            const ticketPrice = await this.fetchTicketPrices(
              activity.name,
              place.websiteUri,
              activity.location_name,
              anthropicApiKey
            );
            if (ticketPrice) {
              const existingDetails = activity.practical_details || {};
              updateData.practical_details = {
                ...existingDetails,
                ticket_price: ticketPrice
              };
              log(`Found ticket prices`, { activity: activity.name });
            }
          } catch (ticketError) {
            log(`FAIL: Ticket price fetch failed`, { activity: activity.name, error: String(ticketError) });
          }
        }
        */

        const { error: updateError } = await supabase
          .from('trip_activities')
          .update(updateData)
          .eq('id', activity.id);

        if (updateError) {
          log(`FAIL: DB update failed`, { activity: activity.name, error: updateError.message });
          errors.push(`DB update failed for ${activity.name}: ${updateError.message}`);
          continue;
        }

        enriched++;

        // Fetch and store photos using shared service (handles dedup via content hash + photo ref)
        // Note: Google Places API returns max 10 photo refs per place — this is a hard API limit
        const photos = place.photos || [];
        log(`Fetching photos for ${activity.name.substring(0, 30)}`, { available: photos.length, maxPhotos });

        const photoResult = await fetchAndStoreTripPhotos(
          tripId,
          userId,
          activity.id,
          photos,
          activity.name,
          { maxPhotos, userId, contextType: 'travel_planning', contextId: tripId }
        );

        photosAdded += photoResult.photosAdded;

        const activityDuration = ((Date.now() - activityStartTime) / 1000).toFixed(2);
        log(`DONE ${processedCount}/${needsData.length}`, {
          activity: activity.name.substring(0, 30),
          duration: `${activityDuration}s`,
          photos: photoResult.photosAdded,
          skipped: photoResult.photosSkipped,
          totalEnriched: enriched,
          totalPhotos: photosAdded
        });

        // Rate limiting between activities
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        log(`ERROR processing activity`, { activity: activity.name, error: String(error) });
        errors.push(`Failed to enrich ${activity.name}: ${error}`);
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('COMPLETE', {
      duration: `${totalDuration}s`,
      enriched,
      skipped,
      photosAdded,
      reviewsAnalyzed,
      errors: errors.length
    });

    return { enriched, skipped, photosAdded, reviewsAnalyzed, errors };
  }

  /**
   * Extract recommended dishes from Google reviews using AI
   * Analyzes review text to find frequently mentioned and highly praised menu items
   */
  private static async extractRecommendedDishesFromReviews(
    reviews: Array<{ text?: { text: string }; rating?: number; authorAttribution?: { displayName: string } }>,
    restaurantName: string,
    anthropicApiKey: string
  ): Promise<Array<{ name: string; description: string; price?: string; kid_friendly?: boolean; source: 'ai_review_analysis' }> | null> {
    if (!reviews || reviews.length === 0) return null;

    // Combine review texts
    const reviewTexts = reviews
      .filter(r => r.text?.text)
      .map(r => `[${r.rating || 'N/A'} stars] ${r.text!.text}`)
      .join('\n\n');

    if (!reviewTexts) return null;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Analyze these Google reviews for "${restaurantName}" and extract the top 3-5 most recommended dishes or menu items that reviewers mention positively.

Reviews:
${reviewTexts}

Return a JSON array of objects with this structure:
[
  {
    "name": "Dish name",
    "description": "Brief description based on what reviewers said about it",
    "kid_friendly": true/false (if mentioned or can be reasonably inferred)
  }
]

Only include dishes that are specifically mentioned positively. If no specific dishes are mentioned, return an empty array [].
Return ONLY the JSON array, no other text.`
          }]
        })
      });

      if (!response.ok) {
        console.error(`[Enrichment] AI review analysis failed: ${response.status}`);
        return null;
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = data.content?.[0]?.text;
      if (!text) return null;

      // Parse JSON response
      const parsed = JSON.parse(text) as Array<{ name: string; description: string; kid_friendly?: boolean }>;
      return parsed.map(dish => ({
        ...dish,
        source: 'ai_review_analysis' as const
      }));
    } catch (error) {
      console.error('[Enrichment] Failed to parse AI review analysis:', error);
      return null;
    }
  }

  /**
   * Fetch ticket/admission prices for attractions
   * Uses website URL and activity name to search for pricing info
   */
  private static async fetchTicketPrices(
    activityName: string,
    websiteUrl: string,
    locationName: string | undefined,
    anthropicApiKey?: string
  ): Promise<{
    adult?: string;
    child?: string;
    senior?: string;
    family?: string;
    free_under_age?: number;
    currency?: string;
    source?: string;
    fetched_at?: string;
  } | null> {
    // For now, we'll use web search via Perplexity if available,
    // or try to extract from the website if it's accessible
    // This is a placeholder that can be enhanced with actual web scraping

    if (!anthropicApiKey) return null;

    try {
      // Use AI to search for ticket prices based on the activity name
      const searchQuery = `${activityName} ${locationName || ''} ticket price admission cost`;

      // This would ideally use Perplexity or web search
      // For now, return null and let the import process handle pricing
      // The pricing data typically comes from Claude's research during import
      console.log(`[Enrichment] Ticket price lookup for: ${searchQuery}`);

      return {
        source: websiteUrl,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Enrichment] Failed to fetch ticket prices:', error);
      return null;
    }
  }

  /**
   * Fetch place details from Google Places API
   * Includes opening hours, ratings, and photos
   */
  private static async fetchGooglePlaceDetails(
    placeId: string,
    apiKey: string
  ): Promise<{
    opening_hours?: TripActivityWithGoogleData['opening_hours'];
    rating?: number;
    user_ratings_total?: number;
    photos?: Array<{ photo_reference: string; width: number; height: number }>;
  } | null> {
    try {
      // Include photos in the fields
      const fields = 'opening_hours,rating,user_ratings_total,photos';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json() as {
        status: string;
        result?: {
          opening_hours?: {
            open_now?: boolean;
            periods?: Array<{
              open: { day: number; time: string };
              close?: { day: number; time: string };
            }>;
            weekday_text?: string[];
          };
          rating?: number;
          user_ratings_total?: number;
          photos?: Array<{
            photo_reference: string;
            width: number;
            height: number;
          }>;
        };
      };

      if (data.status !== 'OK' || !data.result) {
        return null;
      }

      const result = data.result;

      return {
        opening_hours: result.opening_hours ? {
          open_now: result.opening_hours.open_now,
          periods: result.opening_hours.periods?.map((p) => ({
            open: { day: p.open.day, time: p.open.time },
            close: p.close ? { day: p.close.day, time: p.close.time } : { day: p.open.day, time: '2359' },
          })),
          weekday_text: result.opening_hours.weekday_text,
        } : undefined,
        rating: result.rating,
        user_ratings_total: result.user_ratings_total,
        photos: result.photos?.map(p => ({
          photo_reference: p.photo_reference,
          width: p.width,
          height: p.height,
        })),
      };
    } catch (error) {
      console.error('Error fetching Google Place details:', error);
      return null;
    }
  }

  /**
   * Update validation status on schedule items
   */
  static async updateScheduleItemValidation(
    scheduleItemId: string,
    issues: ValidationIssue[]
  ): Promise<void> {
    const itemIssues = issues.filter(i => i.scheduleItemId === scheduleItemId);

    let status: 'valid' | 'warning' | 'error' = 'valid';
    if (itemIssues.some(i => i.severity === 'error')) {
      status = 'error';
    } else if (itemIssues.some(i => i.severity === 'warning')) {
      status = 'warning';
    }

    await supabase
      .from('daily_schedule_items')
      .update({
        validation_status: status,
        validation_issues: itemIssues.length > 0 ? itemIssues : null,
      })
      .eq('id', scheduleItemId);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

function formatTime(time: string): string {
  // Convert "0900" to "9:00 AM"
  const hours = parseInt(time.slice(0, 2));
  const minutes = time.slice(2);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes} ${ampm}`;
}

function timeToMinutes(time: string): number {
  // Convert "09:30" to 570 (minutes since midnight)
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTimeFromMinutes(minutes: number): string {
  // Convert 570 to "9:30 AM"
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  // Calculate distance in km using Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Parse local date and time from an ISO 8601 datetime string.
 * The local time is the time as displayed in the datetime, before timezone conversion.
 * e.g., "2026-06-15T11:00:00+01:00" -> { date: "2026-06-15", hours: 11, minutes: 0, totalMinutes: 660 }
 *
 * This avoids JavaScript Date's timezone conversion issues.
 */
function parseLocalDateTime(isoString: string): { date: string; hours: number; minutes: number; totalMinutes: number } | null {
  if (!isoString) return null;

  // ISO 8601 format: YYYY-MM-DDTHH:MM:SS+TZ or YYYY-MM-DDTHH:MM:SS.sssZ
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;

  const date = match[1];
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);

  return {
    date,
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes
  };
}
