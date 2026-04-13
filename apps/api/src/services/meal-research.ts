/**
 * Meal Research Service
 *
 * Three-phase pipeline for finding authentic, local restaurant picks:
 *   Phase 1 — Perplexity web search: finds what locals write about on food
 *             blogs, Reddit, TripAdvisor. Surfaces restaurants Google Places
 *             alone would miss.
 *   Phase 2 — Claude synthesis: extracts structured JSON from Perplexity's
 *             raw text — restaurant name, top dishes, local culture context,
 *             kid options, logistics.
 *   Phase 3 — Google Places grounding: establishes google_place_id, verified
 *             coordinates, rating, photos for map/UI integration.
 *
 * The primary pick updates the existing generic meal activity in place; two
 * alternates are created as backup rows.
 */

import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { MealResearchPreferences } from '@singularity/shared-types';
import {
  trackTextSearch,
  trackPlaceDetails,
  trackAnthropicUsage,
} from './api-usage-tracking';
import { haversineDistance } from './google-routes-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Types ──────────────────────────────────────────────────────────────

interface MealSlot {
  activityId: string;
  dayId: string | null;
  date: string | null;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  segmentId: string;
  locationName?: string;
  sortOrder: number;
}

interface PerplexityRestaurant {
  name: string;
  must_order_dishes: Array<{
    name: string;
    description: string;
    is_local_specialty: boolean;
    kid_friendly: boolean;
  }>;
  why_locals_love_it: string;
  local_culture_context: string;
  cuisine_type: string;
  price_range: string;
  logistics: {
    reservation_needed: boolean;
    best_time?: string;
    walk_in_strategy?: string;
  };
  kid_options: string;
  neighborhood?: string;
}

export interface MealResearchResult {
  mealsProcessed: number;
  mealsResearched: number;
  placesGrounded: number;
  photosAdded: number;
  alternatesCreated: number;
  errors: string[];
}

// ─── Meal Slot Types ────────────────────────────────────────────────────

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface MealSlotPlan {
  dayId: string;
  date: string;
  mealType: MealType;
  dayNumber: number;
  // Context from surrounding activities
  dayActivities: string[];
  // Existing activity to update (if any), otherwise we create new
  existingActivityId?: string;
}

// ─── Phase 1: Perplexity Web Search ─────────────────────────────────────

async function searchWithPerplexity(
  perplexityKey: string,
  mealType: string,
  city: string,
  country: string,
  neighborhood: string,
  preferences: MealResearchPreferences,
  dayContext: string,
): Promise<string> {
  const styleGuide = {
    adventurous: 'Focus on where locals eat, not tourists. Hole-in-the-wall spots, market stalls, family-run tascas.',
    balanced: 'Mix of local gems and well-reviewed spots. Some adventure, some reliability.',
    conservative: 'Well-reviewed, English-friendly restaurants with clear menus.',
  };

  const systemPrompt = `You are a local food expert for ${country}, specifically ${city}.
You know the difference between tourist traps and where locals actually eat.
${styleGuide[preferences.dining_style]}

IMPORTANT: Recommend SPECIFIC restaurants by name. For each one, include:
- The exact restaurant name
- 2-3 specific dishes to order (what locals recommend)
- Why locals love this place (not generic "great food" — specific reasons)
- Any tips (cash only, go early, sit at bar, etc.)
${preferences.dietary_restrictions.length > 0 ? `Dietary needs: ${preferences.dietary_restrictions.join(', ')}` : ''}
${preferences.family_context ? `Family: ${preferences.family_context}` : ''}`;

  const avoidList = preferences.avoid.length > 0 ? ` Avoid: ${preferences.avoid.join(', ')}.` : '';
  const cuisineList = preferences.cuisine_interests.length > 0 ? ` Interested in: ${preferences.cuisine_interests.join(', ')}.` : '';

  const userQuery = `Best authentic local ${mealType} restaurants near ${neighborhood || city}, ${country}.${avoidList}${cuisineList}
${dayContext ? `Context: ${dayContext}` : ''}
Give me 3-5 specific restaurant recommendations with what to order at each.`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const result: any = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

// ─── Phase 2: Claude Synthesis ──────────────────────────────────────────

async function synthesizeWithClaude(
  anthropicKey: string,
  userId: string,
  tripId: string,
  perplexityText: string,
  mealType: string,
  city: string,
  country: string,
): Promise<PerplexityRestaurant[]> {
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const prompt = `You are extracting structured restaurant data from web research for ${mealType} in ${city}, ${country}.

Web research output:
${perplexityText}

Extract the top 3 restaurants as JSON. For each restaurant, extract ONLY information that appears in the research text above.

Return ONLY valid JSON — an array of objects:
[
  {
    "name": "Exact restaurant name as written",
    "must_order_dishes": [
      { "name": "Dish name", "description": "What the research says about it", "is_local_specialty": true, "kid_friendly": false }
    ],
    "why_locals_love_it": "Why from the research (1-2 sentences)",
    "local_culture_context": "Connection to local food culture",
    "cuisine_type": "Specific cuisine (e.g. 'Traditional Alentejano', 'Douro Regional')",
    "price_range": "$ to $$$$",
    "logistics": {
      "reservation_needed": true,
      "best_time": "When to go",
      "walk_in_strategy": "Tips for walk-ins"
    },
    "kid_options": "What kids can eat here (or 'No specific kid options')",
    "neighborhood": "Area/neighborhood if mentioned"
  }
]

Top 3 only. If the research mentions fewer than 3, return what's available.
Return ONLY the JSON array, no markdown.`;

  const aiResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  if (aiResponse.usage) {
    trackAnthropicUsage(
      userId,
      aiResponse.usage.input_tokens,
      aiResponse.usage.output_tokens,
      'meal_research',
      tripId,
      { model: 'claude-haiku-4-5-20251001', task: 'meal_research_synthesis' },
    );
  }

  const content = aiResponse.content[0];
  if (content.type !== 'text') return [];

  let jsonText = content.text;
  const codeBlockMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) jsonText = codeBlockMatch[1];

  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Try extracting JSON array
    const arrMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    return [];
  }
}

