/**
 * Restaurant Enrichment Service
 *
 * Dedicated service for enriching restaurant activities with detailed
 * dining recommendations extracted from Google Place reviews via Claude.
 * Runs AFTER basic enrichment (which establishes google_place_id, photos, address).
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  trackPlaceDetails,
  trackAnthropicUsage,
} from './api-usage-tracking';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PlaceDetailsReview {
  rating: number;
  text: { text: string };
  authorAttribution: { displayName: string };
}

interface PlaceDetailsResponse {
  reviews?: PlaceDetailsReview[];
  editorialSummary?: { text: string };
  primaryTypeDisplayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  formattedAddress?: string;
}

interface AIRestaurantAnalysis {
  cuisine_type?: string;
  signature_dishes?: Array<{
    name: string;
    description: string;
    is_local_specialty?: boolean;
    kid_friendly?: boolean;
  }>;
  local_insight?: string;
  ambience?: string;
  noise_level?: 'quiet' | 'moderate' | 'loud';
  reservation_tips?: string;
  timing_tips?: string;
  things_to_know?: string;
  family_tips?: string;
}

export async function enrichRestaurantDetails(
  tripId: string,
  userId: string,
  googleApiKey: string,
  anthropicApiKey: string,
  segmentId?: string
): Promise<{ enriched: number; skipped: number; errors: string[] }> {
  const log = (msg: string, details?: Record<string, unknown>) => {
    console.log(`[RestaurantEnrich] ${msg}`, details ? JSON.stringify(details) : '');
  };

  log('START', { tripId, segmentId });

  // Find restaurants that need enrichment: have google_place_id but no signature_dishes
  let query = supabase
    .from('trip_activities')
    .select('id, name, google_place_id, restaurant_details, segment_id')
    .eq('trip_id', tripId)
    .eq('activity_type', 'restaurant')
    .not('google_place_id', 'is', null);

  if (segmentId) {
    query = query.eq('segment_id', segmentId);
  }

  const { data: restaurants, error: queryError } = await query;

  if (queryError) {
    log('Query error', { error: queryError.message });
    return { enriched: 0, skipped: 0, errors: [queryError.message] };
  }

  if (!restaurants || restaurants.length === 0) {
    log('No restaurants found to enrich');
    return { enriched: 0, skipped: 0, errors: [] };
  }

  // Filter to those missing signature_dishes
  const needsEnrichment = restaurants.filter(r => {
    const details = r.restaurant_details as Record<string, unknown> | null;
    if (!details) return true;
    const dishes = details.signature_dishes as unknown[] | undefined;
    return !dishes || dishes.length === 0;
  });

  log('Found restaurants', { total: restaurants.length, needsEnrichment: needsEnrichment.length });

  if (needsEnrichment.length === 0) {
    return { enriched: 0, skipped: restaurants.length, errors: [] };
  }

  // Get segment info for location context
  const segmentIds = [...new Set(needsEnrichment.map(r => r.segment_id).filter(Boolean))];
  const { data: segments } = await supabase
    .from('trip_segments')
    .select('id, name, country')
    .in('id', segmentIds);
  const segmentMap = new Map((segments || []).map(s => [s.id, s]));

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  let enriched = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const restaurant of needsEnrichment) {
    try {
      // 1. Fetch Place Details with reviews
      const fields = 'reviews,editorialSummary,primaryTypeDisplayName,rating,userRatingCount,priceLevel,formattedAddress';
      const url = `https://places.googleapis.com/v1/places/${restaurant.google_place_id}?key=${googleApiKey}`;
      const response = await fetch(url, {
        headers: { 'X-Goog-FieldMask': fields },
      });

      if (!response.ok) {
        const errText = await response.text();
        errors.push(`Place Details failed for ${restaurant.name}: ${response.status} ${errText}`);
        skipped++;
        continue;
      }

      trackPlaceDetails(userId, 'restaurant_enrichment', tripId);
      const placeDetails = await response.json() as PlaceDetailsResponse;

      if (!placeDetails.reviews || placeDetails.reviews.length === 0) {
        log('No reviews available', { restaurant: restaurant.name });
        skipped++;
        continue;
      }

      // 2. Build context
      const segment = segmentMap.get(restaurant.segment_id);
      const country = segment?.country || '';
      const city = segment?.name || '';

      const reviewsText = placeDetails.reviews
        .map(r => `[${r.rating}/5] ${r.text.text}`)
        .join('\n\n');

      const priceLevelLabel = placeDetails.priceLevel
        ? { PRICE_LEVEL_FREE: 'Free', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' }[placeDetails.priceLevel] || ''
        : '';

      // 3. Call Claude for analysis
      const prompt = `You are a local food expert helping a family with young kids traveling to ${country || 'this destination'}.
Analyze these Google reviews for "${restaurant.name}" in ${city}${country ? `, ${country}` : ''}.

Reviews:
${reviewsText}

Restaurant: ${placeDetails.rating || '?'}/5 (${placeDetails.userRatingCount || '?'} reviews)${priceLevelLabel ? `, ${priceLevelLabel}` : ''}
${placeDetails.editorialSummary?.text ? `Editorial: ${placeDetails.editorialSummary.text}` : ''}

Based ONLY on what reviewers actually say, extract:
{
  "cuisine_type": "Specific cuisine (e.g. 'Traditional Portuguese', 'Alentejo Regional', 'Seafood Grill')",
  "signature_dishes": [
    {
      "name": "Dish name",
      "description": "What reviewers say about it (1-2 sentences)",
      "is_local_specialty": true,
      "kid_friendly": true
    }
  ],
  "local_insight": "What makes this place special? Connection to local food culture?",
  "ambience": "One-line vibe (e.g. 'Cozy stone-walled tavern with terrace overlooking the valley')",
  "noise_level": "quiet|moderate|loud",
  "reservation_tips": "Based on reviews: needed? walk-in OK? best strategy?",
  "timing_tips": "Best time to go? How long does a meal take? Busy periods?",
  "things_to_know": "Cash only? Long waits? Seasonal menu? Language tips? Tourist traps nearby?",
  "family_tips": "High chairs? Kids menu? Which dishes are kid-approved? Family-friendly seating?"
}

Top 3 dishes maximum. Only include dishes actually mentioned positively in reviews.
If reviews don't mention specific dishes, use the editorial summary and restaurant type to suggest likely specialties but set is_local_specialty to false.
Return ONLY valid JSON.`;

      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      if (aiResponse.usage) {
        trackAnthropicUsage(
          userId,
          aiResponse.usage.input_tokens,
          aiResponse.usage.output_tokens,
          'restaurant_enrichment',
          tripId,
          { model: 'claude-haiku-4-5-20251001', task: 'restaurant_detail_analysis' }
        );
      }

      const content = aiResponse.content[0];
      if (content.type !== 'text') {
        errors.push(`Unexpected AI response type for ${restaurant.name}`);
        skipped++;
        continue;
      }

      // Parse JSON (handle markdown code blocks)
      let jsonText = content.text;
      const jsonMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const analysis: AIRestaurantAnalysis = JSON.parse(jsonText);

      // 4. Merge with existing restaurant_details (preserve Google attributes like seating, highchair)
      const existing = (restaurant.restaurant_details as Record<string, unknown>) || {};
      const updatedDetails = {
        ...existing,
        cuisine_type: analysis.cuisine_type || existing.cuisine_type,
        signature_dishes: (analysis.signature_dishes || []).map(d => ({
          name: d.name,
          description: d.description,
          is_local_specialty: d.is_local_specialty || false,
          kid_friendly: d.kid_friendly || false,
          source: 'ai_review_analysis' as const,
        })),
        ambience: analysis.ambience || existing.ambience,
        noise_level: analysis.noise_level || existing.noise_level,
        reservation_tips: analysis.reservation_tips || existing.reservation_tips,
        local_insight: analysis.local_insight,
        timing_tips: analysis.timing_tips,
        things_to_know: analysis.things_to_know,
        family_tips: analysis.family_tips,
      };

      // 5. Update DB
      const { error: updateError } = await supabase
        .from('trip_activities')
        .update({ restaurant_details: updatedDetails })
        .eq('id', restaurant.id);

      if (updateError) {
        errors.push(`DB update failed for ${restaurant.name}: ${updateError.message}`);
        skipped++;
        continue;
      }

      enriched++;
      log('Enriched', {
        restaurant: restaurant.name,
        dishes: (analysis.signature_dishes || []).length,
        hasInsight: !!analysis.local_insight,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error enriching ${restaurant.name}: ${msg}`);
      log('Error', { restaurant: restaurant.name, error: msg });
      skipped++;
    }
  }

  log('COMPLETE', { enriched, skipped, errors: errors.length });
  return { enriched, skipped, errors };
}
