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
  trackTextSearch,
  trackPlaceDetails,
  trackAnthropicUsage,
} from './api-usage-tracking';
import {
  RVLocation,
  RVLocationActivity,
  RVEnrichmentOptions,
  RVEnrichmentResult,
  RVReviewHighlights,
  RVActivitySuggestion,
  RVActivityType,
  RVLandType,
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
 * Detect land type based on location name, address, and website
 * Uses keyword matching for common patterns
 */
function detectLandType(
  name: string,
  address?: string,
  website?: string
): RVLandType | null {
  const searchText = `${name} ${address || ''} ${website || ''}`.toLowerCase();

  // Order matters - more specific patterns first

  // National Park Service
  if (
    searchText.includes('national park') ||
    searchText.includes('nps.gov') ||
    /\bnp\b/.test(searchText)
  ) {
    // Check if it's a monument within NPS
    if (searchText.includes('national monument')) {
      return 'national_monument';
    }
    // Check if it's a recreation area
    if (searchText.includes('national recreation area') || searchText.includes('nra')) {
      return 'national_recreation_area';
    }
    return 'national_park';
  }

  // National Monument (can be NPS, BLM, or USFS)
  if (searchText.includes('national monument')) {
    return 'national_monument';
  }

  // National Forest / USFS
  if (
    searchText.includes('national forest') ||
    searchText.includes('usfs') ||
    searchText.includes('fs.usda.gov') ||
    searchText.includes('forest service') ||
    searchText.includes('usda forest')
  ) {
    return 'national_forest';
  }

  // BLM
  if (
    searchText.includes('blm') ||
    searchText.includes('bureau of land management') ||
    searchText.includes('blm.gov')
  ) {
    return 'blm';
  }

  // National Recreation Area
  if (searchText.includes('national recreation area') || searchText.includes('nra')) {
    return 'national_recreation_area';
  }

  // National Wildlife Refuge
  if (
    searchText.includes('wildlife refuge') ||
    searchText.includes('nwr') ||
    searchText.includes('fws.gov')
  ) {
    return 'national_wildlife_refuge';
  }

  // Army Corps of Engineers
  if (
    searchText.includes('army corps') ||
    searchText.includes('corps of engineers') ||
    searchText.includes('usace')
  ) {
    return 'army_corps';
  }

  // State Park
  if (
    searchText.includes('state park') ||
    searchText.includes('state beach') ||
    searchText.includes('state recreation area') ||
    /state\s+(campground|camping)/.test(searchText)
  ) {
    return 'state_park';
  }

  // County Park
  if (
    searchText.includes('county park') ||
    searchText.includes('regional park') ||
    searchText.includes('county campground')
  ) {
    return 'county_park';
  }

  // City Park
  if (
    searchText.includes('city park') ||
    searchText.includes('municipal park') ||
    searchText.includes('city campground')
  ) {
    return 'city_park';
  }

  // Casino
  if (searchText.includes('casino')) {
    return 'casino';
  }

  // Private RV Park (common patterns)
  if (
    searchText.includes('rv park') ||
    searchText.includes('rv resort') ||
    searchText.includes('r.v. park') ||
    searchText.includes('trailer park') ||
    searchText.includes('mobile home park')
  ) {
    return 'private_rv_park';
  }

  // Private Campground (KOA, Good Sam, etc.)
  // BUT NOT if website is recreation.gov (federal) or reserveamerica/reservecalifornia (state)
  const isFederalSite = searchText.includes('recreation.gov');
  const isStateSite = searchText.includes('reserveamerica') || searchText.includes('reservecalifornia');

  if (!isFederalSite && !isStateSite) {
    if (
      searchText.includes('koa') ||
      searchText.includes('kampground') ||
      searchText.includes('good sam') ||
      searchText.includes('thousand trails')
    ) {
      return 'private_campground';
    }

    // Generic "campground" without federal/state indicators - might be private
    // But we'll let AI decide for ambiguous cases
  }

  return null;
}

/**
 * Use AI to detect land type when keyword matching fails
 */
async function detectLandTypeWithAI(
  name: string,
  address?: string,
  city?: string,
  state?: string,
  website?: string,
  userId?: string,
  contextId?: string
): Promise<RVLandType | null> {
  try {
    // Get user's API key
    if (!userId) {
      console.log('[RV Enrichment] No user ID for AI land type detection');
      return null;
    }
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!keyData) {
      console.log('[RV Enrichment] No API key available for AI land type detection');
      return null;
    }

    const anthropic = new Anthropic({ apiKey: keyData.api_key });

    // Check for recreation.gov which indicates federal land
    const isRecreationGov = website?.toLowerCase().includes('recreation.gov');
    const federalHint = isRecreationGov
      ? '\n\nIMPORTANT: The website is recreation.gov, which is the federal reservation system. This strongly indicates federal land (National Forest/USFS, National Park/NPS, BLM, or Army Corps). It is NOT a private campground.'
      : '';

    const prompt = `You are an expert on US public lands and campgrounds. Based on your knowledge and the following information, determine what type of land this campground/RV location is on.

Location: ${name}
Address: ${address || 'Unknown'}
City/State: ${[city, state].filter(Boolean).join(', ') || 'Unknown'}
Website: ${website || 'Unknown'}${federalHint}

Use your knowledge of this specific campground if you know it. Many campgrounds in mountain areas of California, Arizona, Colorado, etc. are on National Forest (USFS) land even if the name doesn't explicitly say "National Forest".

For example:
- Serrano Campground at Big Bear Lake is in San Bernardino National Forest (USFS)
- Buckhorn Campground in the Angeles Crest is in Angeles National Forest (USFS)
- Campgrounds in Yosemite, Yellowstone, Grand Canyon are National Park (NPS)

Classify this location into ONE of these categories:
- national_park (National Park Service managed - includes national parks, some monuments)
- state_park (State park, state beach, state recreation area)
- national_monument (National Monument - can be NPS, BLM, or USFS managed)
- national_forest (US Forest Service / USFS - includes ranger districts, wilderness areas)
- blm (Bureau of Land Management - often desert/remote areas)
- national_recreation_area (National Recreation Area - often around lakes/rivers)
- national_wildlife_refuge (Fish & Wildlife Service)
- army_corps (Army Corps of Engineers - usually near dams/reservoirs)
- county_park (County or regional park)
- city_park (City or municipal park)
- private_rv_park (Private RV park or resort - usually has "RV Park" or "Resort" in name)
- private_campground (Private campground like KOA, Good Sam, Thousand Trails)
- casino (Casino camping)
- other (Only if truly unknown)

Think about what you know about this specific location, then respond with ONLY the category code (e.g., "national_forest"), nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track Anthropic API usage
    if (response.usage && userId) {
      trackAnthropicUsage(
        userId,
        response.usage.input_tokens,
        response.usage.output_tokens,
        'rv_enrichment',
        contextId,
        { model: 'claude-sonnet-4-20250514', task: 'land_type_detection' }
      );
    }

    const result = (response.content[0] as { type: string; text: string }).text.trim().toLowerCase();

    // Validate the response is a valid land type
    const validTypes: RVLandType[] = [
      'national_park', 'state_park', 'national_monument', 'national_forest',
      'blm', 'national_recreation_area', 'national_wildlife_refuge', 'army_corps',
      'county_park', 'city_park', 'private_rv_park', 'private_campground', 'casino', 'other'
    ];

    if (validTypes.includes(result as RVLandType)) {
      console.log(`[RV Enrichment] AI detected land type: ${result} for ${name}`);
      return result as RVLandType;
    }

    console.log(`[RV Enrichment] AI returned invalid land type: ${result}`);
    return null;
  } catch (error) {
    console.error('[RV Enrichment] Error detecting land type with AI:', error);
    return null;
  }
}

/**
 * Search for a Google Place by name and location
 */
export async function searchGooglePlace(
  name: string,
  city?: string,
  state?: string,
  userId?: string,
  contextId?: string
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

    // Track text search API usage
    if (userId) {
      trackTextSearch(userId, 'rv_enrichment', contextId);
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
export async function fetchPlaceDetails(
  placeId: string,
  userId?: string,
  contextId?: string
): Promise<GooglePlaceDetails | null> {
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

    // Track place details API usage
    if (userId) {
      trackPlaceDetails(userId, 'rv_enrichment', contextId);
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
  userId: string,
  contextId?: string
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

    // Track Anthropic API usage
    if (response.usage) {
      trackAnthropicUsage(
        userId,
        response.usage.input_tokens,
        response.usage.output_tokens,
        'rv_enrichment',
        contextId,
        { model: 'claude-sonnet-4-20250514', task: 'review_analysis' }
      );
    }

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

    // Track Anthropic API usage
    if (response.usage) {
      trackAnthropicUsage(
        userId,
        response.usage.input_tokens,
        response.usage.output_tokens,
        'rv_enrichment',
        location.id,
        { model: 'claude-sonnet-4-20250514', task: 'activity_suggestions' }
      );
    }

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
    max_photos = 20, // 20 photos per source (main location + each activity)
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
      placeId = await searchGooglePlace(location.name, location.city, location.state, userId, locationId);
      if (!placeId) {
        result.errors?.push('Could not find Google Place for this location');
        return result;
      }
    }

    // 3. Fetch place details
    const placeDetails = await fetchPlaceDetails(placeId, userId, locationId);
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

    // 4.5. Detect land type if not already set or if it seems incorrect
    const currentWebsite = (placeDetails.websiteUri || location.website || '').toLowerCase();
    const isRecreationGov = currentWebsite.includes('recreation.gov');
    const needsRedetection =
      !location.land_type ||
      location.land_type === 'other' ||
      // Re-detect if marked as private but has federal website
      (isRecreationGov && (location.land_type === 'private_campground' || location.land_type === 'private_rv_park'));

    console.log(`[RV Enrichment] Current land_type: "${location.land_type}", website: "${currentWebsite}", needsRedetection: ${needsRedetection}`);
    if (needsRedetection) {
      console.log(`[RV Enrichment] Running land type detection for ${location.name}`);
      // First try keyword detection (fast, no API call)
      let detectedLandType = detectLandType(
        location.name,
        placeDetails.formattedAddress || location.address,
        placeDetails.websiteUri || location.website
      );

      // If keyword detection failed, use AI to determine land type
      if (!detectedLandType) {
        detectedLandType = await detectLandTypeWithAI(
          location.name,
          placeDetails.formattedAddress || location.address,
          location.city,
          location.state,
          placeDetails.websiteUri || location.website,
          userId,
          locationId
        );
      }

      if (detectedLandType) {
        updateData.land_type = detectedLandType;
        console.log(`[RV Enrichment] Detected land type: ${detectedLandType} for ${location.name}`);
      }
    }

    // 5. Analyze reviews if available
    if (fetch_reviews && placeDetails.reviews && placeDetails.reviews.length > 0) {
      result.reviews_fetched = placeDetails.reviews.length;

      // Store raw reviews
      updateData.google_reviews = placeDetails.reviews;

      // Analyze with Claude
      const analysis = await analyzeReviews(placeDetails.reviews, location.name, userId, locationId);

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
    // Photos are grouped by source: main location gets "Campground" caption
    if (fetch_photos && placeDetails.photos && placeDetails.photos.length > 0) {
      const photoResult = await fetchAndStoreRVLocationPhotos(
        locationId,
        userId,
        placeDetails.photos as GooglePhoto[],
        { maxPhotos: max_photos },
        undefined, // no activity_id for main location
        'Campground' // caption for main location photos
      );
      result.photos_added = photoResult.photosAdded;
      if (photoResult.photosSkipped > 0) {
        console.log(`[RV Enrichment] ${photoResult.photosSkipped} duplicate photos skipped`);
      }
      if (photoResult.errors.length > 0) {
        result.errors?.push(...photoResult.errors);
      }
    }

    // 8. Enrich activities and fetch their photos
    // Each activity gets its own max_photos limit (20 photos per source)
    if (enrich_activities) {
      // Get ALL activities for this location
      const { data: allActivities } = await supabase
        .from('rv_location_activities')
        .select('*')
        .eq('location_id', locationId);

      if (allActivities && allActivities.length > 0) {
        console.log(`[RV Enrichment] Found ${allActivities.length} activities total`);

        // Check which activities already have photos
        const { data: existingActivityPhotos } = await supabase
          .from('rv_location_media')
          .select('activity_id')
          .eq('location_id', locationId)
          .not('activity_id', 'is', null);

        const activitiesWithPhotos = new Set(existingActivityPhotos?.map(p => p.activity_id) || []);

        // Track which Google Place IDs we've already fetched photos for in this session
        // to avoid duplicates when multiple activities resolve to the same place
        const processedPlaceIds = new Set<string>();

        for (const activity of allActivities) {
          let placeId = activity.google_place_id;

          // If activity doesn't have a place ID yet, search for it
          if (!placeId) {
            console.log(`[RV Enrichment] Searching for activity: "${activity.name}" in ${location.city}, ${location.state}`);
            placeId = await searchGooglePlace(
              activity.name,
              location.city,
              location.state,
              userId,
              locationId
            );

            if (placeId) {
              console.log(`[RV Enrichment] Found Google Place for ${activity.name}: ${placeId}`);
              // Update activity with place ID and rating
              const activityDetails = await fetchPlaceDetails(placeId, userId, locationId);
              if (activityDetails) {
                const activityUpdate: Record<string, any> = {
                  google_place_id: placeId,
                  google_rating: activityDetails.rating,
                };

                const { error: activityUpdateError } = await supabase
                  .from('rv_location_activities')
                  .update(activityUpdate)
                  .eq('id', activity.id);

                if (activityUpdateError) {
                  console.error(`[RV Enrichment] Failed to update activity ${activity.name}:`, activityUpdateError);
                  result.errors?.push(`Failed to update activity ${activity.name}: ${activityUpdateError.message}`);
                } else {
                  console.log(`[RV Enrichment] Updated activity ${activity.name} with Google Place data`);
                  result.activities_enriched++;
                }
              }
            } else {
              console.log(`[RV Enrichment] No Google Place found for activity: "${activity.name}"`);
              continue; // Can't fetch photos without a place ID
            }
          }

          // Fetch photos for this activity if we don't have any yet
          // Skip if activity's place ID matches the location's place ID (would be duplicate photos)
          // Skip if we've already fetched photos for this place ID (another activity uses the same place)
          if (fetch_photos && placeId && !activitiesWithPhotos.has(activity.id) && placeId !== location.google_place_id && !processedPlaceIds.has(placeId)) {
            console.log(`[RV Enrichment] Fetching photos for activity: ${activity.name}`);
            const activityDetails = await fetchPlaceDetails(placeId, userId, locationId);

            if (activityDetails?.photos && activityDetails.photos.length > 0) {
              const activityPhotoResult = await fetchAndStoreRVLocationPhotos(
                locationId,
                userId,
                activityDetails.photos as GooglePhoto[],
                { maxPhotos: max_photos },
                activity.id, // Link photo to this activity
                `Activity: ${activity.name}` // Caption showing activity name
              );
              result.photos_added += activityPhotoResult.photosAdded;
              if (activityPhotoResult.photosSkipped > 0) {
                console.log(`[RV Enrichment] ${activityPhotoResult.photosSkipped} duplicate activity photos skipped for ${activity.name}`);
              }
              if (activityPhotoResult.errors.length > 0) {
                result.errors?.push(...activityPhotoResult.errors);
              }
              // Mark this place ID as processed to avoid duplicates
              processedPlaceIds.add(placeId);
            }
          } else if (activitiesWithPhotos.has(activity.id)) {
            console.log(`[RV Enrichment] Activity ${activity.name} already has photos, skipping`);
          } else if (placeId === location.google_place_id) {
            console.log(`[RV Enrichment] Activity ${activity.name} shares same Google Place as location, skipping duplicate photos`);
          } else if (processedPlaceIds.has(placeId)) {
            console.log(`[RV Enrichment] Activity ${activity.name} shares same Google Place as another activity, skipping duplicate photos`);
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