// ─── Phase 3: Google Places Grounding ───────────────────────────────────

interface GroundedPlace {
  google_place_id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  latitude: number;
  longitude: number;
  address?: string;
  website?: string;
  phone?: string;
  photos?: Array<{ name: string; widthPx: number; heightPx: number; authorAttributions?: Array<{ displayName: string; uri: string }> }>;
}

async function groundWithGooglePlaces(
  googleKey: string,
  restaurantName: string,
  city: string,
  segmentLat: number | null,
  segmentLng: number | null,
  userId: string,
  tripId: string,
): Promise<GroundedPlace | null> {
  const fieldMask = [
    'places.id', 'places.displayName', 'places.rating', 'places.userRatingCount',
    'places.priceLevel', 'places.photos', 'places.formattedAddress',
    'places.location', 'places.websiteUri', 'places.nationalPhoneNumber',
  ].join(',');

  const body: Record<string, unknown> = {
    textQuery: `${restaurantName} restaurant ${city}`,
    maxResultCount: 1,
  };
  if (segmentLat && segmentLng) {
    body.locationBias = {
      circle: {
        center: { latitude: segmentLat, longitude: segmentLng },
        radius: 50000,
      },
    };
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  trackTextSearch(userId, 'meal_research', tripId);

  if (!response.ok) return null;
  const data: any = await response.json();
  const place = data.places?.[0];
  if (!place) return null;

  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  return {
    google_place_id: place.id,
    name: place.displayName?.text || restaurantName,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    priceLevel: place.priceLevel ? priceLevelMap[place.priceLevel] : undefined,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    address: place.formattedAddress,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber,
    photos: place.photos,
  };
}

// ─── Photo Download (reuses pattern from fetch-google endpoint) ──────────

async function downloadPhotos(
  googleKey: string,
  tripId: string,
  userId: string,
  activityId: string,
  activityName: string,
  photos: GroundedPlace['photos'],
  maxPhotos: number = 10,
): Promise<number> {
  if (!photos || photos.length === 0) return 0;

  // Dedup enforced by DB unique constraints:
  //   (trip_id, google_photo_reference) — same ref can't exist twice
  //   (trip_id, content_hash) — same image bytes can't exist twice
  // Every insert below computes content_hash, so both constraints are always active.
  // No bandaid caps needed — the constraints ARE the systematic protection.

  // Get existing dedup sets for this trip (for pre-flight filtering before hitting DB)
  const { data: existingMedia } = await supabase
    .from('trip_media')
    .select('google_photo_reference, content_hash, file_url')
    .eq('trip_id', tripId);
  const existingRefs = new Set(existingMedia?.map(m => m.google_photo_reference).filter(Boolean) || []);
  const existingHashes = new Set(existingMedia?.map(m => m.content_hash).filter(Boolean) || []);

  let added = 0;
  for (const photo of photos.slice(0, maxPhotos)) {
    if (existingRefs.has(photo.name)) continue;

    try {
      const photoResp = await fetch(
        `https://places.googleapis.com/v1/${photo.name}/media?key=${googleKey}&maxWidthPx=1600`,
      );
      if (!photoResp.ok) continue;

      const buf = new Uint8Array(await photoResp.arrayBuffer());
      const contentHash = crypto.createHash('sha256').update(buf).digest('hex');
      if (existingHashes.has(contentHash)) continue;

      const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
      const storagePath = `travel/${tripId}/activities/${activityId}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from('singularity-uploads')
        .upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true });
      if (upErr) continue;

      const { data: urlData } = supabase.storage
        .from('singularity-uploads')
        .getPublicUrl(storagePath);

      const attribution = photo.authorAttributions?.[0];
      const { error: insErr } = await supabase.from('trip_media').insert({
        trip_id: tripId,
        user_id: userId,
        parent_type: 'activity',
        parent_id: activityId,
        file_url: urlData.publicUrl,
        media_type: 'image',
        width: photo.widthPx,
        height: photo.heightPx,
        caption: activityName,
        is_google_sourced: true,
        approved: true,
        google_attribution_name: attribution?.displayName,
        google_attribution_uri: attribution?.uri,
        google_photo_reference: photo.name,
        content_hash: contentHash,
      });
      if (insErr) {
        if (insErr.code === '23505') continue; // duplicate
        continue;
      }

      existingRefs.add(photo.name);
      existingHashes.add(contentHash);
      added++;

      await new Promise(r => setTimeout(r, 150));
    } catch {
      // skip individual photo errors
    }
  }
  return added;
}

// ─── Regional Food Identity ─────────────────────────────────────────────

const REGIONAL_FOOD: Record<string, string> = {
  'lisbon': 'Pastéis de nata, bacalhau (salt cod), sardinhas assadas, bifana, ginjinha. Neighborhoods: Alfama, Belém, Mouraria, Bairro Alto each have distinct food scenes.',
  'sagres': 'Algarve cuisine: cataplana (seafood stew in copper pan), grilled fish, percebes, arroz de marisco. Fresh-from-boat seafood.',
  'lagos': 'Algarve cuisine: cataplana, grilled sardines, fresh seafood, dom rodrigo (almond sweet). Lagos old town has the best tascas.',
  'alentejo': 'Alentejo cuisine: migas (bread dish), açorda (bread soup), porco preto (black pork), carne de porco à Alentejana, ensopado de borrego. Hearty, rustic, pork-heavy.',
  'évora': 'Alentejo cuisine: sericaia (dessert), queijadas de Évora, borrego (lamb), enchidos (cured meats). UNESCO city with ancient food traditions.',
  'douro': 'Douro cuisine: river fish (shad, lamprey in season), roast kid, cozido à portuguesa, rice dishes. Quintas serve wine-paired meals.',
  'peneda': 'Minho/mountain cuisine: cabrito (roast kid), arroz de sarrabulho, papas de sarrabulho, cozido barrosão. Hearty mountain food.',
  'gerês': 'Minho/mountain cuisine: cabrito assado, bazulaque, presunto, broa (corn bread). Rural farm-to-table.',
  'porto': 'Porto cuisine: francesinha, tripas à moda do Porto, bacalhau à Gomes de Sá, petiscos. Matosinhos for seafood. Bolhão market.',
};

function getRegionalContext(segmentName: string): string {
  const lower = segmentName.toLowerCase();
  for (const [key, value] of Object.entries(REGIONAL_FOOD)) {
    if (lower.includes(key)) return value;
  }
  return 'Traditional Portuguese cuisine with local regional specialties.';
}

// ─── Day Area Computation ───────────────────────────────────────────────

interface DayContext {
  dayId: string;
  date: string;
  dayNumber: number;
  centerLat: number;
  centerLng: number;
  activityNames: string[];
  activityLocations: Array<{ name: string; lat: number; lng: number }>;
}

function computeDayContext(
  day: { id: string; date: string; day_number: number },
  activities: Array<{ name: string; activity_type: string; latitude: number | null; longitude: number | null; day_id: string }>,
  accommodationLat: number | null,
  accommodationLng: number | null,
  segmentLat: number | null,
  segmentLng: number | null,
): DayContext {
  const dayActs = activities.filter(a => a.day_id === day.id && !['restaurant', 'cafe', 'dining'].includes(a.activity_type || ''));
  const withCoords = dayActs.filter(a => a.latitude && a.longitude);
  const activityLocations = withCoords.map(a => ({ name: a.name, lat: a.latitude!, lng: a.longitude! }));

  // Compute center of day's activities
  let centerLat: number, centerLng: number;
  if (withCoords.length > 0) {
    centerLat = withCoords.reduce((s, a) => s + a.latitude!, 0) / withCoords.length;
    centerLng = withCoords.reduce((s, a) => s + a.longitude!, 0) / withCoords.length;
  } else if (accommodationLat && accommodationLng) {
    centerLat = accommodationLat;
    centerLng = accommodationLng;
  } else {
    centerLat = segmentLat || 0;
    centerLng = segmentLng || 0;
  }

  return {
    dayId: day.id,
    date: day.date,
    dayNumber: day.day_number || 1,
    centerLat,
    centerLng,
    activityNames: dayActs.map(a => a.name),
    activityLocations,
  };
}

// ─── Main Orchestrator ──────────────────────────────────────────────────
//
// Per the PRD: INDEPENDENT, ROUTE-AWARE, DAY-SPECIFIC meal research.
//
// For each day in the segment:
//   1. Compute the day's activity area (center of that day's activity coordinates)
//   2. For each meal slot (breakfast, lunch, dinner):
//      - Build a location-aware Perplexity query using the day's area + regional food identity
//      - Breakfast: near accommodation or first activity
//      - Lunch: near the day's midday activity cluster
//      - Dinner: near the day's last activity or accommodation
//   3. Claude extracts structured restaurant data
//   4. Google Places grounds with place_id, coords, photos
//   5. Write to DB: insert new or replace existing meal activity
//
// Existing meal activity names are IRRELEVANT — they get overwritten.

export async function researchMealsForSegment(
  tripId: string,
  segmentId: string,
  userId: string,
  perplexityKey: string,
  anthropicKey: string,
  googleKey: string,
  preferences: MealResearchPreferences,
): Promise<MealResearchResult> {
  const log = (msg: string, details?: Record<string, unknown>) =>
    console.log(`[MealResearch] ${msg}`, details ? JSON.stringify(details) : '');

  const result: MealResearchResult = {
    mealsProcessed: 0,
    mealsResearched: 0,
    placesGrounded: 0,
    photosAdded: 0,
    alternatesCreated: 0,
    errors: [],
  };

  // 0. Clean orphaned photos — photos whose parent_id no longer exists in trip_activities.
  //    These accumulate when meals are deleted and re-researched, and their google_photo_reference
  //    blocks new photo inserts via the trip-level unique constraint.
  {
    const { data: allActIds } = await supabase.from('trip_activities').select('id').eq('trip_id', tripId);
    const actIdSet = new Set((allActIds || []).map((a: { id: string }) => a.id));
    const orphanMedia: string[] = [];
    let mFrom = 0;
    while (true) {
      const { data: mBatch } = await supabase.from('trip_media').select('id,parent_id').eq('trip_id', tripId).eq('parent_type', 'activity').range(mFrom, mFrom + 999);
      if (!mBatch?.length) break;
      for (const m of mBatch) { if (!actIdSet.has(m.parent_id)) orphanMedia.push(m.id); }
      if (mBatch.length < 1000) break;
      mFrom += 1000;
    }
    if (orphanMedia.length > 0) {
      log(`Cleaning ${orphanMedia.length} orphaned photos before research`);
      for (let i = 0; i < orphanMedia.length; i += 500) {
        await supabase.from('trip_media').delete().in('id', orphanMedia.slice(i, i + 500));
      }
    }
  }

  // 1. Load segment info
  const { data: segment } = await supabase
    .from('trip_segments')
    .select('id, name, location_name, latitude, longitude, country, start_date, end_date')
    .eq('id', segmentId)
    .single();
  if (!segment) { result.errors.push('Segment not found'); return result; }

  const city = segment.location_name || segment.name;
  const country = segment.country || 'Portugal';
  const regionalContext = getRegionalContext(segment.name);

  // 2. Load days
  const { data: days } = await supabase
    .from('trip_days')
    .select('id, date, day_number')
    .eq('segment_id', segmentId)
    .order('date');
  if (!days || days.length === 0) { result.errors.push('No days in segment'); return result; }

  // 3. Load ALL activities (for routing context)
  const { data: activities } = await supabase
    .from('trip_activities')
    .select('id, name, activity_type, activity_sub_type, day_id, sort_order, restaurant_suggestion_source, is_backup, latitude, longitude')
    .eq('segment_id', segmentId)
    .eq('trip_id', tripId)
    .eq('is_backup', false)
    .order('sort_order');
  const allActivities = activities || [];

  // 4. Load accommodation for this segment (for breakfast proximity)
  const { data: accommodation } = await supabase
    .from('trip_accommodations')
    .select('name, latitude, longitude')
    .eq('segment_id', segmentId)
    .eq('trip_id', tripId)
    .maybeSingle();
  const accommLat = accommodation?.latitude || null;
  const accommLng = accommodation?.longitude || null;

  // 5. Compute day contexts with activity areas
  const dayContexts = days.map(day =>
    computeDayContext(day, allActivities as any, accommLat, accommLng, segment.latitude, segment.longitude)
  );

  log('START', {
    segment: segment.name,
    city,
    days: days.length,
    totalSlots: days.length * 3,
    regionalFood: regionalContext.slice(0, 80) + '...',
  });

  // 6. For each day, for each meal: individual Perplexity search
  const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

  // Track used restaurants GLOBALLY across all meal types to avoid any repeats in the segment
  const usedRestaurants = new Set<string>();

  // Normalize name for dedup: lowercase, strip "o ", "a ", "restaurante ", "restaurant " prefixes
  const normalizeName = (name: string) =>
    name.toLowerCase()
      .replace(/^(o |a |os |as |restaurante |restaurant )/, '')
      .replace(/['']/g, '')
      .trim();

  for (const dayCtx of dayContexts) {
    for (const mealType of MEAL_TYPES) {
      result.mealsProcessed++;

      // Build location context for THIS meal on THIS day
      let mealArea: string;
      let mealLat = dayCtx.centerLat;
      let mealLng = dayCtx.centerLng;

      if (mealType === 'breakfast') {
        // Near accommodation or first activity
        mealArea = accommodation?.name
          ? `near ${accommodation.name} (accommodation)`
          : dayCtx.activityLocations[0]?.name
            ? `near ${dayCtx.activityLocations[0].name}`
            : `in ${city}`;
        if (accommLat && accommLng) { mealLat = accommLat; mealLng = accommLng; }
      } else if (mealType === 'lunch') {
        // Near midday activities
        const midActs = dayCtx.activityNames.slice(0, Math.ceil(dayCtx.activityNames.length / 2));
        mealArea = midActs.length > 0
          ? `near ${midActs.slice(0, 2).join(' and ')}`
          : `in ${city}`;
      } else {
        // Dinner: near last activity or accommodation
        const lastAct = dayCtx.activityLocations[dayCtx.activityLocations.length - 1];
        if (lastAct) {
          mealArea = `near ${lastAct.name}`;
          mealLat = lastAct.lat;
          mealLng = lastAct.lng;
        } else if (accommodation?.name) {
          mealArea = `near ${accommodation.name}`;
          if (accommLat && accommLng) { mealLat = accommLat; mealLng = accommLng; }
        } else {
          mealArea = `in ${city}`;
        }
      }

      const dayActivitiesContext = dayCtx.activityNames.length > 0
        ? `Day's activities: ${dayCtx.activityNames.join(', ')}.`
        : '';

      try {
        // Phase 1: Perplexity — day-specific, location-aware search
        log(`[Day ${dayCtx.dayNumber} ${dayCtx.date}] ${mealType} — searching ${mealArea}`);

        const perplexityText = await searchWithPerplexity(
          perplexityKey,
          mealType,
          city,
          country,
          mealArea,
          preferences,
          `${dayActivitiesContext} Regional food: ${regionalContext}`,
        );

        if (!perplexityText || perplexityText.length < 50) {
          result.errors.push(`No results for ${mealType} on ${dayCtx.date}`);
          continue;
        }

        // Phase 2: Claude synthesis
        const restaurants = await synthesizeWithClaude(
          anthropicKey, userId, tripId, perplexityText, mealType, city, country,
        );
        if (restaurants.length === 0) {
          result.errors.push(`No restaurants extracted for ${mealType} on ${dayCtx.date}`);
          continue;
        }

        // Pick first restaurant not already used anywhere in this segment
        const primaryIdx = restaurants.findIndex(r => !usedRestaurants.has(normalizeName(r.name)));
        const primary = restaurants[primaryIdx >= 0 ? primaryIdx : 0];
        usedRestaurants.add(normalizeName(primary.name));

        // Phase 3: Google Places grounding
        const grounded = await groundWithGooglePlaces(
          googleKey, primary.name, city, mealLat, mealLng, userId, tripId,
        );

        // Build activity data
        const restaurantDetails = {
          cuisine_type: primary.cuisine_type,
          signature_dishes: primary.must_order_dishes,
          local_insight: primary.why_locals_love_it,
          local_culture_context: primary.local_culture_context,
          reservation_tips: primary.logistics?.reservation_needed
            ? `Reservation recommended. ${primary.logistics.walk_in_strategy || ''}`
            : `Walk-ins OK. ${primary.logistics?.walk_in_strategy || ''}`,
          timing_tips: primary.logistics?.best_time,
          family_tips: primary.kid_options,
          things_to_know: primary.price_range ? `Price range: ${primary.price_range}` : undefined,
        };

        const activityData: Record<string, unknown> = {
          name: primary.name,
          activity_type: 'restaurant',
          activity_sub_type: mealType,
          restaurant_suggestion_source: 'web_research',
          restaurant_details: restaurantDetails,
          start_time: mealType === 'breakfast' ? '08:30' : mealType === 'lunch' ? '12:30' : '19:30',
        };

        if (grounded) {
          activityData.google_place_id = grounded.google_place_id;
          activityData.latitude = grounded.latitude;
          activityData.longitude = grounded.longitude;
          activityData.address = grounded.address;
          activityData.website = grounded.website;
          activityData.google_rating = grounded.rating;
          activityData.google_review_count = grounded.reviewCount;
          activityData.google_price_level = grounded.priceLevel;
          activityData.photos_fetched = true;
          result.placesGrounded++;
        }

        // Find existing meal activity for this slot (by sub_type or name heuristic)
        const existingMeal = allActivities.find(a => {
          if (a.day_id !== dayCtx.dayId) return false;
          if (!['restaurant', 'cafe', 'dining'].includes(a.activity_type || '')) return false;
          if (a.activity_sub_type === mealType) return true;
          const lower = (a.name || '').toLowerCase();
          if (mealType === 'breakfast' && (lower.includes('breakfast') || lower.includes('morning'))) return true;
          if (mealType === 'lunch' && (lower.includes('lunch') || lower.includes('midday'))) return true;
          if (mealType === 'dinner' && (lower.includes('dinner') || lower.includes('supper') || lower.includes('evening'))) return true;
          return false;
        });

        let primaryActivityId: string;

        if (existingMeal) {
          // Replace existing
          const { error } = await supabase.from('trip_activities').update(activityData).eq('id', existingMeal.id);
          if (error) { result.errors.push(`Update failed: ${error.message}`); continue; }
          primaryActivityId = existingMeal.id;
        } else {
          // Insert new
          activityData.trip_id = tripId;
          activityData.segment_id = segmentId;
          activityData.day_id = dayCtx.dayId;
          activityData.date = dayCtx.date;
          activityData.is_backup = false;
          activityData.sort_order = mealType === 'breakfast' ? 1 : mealType === 'lunch' ? 50 : 90;

          const { data: inserted, error } = await supabase.from('trip_activities').insert(activityData).select('id').single();
          if (error) { result.errors.push(`Insert failed: ${error.message}`); continue; }
          primaryActivityId = inserted.id;
        }

        result.mealsResearched++;

        // Compute travel logistics to/from surrounding activities
        if (grounded?.latitude && grounded?.longitude) {
          const dayNonMealActs = allActivities
            .filter(a => a.day_id === dayCtx.dayId && !['restaurant', 'cafe', 'dining'].includes(a.activity_type || '') && a.latitude && a.longitude)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

          const mealSortOrder = mealType === 'breakfast' ? 1 : mealType === 'lunch' ? 50 : 90;

          // Find preceding activity (highest sort_order less than meal's)
          const preceding = dayNonMealActs.filter(a => (a.sort_order || 0) < mealSortOrder).pop();
          // Find following activity (lowest sort_order greater than meal's)
          const following = dayNonMealActs.find(a => (a.sort_order || 0) > mealSortOrder);

          const travelLogistics: Record<string, unknown> = {};

          if (preceding?.latitude && preceding?.longitude) {
            const distKm = haversineDistance(preceding.latitude, preceding.longitude, grounded.latitude, grounded.longitude);
            const isWalkable = distKm < 1.5;
            const walkMin = Math.round((distKm / 5) * 60);
            const driveMin = Math.max(3, Math.round((distKm / 40) * 60));
            travelLogistics.from_previous = {
              activity: preceding.name,
              distance_km: Math.round(distKm * 10) / 10,
              mode: isWalkable ? 'walk' : 'drive',
              duration_min: isWalkable ? walkMin : driveMin,
              description: isWalkable ? `${walkMin} min walk from ${preceding.name}` : `${driveMin} min drive from ${preceding.name}`,
            };
          }

          if (following?.latitude && following?.longitude) {
            const distKm = haversineDistance(grounded.latitude, grounded.longitude, following.latitude, following.longitude);
            const isWalkable = distKm < 1.5;
            const walkMin = Math.round((distKm / 5) * 60);
            const driveMin = Math.max(3, Math.round((distKm / 40) * 60));
            travelLogistics.to_next = {
              activity: following.name,
              distance_km: Math.round(distKm * 10) / 10,
              mode: isWalkable ? 'walk' : 'drive',
              duration_min: isWalkable ? walkMin : driveMin,
              description: isWalkable ? `${walkMin} min walk to ${following.name}` : `${driveMin} min drive to ${following.name}`,
            };
          }

          if (Object.keys(travelLogistics).length > 0) {
            // Merge into restaurant_details
            const existingDetails = (activityData.restaurant_details as Record<string, unknown>) || {};
            await supabase.from('trip_activities').update({
              restaurant_details: { ...existingDetails, travel_logistics: travelLogistics },
            }).eq('id', primaryActivityId);
          }
        }

        // Download photos
        if (grounded?.photos) {
          const added = await downloadPhotos(googleKey, tripId, userId, primaryActivityId, primary.name, grounded.photos, 10);
          result.photosAdded += added;
        }

        // Create 1 backup — pick first restaurant that isn't the primary
        const backupCandidate = restaurants.find(r => r.name.toLowerCase() !== primary.name.toLowerCase());
        if (backupCandidate) {
          const backup = backupCandidate;
          const backupGrounded = await groundWithGooglePlaces(
            googleKey, backup.name, city, mealLat, mealLng, userId, tripId,
          );

          const backupData: Record<string, unknown> = {
            trip_id: tripId,
            segment_id: segmentId,
            day_id: dayCtx.dayId,
            date: dayCtx.date,
            name: backup.name,
            activity_type: 'restaurant',
            activity_sub_type: mealType,
            is_backup: true,
            alternate_to_activity_id: primaryActivityId,
            restaurant_suggestion_source: 'web_research',
            restaurant_details: {
              cuisine_type: backup.cuisine_type,
              signature_dishes: backup.must_order_dishes,
              local_insight: backup.why_locals_love_it,
              family_tips: backup.kid_options,
            },
            sort_order: mealType === 'breakfast' ? 1 : mealType === 'lunch' ? 50 : 90,
          };

          if (backupGrounded) {
            backupData.google_place_id = backupGrounded.google_place_id;
            backupData.latitude = backupGrounded.latitude;
            backupData.longitude = backupGrounded.longitude;
            backupData.address = backupGrounded.address;
            backupData.google_rating = backupGrounded.rating;
            backupData.google_review_count = backupGrounded.reviewCount;
          }

          const { error: bkErr } = await supabase.from('trip_activities').insert(backupData);
          if (!bkErr) result.alternatesCreated++;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300));

      } catch (err: any) {
        result.errors.push(`${mealType} on ${dayCtx.date}: ${err.message}`);
        log(`ERROR`, { mealType, date: dayCtx.date, error: err.message });
      }
    }
  }

  log('COMPLETE', result as unknown as Record<string, unknown>);
  return result;
}
