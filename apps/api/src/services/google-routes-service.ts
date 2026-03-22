/**
 * Google Routes API Service
 *
 * Computes driving/walking travel times between trip activities using the
 * Google Routes API (Directions v2). Falls back to haversine-based estimates
 * when the API is unavailable.
 *
 * Used as a pre-assembly step in POST /trips/:tripId/assemble-schedule.
 */

import { trackApiUsage } from './api-usage-tracking';

// ─── Types ──────────────────────────────────────────────────────────────

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RouteResult {
  from: string;        // Location name
  from_lat: number;
  from_lng: number;
  to: string;          // Location name
  to_lat: number;
  to_lng: number;
  mode: 'DRIVE' | 'WALK';
  durationSeconds: number;
  distanceMeters: number;
  bufferedMinutes: number;  // ceil(duration/60) + 10min buffer
  isLongHaul: boolean;      // > 60min or > 50km
  source: 'google_routes' | 'haversine_estimate';
}

interface DayTravelTimes {
  day_id: string;
  date: string;
  routes: RouteResult[];
  totalTravelMinutes: number;
}

interface TripTravelTimes {
  days: DayTravelTimes[];
  apiCallCount: number;
  totalTravelMinutes: number;
}

interface ActivityLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  activity_type?: string;
  activity_sub_type?: string;
  sort_order: number;
}

interface AccommodationLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  check_in_date: string;
  check_out_date: string;
}

// ─── Haversine Helpers ──────────────────────────────────────────────────

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
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

/**
 * Estimate travel time from distance using simple heuristics.
 * Driving: ~40 km/h average (urban + highway mix)
 * Walking: ~5 km/h
 */
function estimateTravelFromDistance(distanceKm: number, mode: 'DRIVE' | 'WALK'): { durationSeconds: number } {
  const speedKmh = mode === 'WALK' ? 5 : 40;
  const durationHours = distanceKm / speedKmh;
  return { durationSeconds: Math.round(durationHours * 3600) };
}

// ─── Travel Mode Selection ──────────────────────────────────────────────

/**
 * Select travel mode: walk if distance < 1.5km, drive otherwise.
 */
function selectTravelMode(distanceKm: number): 'DRIVE' | 'WALK' {
  return distanceKm < 1.5 ? 'WALK' : 'DRIVE';
}

// ─── Google Routes API ──────────────────────────────────────────────────

/**
 * Call Google Routes API to compute route between two points.
 */
