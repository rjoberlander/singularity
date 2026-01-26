import { supabase } from '../config/supabase';
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
   * Returns count of activities enriched
   */
  static async enrichActivitiesWithGoogleData(
    tripId: string,
    userId: string,
    activities: TripActivityWithGoogleData[],
    googleApiKey: string
  ): Promise<{ enriched: number; skipped: number; photosAdded: number; errors: string[] }> {
    const errors: string[] = [];
    let enriched = 0;
    let photosAdded = 0;

    // Skip these activity types that don't have Google Places
    const SKIP_KEYWORDS = [
      'arrive', 'depart', 'drive', 'pick up', 'check-in', 'check in', 'checkout',
      'wake up', 'kids to bed', 'load car', 'pack', 'pool time', 'siesta', 'nap',
      'rest', 'sleep', 'breakfast', 'lunch', 'dinner', 'morning routine'
    ];

    const shouldSkip = (name: string) => {
      const lower = name.toLowerCase();
      return SKIP_KEYWORDS.some(skip => lower.includes(skip));
    };

    // Filter activities that need Google data
    const needsData = activities.filter(a =>
      !a.google_place_id && !shouldSkip(a.name)
    );

    const skipped = activities.filter(a =>
      a.google_place_id || shouldSkip(a.name)
    ).length;

    console.log(`[Enrichment] Processing ${needsData.length} activities, skipping ${skipped}`);

    // Process sequentially to respect rate limits
    for (const activity of needsData) {
      try {
        // Search for place using activity name and location
        const searchQuery = activity.location_name
          ? `${activity.name} ${activity.location_name}`
          : activity.name;

        const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': [
              'places.id', 'places.displayName', 'places.rating', 'places.userRatingCount',
              'places.regularOpeningHours', 'places.photos', 'places.formattedAddress',
              'places.location', 'places.websiteUri'
            ].join(',')
          },
          body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 })
        });

        if (!searchResponse.ok) {
          errors.push(`Search failed for ${activity.name}`);
          continue;
        }

        const searchData = await searchResponse.json() as { places?: Array<{
          id: string;
          displayName?: { text: string };
          rating?: number;
          userRatingCount?: number;
          regularOpeningHours?: {
            openNow?: boolean;
            periods?: Array<{ open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } }>;
            weekdayDescriptions?: string[];
          };
          photos?: Array<{ name: string; widthPx: number; heightPx: number; authorAttributions?: Array<{ displayName: string; uri: string }> }>;
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
        }> };

        const place = searchData.places?.[0];
        if (!place) continue;

        console.log(`[Enrichment] Found ${place.displayName?.text} for ${activity.name}`);

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

        // Update activity with Google data
        const updateData: Record<string, unknown> = {
          google_place_id: place.id,
          google_rating: place.rating,
          google_review_count: place.userRatingCount,
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

        await supabase
          .from('trip_activities')
          .update(updateData)
          .eq('id', activity.id);

        enriched++;

        // Fetch and store photos (up to 20)
        const photos = place.photos?.slice(0, 20) || [];
        for (const photo of photos) {
          try {
            const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?key=${googleApiKey}&maxWidthPx=1600`;
            const photoResponse = await fetch(photoUrl);
            if (!photoResponse.ok) continue;

            const photoBuffer = await photoResponse.arrayBuffer();
            const photoBytes = new Uint8Array(photoBuffer);

            const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
            const storagePath = `travel/${tripId}/activities/${activity.id}/${filename}`;

            const { error: uploadError } = await supabase.storage
              .from('singularity-uploads')
              .upload(storagePath, photoBytes, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) continue;

            const { data: urlData } = supabase.storage
              .from('singularity-uploads')
              .getPublicUrl(storagePath);

            const attribution = photo.authorAttributions?.[0];
            await supabase.from('trip_media').insert({
              trip_id: tripId,
              user_id: userId,
              parent_type: 'activity',
              parent_id: activity.id,
              file_url: urlData.publicUrl,
              media_type: 'image',
              width: photo.widthPx,
              height: photo.heightPx,
              is_google_sourced: true,
              approved: true,
              google_attribution_name: attribution?.displayName,
              google_attribution_uri: attribution?.uri,
              google_photo_reference: photo.name
            });

            photosAdded++;
            await new Promise(r => setTimeout(r, 100));
          } catch (photoError) {
            // Continue on photo errors
          }
        }

        // Rate limiting between activities
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        errors.push(`Failed to enrich ${activity.name}: ${error}`);
      }
    }

    return { enriched, skipped, photosAdded, errors };
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
        photos: result.photos?.slice(0, 5).map(p => ({
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
