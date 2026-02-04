/**
 * RV Enrichment Service
 *
 * Handles Google Places integration and AI-powered review analysis for RV Locations.
 * - Search for places by name + city/state
 * - Fetch place details (rating, reviews, hours, photos)
 * - Analyze reviews with Claude to generate summaries and highlights
 * - Enrich activities with Google data
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { AIAPIKeyService } from '../modules/ai-api-keys/services/aiAPIKeyService';
import {
  fetchAndStoreRVLocationPhotos,
  GooglePhoto,
} from './google-photo-service';
import {
  RVLocation,
  RVLocationActivity,
  RVEnrichmentOptions,
  RVEnrichmentResult,
  RVReviewHighlights,
  RVActivitySuggestion,
  RVActivityType,
} from '@singularity/shared-types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Google Places API Types
interface GooglePlaceSearchResult {
  places: Array<{
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
  }>;
}

interface GooglePlaceDetails {
  id: string;
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: {
    weekdayDescriptions: string[];
    periods: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions?: Array<{
      displayName: string;
      uri: string;
    }>;
  }>;
  reviews?: Array<{
    name: string;
    relativePublishTimeDescription: string;
    rating: number;
    text: { text: string };
    authorAttribution: {
      displayName: string;
      uri: string;
      photoUri: string;
    };
    publishTime: string;
  }>;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
}

interface ReviewAnalysis {
  summary: string;
  positive: Array<{ text: string; author?: string; rating?: number }>;
  negative: Array<{ text: string; author?: string; rating?: number }>;
}

/**
 * Convert Google price level string to number
 */
function priceLevelToNumber(priceLevel: string): number {
  const levels: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return levels[priceLevel] ?? 2;
}

/**
 * Search for a Google Place by name and location
 */