export async function computeRoute(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
  travelMode: 'DRIVE' | 'WALK'
): Promise<{ durationSeconds: number; distanceMeters: number } | null> {
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: origin,
          },
        },
        destination: {
          location: {
            latLng: destination,
          },
        },
        travelMode,
      }),
    });

    if (!response.ok) {
      console.error(`[GoogleRoutes] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
    if (!data.routes || data.routes.length === 0) {
      console.warn('[GoogleRoutes] No routes returned');
      return null;
    }

    const route = data.routes[0];
    // duration comes as "Xs" string (e.g., "1234s")
    const durationStr = route.duration || '0s';
    const durationSeconds = parseInt(durationStr.replace('s', ''), 10) || 0;
    const distanceMeters = route.distanceMeters || 0;

    return { durationSeconds, distanceMeters };
  } catch (error) {
    console.error('[GoogleRoutes] API call failed:', error);
    return null;
  }
}

// ─── Route Computation with Fallback ────────────────────────────────────

async function computeRouteWithFallback(
  apiKey: string | null,
  origin: { name: string; lat: number; lng: number },
  destination: { name: string; lat: number; lng: number }
): Promise<RouteResult> {
  const distanceKm = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const mode = selectTravelMode(distanceKm);

  let durationSeconds: number;
  let distanceMeters: number;
  let source: 'google_routes' | 'haversine_estimate' = 'haversine_estimate';

  if (apiKey) {
    const result = await computeRoute(
      apiKey,
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.lat, longitude: destination.lng },
      mode
    );

    if (result) {
      durationSeconds = result.durationSeconds;
      distanceMeters = result.distanceMeters;
      source = 'google_routes';
    } else {
      // Fallback to haversine
      const estimate = estimateTravelFromDistance(distanceKm, mode);
      durationSeconds = estimate.durationSeconds;
      distanceMeters = Math.round(distanceKm * 1000);
    }
  } else {
    const estimate = estimateTravelFromDistance(distanceKm, mode);
    durationSeconds = estimate.durationSeconds;
    distanceMeters = Math.round(distanceKm * 1000);
  }

  const durationMinutes = Math.ceil(durationSeconds / 60);
  const bufferedMinutes = durationMinutes + 10; // 10-min buffer per plan
  const distKm = distanceMeters / 1000;
  const isLongHaul = durationMinutes > 60 || distKm > 50;

  return {
    from: origin.name,
    from_lat: origin.lat,
    from_lng: origin.lng,
    to: destination.name,
    to_lat: destination.lat,
    to_lng: destination.lng,
    mode,
    durationSeconds,
    distanceMeters,
    bufferedMinutes,
    isLongHaul,
    source,
  };
}

// ─── Trip-Level Orchestration ───────────────────────────────────────────

/**
 * Get the accommodation (hotel) for a given date.
 */
function getAccommodationForDate(
  date: string,
  accommodations: AccommodationLocation[]
): AccommodationLocation | null {
  for (const acc of accommodations) {
    if (date >= acc.check_in_date && date < acc.check_out_date) {
      return acc;
    }
  }
  // Fallback: last accommodation whose check_in_date <= date
  const sorted = [...accommodations].sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (date >= sorted[i].check_in_date) return sorted[i];
  }
  return accommodations.length > 0 ? accommodations[0] : null;
}

/**
 * Compute travel times for an entire trip.
 *
 * For each day:
 * 1. Find hotel for the date
 * 2. Get day's activities sorted by sort_order, filtered to those with lat/lng
 * 3. Compute: hotel→A1, A1→A2, ..., An→hotel
 * 4. Sequential API calls with 100ms delay between them
 */
export async function computeTravelTimesForTrip(
  tripId: string,
  days: Array<{ id: string; date: string }>,
  activities: ActivityLocation[],
  accommodations: AccommodationLocation[],
  apiKey: string | null,
  userId?: string
): Promise<TripTravelTimes> {
  const result: TripTravelTimes = {
    days: [],
    apiCallCount: 0,
    totalTravelMinutes: 0,
  };

  for (const day of days) {
    const dayActivities = activities
      .filter(a => {
        // Match activities to day by day_id or date
        return (a as any).day_id === day.id || (a as any).date === day.date;
      })
      .filter(a => a.latitude && a.longitude)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (dayActivities.length === 0) {
      result.days.push({
        day_id: day.id,
        date: day.date,
        routes: [],
        totalTravelMinutes: 0,
      });
      continue;
    }

    const hotel = getAccommodationForDate(day.date, accommodations);
    const routes: RouteResult[] = [];

    // Build waypoint sequence: hotel → A1 → A2 → ... → An → hotel
    const waypoints: Array<{ name: string; lat: number; lng: number }> = [];

    if (hotel?.latitude && hotel?.longitude) {
      waypoints.push({ name: hotel.name, lat: hotel.latitude, lng: hotel.longitude });
    }

    for (const act of dayActivities) {
      waypoints.push({ name: act.name, lat: act.latitude, lng: act.longitude });
    }

    if (hotel?.latitude && hotel?.longitude) {
      waypoints.push({ name: hotel.name, lat: hotel.latitude, lng: hotel.longitude });
    }

    // Compute route for each consecutive pair
    for (let i = 0; i < waypoints.length - 1; i++) {
      const route = await computeRouteWithFallback(apiKey, waypoints[i], waypoints[i + 1]);
      routes.push(route);

      if (apiKey && route.source === 'google_routes') {
        result.apiCallCount++;
        // 100ms delay between API calls to avoid rate limiting
        if (i < waypoints.length - 2) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    const totalDayMinutes = routes.reduce((sum, r) => sum + r.bufferedMinutes, 0);
    result.days.push({
      day_id: day.id,
      date: day.date,
      routes,
      totalTravelMinutes: totalDayMinutes,
    });
    result.totalTravelMinutes += totalDayMinutes;
  }

  // Track API usage
  if (userId && result.apiCallCount > 0) {
    await trackRouteComputation(userId, result.apiCallCount, tripId);
  }

  return result;
}

// ─── Activity Duration Defaults ─────────────────────────────────────────

/**
 * Get default duration in minutes based on activity category and sub-type.
 */
export function getDefaultDurationMinutes(
  activityType?: string,
  activitySubType?: string
): number {
  // Sub-type specific defaults
  if (activitySubType) {
    switch (activitySubType) {
      case 'museum': return 120;
      case 'hike': return 180;
      case 'beach': return 150;
      case 'viewpoint': return 20;
      case 'tour': return 90;
      case 'water_sport': return 120;
      case 'horseback': return 90;
      case 'shopping': return 60;
      case 'nightlife': return 120;
      case 'sightseeing': return 60;
      case 'outdoor': return 90;
      case 'breakfast': return 45;
      case 'lunch': return 75;
      case 'dinner': return 90;
      case 'snack': return 20;
      case 'coffee': return 30;
      case 'rest': return 60;
      case 'pool': return 90;
      case 'relaxation': return 60;
      case 'check_in': return 30;
      case 'check_out': return 20;
      case 'packing': return 30;
      case 'long_haul': return 0; // computed from route
      case 'local': return 15;
      case 'walking': return 15;
      case 'flight': return 0;    // computed from flight data
      case 'ferry': return 0;     // varies
      case 'train': return 0;     // varies
    }
  }

  // Category-level defaults
  switch (activityType) {
    case 'restaurant': return 75;
    case 'activity': return 90;
    case 'transport': return 30;
    case 'downtime': return 60;
    case 'logistics': return 30;
    default: return 60;
  }
}

// ─── API Usage Tracking ─────────────────────────────────────────────────

const ROUTES_PRICING = {
  compute_routes: 0.005, // $5 per 1,000 requests (Essentials)
};

async function trackRouteComputation(
  userId: string,
  callCount: number,
  tripId?: string
): Promise<void> {
  await trackApiUsage({
    userId,
    provider: 'google_routes',
    apiType: 'compute_routes',
    count: callCount,
    estimatedCostUsd: callCount * ROUTES_PRICING.compute_routes,
    contextType: 'travel_planning',
    contextId: tripId,
  });
}

// ─── Format for AI Context ──────────────────────────────────────────────

/**
 * Format travel times for inclusion in the AI schedule generation prompt.
 */
export function formatTravelTimesForPrompt(travelTimes: TripTravelTimes): string {
  if (travelTimes.days.length === 0) return '';

  const lines: string[] = ['TRAVEL TIMES (pre-computed, include 10-min buffer each):'];

  for (const day of travelTimes.days) {
    if (day.routes.length === 0) continue;

    lines.push(`\nDay ${day.date}:`);
    for (const route of day.routes) {
      const modeStr = route.mode === 'WALK' ? 'walk' : 'drive';
      const distStr = (route.distanceMeters / 1000).toFixed(1);
      const longHaulStr = route.isLongHaul ? ' [LONG-HAUL]' : '';
      lines.push(
        `  ${route.from} → ${route.to}: ${route.bufferedMinutes}min (${modeStr}, ${distStr}km)${longHaulStr}`
      );
    }
    lines.push(`  Day total travel: ${day.totalTravelMinutes}min`);
  }

  return lines.join('\n');
}
