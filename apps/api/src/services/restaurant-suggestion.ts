/**
 * Restaurant Suggestion Service
 *
 * Discovers and ranks real restaurants to replace generic meal slots
 * ("Breakfast", "Lunch", "Dinner") in trip activities.
 *
 * Uses Google Places searchText with location bias, ranks by rating/proximity/
 * kid-friendliness, and applies primary + alternate suggestions.
 */

import { createClient } from '@supabase/supabase-js';
import { trackApiUsage } from './api-usage-tracking';
import { haversineDistance } from './google-routes-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ──────────────────────────────────────────────────────────────

interface GenericMealSlot {
  activityId: string;
  dayId: string;
  date: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'coffee';
  sortOrder: number;
  segmentId?: string;
}

interface SearchCenter {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

interface RestaurantCandidate {
  placeId: string;
  name: string;
  rating: number;
  reviewCount: number;
  priceLevel: number;       // 0-4
  latitude: number;
  longitude: number;
  address?: string;
  website?: string;
  phone?: string;
  cuisineType?: string;
  goodForChildren?: boolean;
  photos?: Array<{ name: string; widthPx: number; heightPx: number }>;
  reviews?: Array<{ text?: { text: string }; rating?: number }>;
  distanceKm: number;
  score: number;
}

interface SuggestionResult {
  mealsProcessed: number;
  suggestionsApplied: number;
  alternatesCreated: number;
  errors: string[];
}

// ─── Generic Meal Detection ─────────────────────────────────────────────

const GENERIC_MEAL_PATTERNS = [
  /^breakfast$/i,
  /^lunch$/i,
  /^dinner$/i,
  /^hotel breakfast$/i,
  /^breakfast at hotel$/i,
  /^breakfast at accommodation$/i,
  /^breakfast \(at hotel\)$/i,
  /^lunch \(at hotel\)$/i,
  /^dinner \(at hotel\)$/i,
  /^room service$/i,
  /^snack$/i,
  /^coffee$/i,
  /^morning coffee$/i,
  /^afternoon snack$/i,
  /^evening dinner$/i,
];

function isGenericMealName(name: string): boolean {
  return GENERIC_MEAL_PATTERNS.some(p => p.test(name.trim()));
}

function inferMealType(name: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'coffee' {
  const lower = name.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('morning')) return 'breakfast';
  if (lower.includes('lunch') || lower.includes('midday')) return 'lunch';
  if (lower.includes('dinner') || lower.includes('supper') || lower.includes('evening')) return 'dinner';
  if (lower.includes('snack') || lower.includes('gelato') || lower.includes('ice cream')) return 'snack';
  if (lower.includes('coffee') || lower.includes('café') || lower.includes('cafe')) return 'coffee';
  return 'lunch'; // default
}

// ─── Search Center Calculation ──────────────────────────────────────────

/**
 * Calculate search center based on meal type:
 * - Breakfast: hotel location (families eat near hotel)
 * - Lunch: midpoint between preceding and following activities
 * - Dinner: 60% hotel / 40% last activity (near hotel for families)
 */
function calculateSearchCenter(
  mealType: string,
  hotelLocation: { latitude: number; longitude: number } | null,
  surroundingActivities: Array<{ latitude: number; longitude: number }>,
): SearchCenter {
  const defaultRadius: Record<string, number> = {
    breakfast: 500,
    lunch: 1500,
    dinner: 1000,
    snack: 800,
    coffee: 500,
  };

  const radius = defaultRadius[mealType] || 1000;

  // Breakfast: use hotel
  if (mealType === 'breakfast' && hotelLocation) {
    return { ...hotelLocation, radiusMeters: radius };
  }

  // Dinner: weighted toward hotel (60% hotel, 40% last activity)
  if (mealType === 'dinner' && hotelLocation) {
    const lastActivity = surroundingActivities.length > 0
      ? surroundingActivities[surroundingActivities.length - 1]
      : null;

    if (lastActivity) {
      return {
        latitude: hotelLocation.latitude * 0.6 + lastActivity.latitude * 0.4,
        longitude: hotelLocation.longitude * 0.6 + lastActivity.longitude * 0.4,
        radiusMeters: radius,
      };
    }
    return { ...hotelLocation, radiusMeters: radius };
  }

  // Lunch: midpoint of surrounding activities
  if (surroundingActivities.length >= 2) {
    const first = surroundingActivities[0];
    const last = surroundingActivities[surroundingActivities.length - 1];
    return {
      latitude: (first.latitude + last.latitude) / 2,
      longitude: (first.longitude + last.longitude) / 2,
      radiusMeters: radius,
    };
  }

  // Fallback: hotel or first activity
  if (hotelLocation) {
    return { ...hotelLocation, radiusMeters: radius };
  }
  if (surroundingActivities.length > 0) {
    return { ...surroundingActivities[0], radiusMeters: radius };
  }

  // No location data at all — can't search
  return { latitude: 0, longitude: 0, radiusMeters: 0 };
}

// ─── Google Places Search ───────────────────────────────────────────────

async function searchRestaurants(
  apiKey: string,
  query: string,
  center: SearchCenter,
): Promise<RestaurantCandidate[]> {
  if (center.latitude === 0 && center.longitude === 0) return [];

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
    'places.location',
    'places.formattedAddress',
    'places.websiteUri',
    'places.goodForChildren',
    'places.photos',
    'places.reviews',
    'places.primaryType',
  ].join(',');

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
        includedType: 'restaurant',
        locationBias: {
          circle: {
            center: {
              latitude: center.latitude,
              longitude: center.longitude,
            },
            radius: center.radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error(`[RestaurantSuggestion] Places API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as {
      places?: Array<{
        id: string;
        displayName?: { text: string };
        rating?: number;
        userRatingCount?: number;
        priceLevel?: string;
        location?: { latitude: number; longitude: number };
        formattedAddress?: string;
        websiteUri?: string;
        goodForChildren?: boolean;
        photos?: Array<{ name: string; widthPx: number; heightPx: number }>;
        reviews?: Array<{ text?: { text: string }; rating?: number }>;
        primaryType?: string;
      }>;
    };

    if (!data.places || data.places.length === 0) return [];

    const priceLevelMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };

    return data.places.map(place => {
      const lat = place.location?.latitude || center.latitude;
      const lng = place.location?.longitude || center.longitude;
      const distKm = haversineDistance(center.latitude, center.longitude, lat, lng);

      return {
        placeId: place.id,
        name: place.displayName?.text || 'Unknown',
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        priceLevel: priceLevelMap[place.priceLevel || ''] ?? 2,
        latitude: lat,
        longitude: lng,
        address: place.formattedAddress,
        website: place.websiteUri,
        goodForChildren: place.goodForChildren,
        photos: place.photos?.slice(0, 3),
        reviews: place.reviews,
        cuisineType: place.primaryType,
        distanceKm: distKm,
        score: 0, // will be computed in ranking
      };
    });
  } catch (error) {
    console.error('[RestaurantSuggestion] Search failed:', error);
    return [];
  }
}

// ─── Ranking ────────────────────────────────────────────────────────────

/**
 * Score = 0.3×rating + 0.3×proximity + 0.2×kid_friendly + 0.1×reviews + 0.1×price_fit
 */
function rankRestaurants(
  candidates: RestaurantCandidate[],
  targetPriceLevel: number = 2
): RestaurantCandidate[] {
  if (candidates.length === 0) return [];

  const maxDist = Math.max(...candidates.map(c => c.distanceKm), 0.1);
  const maxReviews = Math.max(...candidates.map(c => c.reviewCount), 1);

  for (const c of candidates) {
    const ratingScore = (c.rating / 5) * 0.3;
    const proximityScore = (1 - c.distanceKm / maxDist) * 0.3;
    const kidFriendlyScore = (c.goodForChildren ? 1 : 0.3) * 0.2;
    const reviewScore = (Math.min(c.reviewCount, 500) / maxReviews) * 0.1;
    const priceFitScore = (1 - Math.abs(c.priceLevel - targetPriceLevel) / 4) * 0.1;

    c.score = ratingScore + proximityScore + kidFriendlyScore + reviewScore + priceFitScore;
  }

  return candidates.sort((a, b) => b.score - a.score);
}

// ─── Review Analysis (Reuse pattern from schedule-validation) ───────────

async function extractDishesFromReviews(
  reviews: Array<{ text?: { text: string }; rating?: number }>,
  restaurantName: string,
  anthropicApiKey: string
): Promise<Array<{ name: string; description: string; kid_friendly?: boolean }> | null> {
  if (!reviews || reviews.length === 0) return null;

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
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze these Google reviews for "${restaurantName}" and extract the top 3-5 most recommended dishes.

Reviews:
${reviewTexts}

Return a JSON array: [{"name": "Dish name", "description": "Brief description", "kid_friendly": true/false}]
Only include positively mentioned dishes. Return [] if none.
Return ONLY JSON.`,
        }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { content: Array<{ text: string }> };
    const text = data.content?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Main Service ───────────────────────────────────────────────────────

export class RestaurantSuggestionService {
  /**
   * Find and replace generic meal slots with real restaurant suggestions.
   */
  static async suggestRestaurantsForTrip(
    tripId: string,
    userId: string,
    googleApiKey: string,
    anthropicApiKey?: string,
    segmentId?: string
  ): Promise<SuggestionResult> {
    const result: SuggestionResult = {
      mealsProcessed: 0,
      suggestionsApplied: 0,
      alternatesCreated: 0,
      errors: [],
    };

    const log = (msg: string, details?: Record<string, unknown>) => {
      console.log(`[RestaurantSuggestion] ${msg}`, details ? JSON.stringify(details) : '');
    };

    // 1. Get trip activities (optionally filtered by segment)
    let actQuery = supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_backup', false);

    if (segmentId) {
      actQuery = actQuery.eq('segment_id', segmentId);
    }

    const { data: activities, error: actError } = await actQuery
      .order('sort_order', { ascending: true });

    if (actError || !activities) {
      result.errors.push('Failed to fetch activities');
      return result;
    }

    // 2. Get accommodations
    const { data: accommodations } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('check_in_date', { ascending: true });

    // 3. Find generic meal slots
    const genericMeals = this.findGenericMealSlots(activities);
    log('Found generic meals', { count: genericMeals.length });

    if (genericMeals.length === 0) return result;

    // 4. Get segment info for city context
    const { data: segments } = await supabase
      .from('trip_segments')
      .select('id, name, primary_location')
      .eq('trip_id', tripId);

    // 5. Process each generic meal
    for (const meal of genericMeals) {
      try {
        result.mealsProcessed++;

        // Get hotel for this date
        const hotel = this.getAccommodationForDate(meal.date, accommodations || []);

        // Get surrounding activities for this day (excluding the meal itself)
        const dayActivities = activities.filter(
          (a: any) => (a.day_id === meal.dayId || a.date === meal.date) &&
            a.id !== meal.activityId &&
            a.latitude && a.longitude
        );

        const hotelLocation = hotel?.latitude && hotel?.longitude
          ? { latitude: hotel.latitude, longitude: hotel.longitude }
          : null;

        // Calculate search center
        const center = calculateSearchCenter(
          meal.mealType,
          hotelLocation,
          dayActivities.map((a: any) => ({ latitude: a.latitude, longitude: a.longitude }))
        );

        if (center.latitude === 0 && center.longitude === 0) {
          log('No location data for meal', { meal: meal.name, date: meal.date });
          continue;
        }

        // Get segment context for the query
        const segment = segments?.find((s: any) => s.id === meal.segmentId);
        const cityContext = segment?.primary_location || '';

        // Search for restaurants
        const query = `family friendly ${meal.mealType} restaurant ${cityContext}`.trim();
        const candidates = await searchRestaurants(googleApiKey, query, center);

        // Track API usage
        await trackApiUsage({
          userId,
          provider: 'google_places',
          apiType: 'text_search',
          count: 1,
          contextType: 'travel_planning',
          contextId: tripId,
          metadata: { purpose: 'restaurant_suggestion', mealType: meal.mealType },
        });

        if (candidates.length === 0) {
          log('No restaurants found', { meal: meal.name, date: meal.date, query });
          continue;
        }

        // Rank candidates
        const ranked = rankRestaurants(candidates);
        const primary = ranked[0];

        // Find an alternate with different cuisine for variety
        const alternate = ranked.find(c =>
          c.placeId !== primary.placeId &&
          c.cuisineType !== primary.cuisineType
        ) || (ranked.length > 1 ? ranked[1] : null);

        log('Selected restaurants', {
          meal: meal.name,
          primary: primary.name,
          alternate: alternate?.name,
          primaryScore: primary.score.toFixed(3),
        });

        // Extract recommended dishes from primary (if we have reviews + Anthropic key)
        let signatureDishes: Array<{ name: string; description: string; kid_friendly?: boolean }> | null = null;
        if (primary.reviews && anthropicApiKey) {
          signatureDishes = await extractDishesFromReviews(
            primary.reviews,
            primary.name,
            anthropicApiKey
          );
        }

        // Apply primary: update existing activity in-place
        const updateData: Record<string, unknown> = {
          name: primary.name,
          latitude: primary.latitude,
          longitude: primary.longitude,
          address: primary.address,
          website: primary.website,
          google_place_id: primary.placeId,
          google_rating: primary.rating,
          google_review_count: primary.reviewCount,
          google_price_level: primary.priceLevel,
          restaurant_suggestion_source: 'ai_discovery',
          activity_sub_type: meal.mealType,
          updated_at: new Date().toISOString(),
        };

        if (signatureDishes && signatureDishes.length > 0) {
          updateData.restaurant_details = {
            signature_dishes: signatureDishes.map(d => ({ ...d, source: 'ai_review_analysis' })),
            cuisine_type: primary.cuisineType || 'restaurant',
          };
        }

        const { error: updateError } = await supabase
          .from('trip_activities')
          .update(updateData)
          .eq('id', meal.activityId);

        if (updateError) {
          result.errors.push(`Failed to update ${meal.name}: ${updateError.message}`);
          continue;
        }

        result.suggestionsApplied++;

        // Create alternate as backup activity
        if (alternate) {
          const { error: insertError } = await supabase
            .from('trip_activities')
            .insert({
              trip_id: tripId,
              day_id: meal.dayId,
              date: meal.date,
              segment_id: meal.segmentId || null,
              name: alternate.name,
              activity_type: 'restaurant',
              activity_sub_type: meal.mealType,
              latitude: alternate.latitude,
              longitude: alternate.longitude,
              address: alternate.address,
              website: alternate.website,
              google_place_id: alternate.placeId,
              google_rating: alternate.rating,
              google_review_count: alternate.reviewCount,
              google_price_level: alternate.priceLevel,
              is_backup: true,
              alternate_to_activity_id: meal.activityId,
              restaurant_suggestion_source: 'ai_discovery',
              sort_order: meal.sortOrder,
              cost_currency: 'USD',
              reservation_required: false,
            });

          if (!insertError) {
            result.alternatesCreated++;
          } else {
            result.errors.push(`Failed to create alternate for ${meal.name}: ${insertError.message}`);
          }
        }

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        result.errors.push(`Error processing ${meal.name}: ${String(error)}`);
      }
    }

    // 6. Check hotel restaurants as additional alternates
    if (accommodations) {
      await this.checkHotelRestaurants(tripId, accommodations, genericMeals, result);
    }

    log('Complete', {
      processed: result.mealsProcessed,
      applied: result.suggestionsApplied,
      alternates: result.alternatesCreated,
      errors: result.errors.length,
    });

    return result;
  }

  /**
   * Find activities that are generic meal placeholders.
   */
  static findGenericMealSlots(activities: any[]): GenericMealSlot[] {
    return activities
      .filter(a => {
        // Must be a restaurant type (or have a generic meal name)
        const isRestaurantType = a.activity_type === 'restaurant';
        const hasGenericName = isGenericMealName(a.name);
        // Don't re-suggest for already suggested meals
        const notAlreadySuggested = !a.restaurant_suggestion_source;
        // Must not have a Google Place ID (already enriched)
        const notEnriched = !a.google_place_id;

        return (isRestaurantType || hasGenericName) && notAlreadySuggested && notEnriched && hasGenericName;
      })
      .map(a => ({
        activityId: a.id,
        dayId: a.day_id,
        date: a.date,
        name: a.name,
        mealType: a.activity_sub_type || inferMealType(a.name),
        sortOrder: a.sort_order,
        segmentId: a.segment_id,
      }));
  }

  /**
   * Get accommodation for a date.
   */
  private static getAccommodationForDate(date: string, accommodations: any[]): any | null {
    for (const acc of accommodations) {
      if (date >= acc.check_in_date && date < acc.check_out_date) {
        return acc;
      }
    }
    // Fallback
    const sorted = [...accommodations].sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (date >= sorted[i].check_in_date) return sorted[i];
    }
    return accommodations.length > 0 ? accommodations[0] : null;
  }

  /**
   * Check if any accommodations have on-site restaurants and add them as alternates.
   */
  private static async checkHotelRestaurants(
    tripId: string,
    accommodations: any[],
    genericMeals: GenericMealSlot[],
    result: SuggestionResult
  ): Promise<void> {
    // Only process accommodations that have restaurant amenities
    for (const acc of accommodations) {
      if (!acc.latitude || !acc.longitude) continue;

      // Check if accommodation name suggests it has a restaurant
      const nameHints = ['resort', 'hotel', 'inn', 'lodge'];
      const hasRestaurantHint = nameHints.some(h =>
        (acc.name || '').toLowerCase().includes(h)
      );
      if (!hasRestaurantHint) continue;

      // Find breakfast meals that occur during this stay
      const breakfastMeals = genericMeals.filter(m =>
        m.mealType === 'breakfast' &&
        m.date >= acc.check_in_date &&
        m.date < acc.check_out_date
      );

      for (const meal of breakfastMeals) {
        // Check if we already created an alternate for this meal
        const { data: existing } = await supabase
          .from('trip_activities')
          .select('id')
          .eq('alternate_to_activity_id', meal.activityId)
          .eq('restaurant_suggestion_source', 'hotel_restaurant')
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error: insertError } = await supabase
          .from('trip_activities')
          .insert({
            trip_id: tripId,
            day_id: meal.dayId,
            date: meal.date,
            segment_id: meal.segmentId || null,
            name: `${acc.name} Restaurant`,
            description: `Breakfast at the hotel - convenient option`,
            activity_type: 'restaurant',
            activity_sub_type: 'breakfast',
            latitude: acc.latitude,
            longitude: acc.longitude,
            address: acc.address,
            is_backup: true,
            alternate_to_activity_id: meal.activityId,
            restaurant_suggestion_source: 'hotel_restaurant',
            sort_order: meal.sortOrder,
            cost_currency: 'USD',
            reservation_required: false,
          });

        if (!insertError) {
          result.alternatesCreated++;
        }
      }
    }
  }
}