export async function searchGooglePlace(
  name: string,
  city?: string,
  state?: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY not configured');
    return null;
  }

  const locationParts = [city, state].filter(Boolean).join(', ');
  const searchQuery = locationParts ? `${name} ${locationParts}` : name;

  const searchUrl = 'https://places.googleapis.com/v1/places:searchText';

  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 3,
      }),
    });

    if (!response.ok) {
      console.error('Google Places search failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json() as GooglePlaceSearchResult;

    if (data.places && data.places.length > 0) {
      // Return the first result's place ID
      return data.places[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error searching Google Places:', error);
    return null;
  }
}

/**
 * Fetch detailed place information including reviews
 */
export async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY not configured');
    return null;
  }

  const fields = 'id,displayName,rating,userRatingCount,priceLevel,regularOpeningHours,photos,reviews,formattedAddress,location,websiteUri,nationalPhoneNumber,googleMapsUri';
  const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${apiKey}`;

  try {
    const response = await fetch(placeUrl, {
      headers: { 'X-Goog-FieldMask': fields }
    });

    if (!response.ok) {
      console.error('Google Places details failed:', response.status, await response.text());
      return null;
    }

    return await response.json() as GooglePlaceDetails;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

/**
 * Analyze reviews using Claude to extract summary and highlights
 */
export async function analyzeReviews(
  reviews: GooglePlaceDetails['reviews'],
  locationName: string,
  userId: string
): Promise<ReviewAnalysis> {
  if (!reviews || reviews.length === 0) {
    return {
      summary: 'No reviews available.',
      positive: [],
      negative: [],
    };
  }

  // Get user's Anthropic API key from database
  const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
  if (!keyData) {
    console.error(`No Anthropic API key found for user ${userId}`);
    return {
      summary: 'Unable to analyze reviews - no API key configured.',
      positive: [],
      negative: [],
    };
  }

  const anthropic = new Anthropic({ apiKey: keyData.api_key });

  const reviewsText = reviews.map((r, i) =>
    `Review ${i + 1} (${r.rating}/5 stars by ${r.authorAttribution.displayName}):\n${r.text.text}`
  ).join('\n\n');

  const prompt = `Analyze these Google reviews for "${locationName}" and provide:
1. A 2-3 sentence summary that captures the overall sentiment and what makes this place special (or not)
2. 2-3 specific positive quotes that highlight what people love
3. 1-2 specific concerns or negative aspects mentioned (if any)

Reviews:
${reviewsText}

Respond in JSON format:
{
  "summary": "2-3 sentence summary here",
  "positive": [
    { "text": "quote here", "author": "reviewer name", "rating": 5 }
  ],
  "negative": [
    { "text": "quote here", "author": "reviewer name", "rating": 2 }
  ]
}

Focus on quotes that would help a family with young kids decide whether to visit. Keep quotes concise (1-2 sentences max).`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error analyzing reviews with Claude:', error);
    return {
      summary: 'Unable to analyze reviews.',
      positive: [],
      negative: [],
    };
  }
}

/**
 * Generate activity suggestions using Claude
 */
export async function suggestActivities(
  location: RVLocation,
  existingActivities: RVLocationActivity[],
  userId: string,
  familyProfile?: Record<string, unknown>
): Promise<RVActivitySuggestion[]> {
  // Get user's Anthropic API key from database
  const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
  if (!keyData) {
    console.error(`No Anthropic API key found for user ${userId}`);
    return [];
  }

  const anthropic = new Anthropic({ apiKey: keyData.api_key });

  const existingNames = existingActivities.map(a => a.name).join(', ');

  const prompt = `Suggest 3-5 specific activities for families visiting "${location.name}" in ${location.city || ''}, ${location.state || ''}.

Category: ${location.category || 'unknown'}
Description: ${location.description || 'N/A'}
Hook: ${location.hook || 'N/A'}

Existing activities (don't duplicate): ${existingNames || 'None'}

Family profile:
- Kids ages: 12, 8, and 4 (Parker, Charlotte, Xander)
- Interests: Outdoor adventures, learning, photography
- Equipment: 30ft 5th wheel, bikes, paddle board, kayak

For each suggested activity, provide:
1. Specific name (e.g., "Zabriskie Point Sunrise Photography" not just "photography")
2. Activity type from: hike, bike, swim, fish, kayak, paddleboard, horseback, wildlife_viewing, stargazing, hot_springs, beach, playground, visitor_center, ranger_program, scenic_drive, photography, other
3. Brief description
4. Duration
5. Difficulty (easy/moderate/difficult)
6. Why it's recommended for this family
7. Kid suitability for each child

Respond in JSON format:
{
  "suggestions": [
    {
      "name": "Activity Name",
      "activity_type": "hike",
      "description": "Brief description",
      "duration_text": "1-2 hours",
      "difficulty": "easy",
      "why_recommended": "Why this is great for families",
      "kid_engagement": {
        "parker": { "suitable": true, "engagement_level": 5, "activities": ["specific things Parker would enjoy"] },
        "charlotte": { "suitable": true, "engagement_level": 4, "activities": ["specific things Charlotte would enjoy"] },
        "xander": { "suitable": true, "engagement_level": 3, "activities": ["specific things Xander would enjoy"] }
      }
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText);
    return parsed.suggestions || [];
  } catch (error) {
    console.error('Error generating activity suggestions:', error);
    return [];
  }
}

/**
 * Main enrichment function for an RV Location
 */
export async function enrichLocation(
  locationId: string,
  userId: string,
  options: RVEnrichmentOptions = {}
): Promise<RVEnrichmentResult> {
  const {
    fetch_reviews = true,
    fetch_photos = true,
    fetch_hours = true,
    enrich_activities = true,
    max_photos = 10,
  } = options;

  const result: RVEnrichmentResult = {
    success: false,
    location_updated: false,
    activities_enriched: 0,
    photos_added: 0,
    reviews_fetched: 0,
    errors: [],
  };

  try {
    // 1. Fetch the location
    const { data: location, error: locError } = await supabase
      .from('rv_locations')
      .select('*')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (locError || !location) {
      result.errors?.push('Location not found');
      return result;
    }

    // 2. Search for Google Place ID if not already set
    let placeId = location.google_place_id;
    if (!placeId) {
      placeId = await searchGooglePlace(location.name, location.city, location.state);
      if (!placeId) {
        result.errors?.push('Could not find Google Place for this location');
        return result;
      }
    }

    // 3. Fetch place details
    const placeDetails = await fetchPlaceDetails(placeId);
    if (!placeDetails) {
      result.errors?.push('Failed to fetch Google Place details');
      return result;
    }

    // 4. Update location with basic Google data
    const updateData: Record<string, any> = {
      google_place_id: placeId,
      google_rating: placeDetails.rating,
      google_review_count: placeDetails.userRatingCount,
      google_price_level: placeDetails.priceLevel ? priceLevelToNumber(placeDetails.priceLevel) : undefined,
      latitude: placeDetails.location?.latitude || location.latitude,
      longitude: placeDetails.location?.longitude || location.longitude,
      address: placeDetails.formattedAddress || location.address,
      website: placeDetails.websiteUri || location.website,
      phone: placeDetails.nationalPhoneNumber || location.phone,
      enriched_at: new Date().toISOString(),
    };

    // 5. Analyze reviews if available
    if (fetch_reviews && placeDetails.reviews && placeDetails.reviews.length > 0) {
      result.reviews_fetched = placeDetails.reviews.length;

      // Store raw reviews
      updateData.google_reviews = placeDetails.reviews;

      // Analyze with Claude
      const analysis = await analyzeReviews(placeDetails.reviews, location.name, userId);

      updateData.reviews_summary = analysis.summary;
      updateData.reviews_highlights = {
        positive: analysis.positive,
        negative: analysis.negative,
        summary: analysis.summary,
        last_updated: new Date().toISOString(),
      } as RVReviewHighlights;
    }

    // 6. Update the location
    const { error: updateError } = await supabase
      .from('rv_locations')
      .update(updateData)
      .eq('id', locationId);

    if (updateError) {
      result.errors?.push(`Failed to update location: ${updateError.message}`);
      return result;
    }

    result.location_updated = true;

    // 7. Fetch and store photos using shared service (with content-hash deduplication)
    if (fetch_photos && placeDetails.photos && placeDetails.photos.length > 0) {
      const photoResult = await fetchAndStoreRVLocationPhotos(
        locationId,
        userId,
        placeDetails.photos as GooglePhoto[],
        { maxPhotos: max_photos }
      );
      result.photos_added = photoResult.photosAdded;
      if (photoResult.photosSkipped > 0) {
        console.log(`[RV Enrichment] ${photoResult.photosSkipped} duplicate photos skipped`);
      }
      if (photoResult.errors.length > 0) {
        result.errors?.push(...photoResult.errors);
      }
    }

    // 8. Enrich activities
    if (enrich_activities) {
      const { data: activities } = await supabase
        .from('rv_location_activities')
        .select('*')
        .eq('location_id', locationId)
        .is('google_place_id', null);

      if (activities && activities.length > 0) {
        for (const activity of activities) {
          // Try to find a Google Place for this activity
          const activityPlaceId = await searchGooglePlace(
            activity.name,
            location.city,
            location.state
          );

          if (activityPlaceId) {
            const activityDetails = await fetchPlaceDetails(activityPlaceId);

            if (activityDetails) {
              const activityUpdate: Record<string, any> = {
                google_place_id: activityPlaceId,
                google_rating: activityDetails.rating,
                google_review_count: activityDetails.userRatingCount,
                google_maps_url: activityDetails.googleMapsUri,
                enriched_at: new Date().toISOString(),
              };

              if (fetch_hours && activityDetails.regularOpeningHours) {
                activityUpdate.opening_hours = activityDetails.regularOpeningHours;
              }

              await supabase
                .from('rv_location_activities')
                .update(activityUpdate)
                .eq('id', activity.id);

              result.activities_enriched++;
            }
          }
        }
      }
    }

    result.success = true;
    return result;

  } catch (error: any) {
    console.error('Enrichment error:', error);
    result.errors?.push(error.message || 'Unknown error');
    return result;
  }
}
