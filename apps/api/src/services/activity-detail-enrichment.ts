/**
 * Activity Detail Enrichment Service
 *
 * Generates deep_dive and practical_details for activities that have
 * google_place_id but are missing rich content. Uses Google Place reviews
 * + Claude to synthesize engaging content.
 *
 * Runs AFTER Google Places enrichment (which establishes google_place_id, photos).
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

export async function enrichActivityDetails(
  tripId: string,
  userId: string,
  googleApiKey: string,
  anthropicApiKey: string,
  segmentId?: string,
  activityId?: string
): Promise<{ enriched: number; skipped: number; errors: string[] }> {
  const startTime = Date.now();
  const log = (msg: string, details?: Record<string, unknown>) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[ActivityDetailEnrich][${elapsed}s] ${msg}`, details ? JSON.stringify(details) : '');
  };

  log('START', { tripId, segmentId, activityId });

  // Find activities with google_place_id but missing deep_dive or practical_details
  let query = supabase
    .from('trip_activities')
    .select('id, name, activity_type, activity_sub_type, google_place_id, deep_dive, practical_details, description, segment_id, location_name')
    .eq('trip_id', tripId)
    .not('google_place_id', 'is', null);

  if (segmentId) query = query.eq('segment_id', segmentId);
  if (activityId) query = query.eq('id', activityId);

  const { data: activities, error: queryError } = await query;

  if (queryError) {
    log('Query error', { error: queryError.message });
    return { enriched: 0, skipped: 0, errors: [queryError.message] };
  }

  // Skip types that don't need deep content
  const SKIP_TYPES = new Set(['transport', 'logistics', 'downtime']);
  const SKIP_NAMES = /^(wake up|kids to bed|pack|pool time|siesta|nap|sleep|load car|morning routine)/i;

  // Filter to those needing enrichment
  const needsEnrichment = (activities || []).filter(a => {
    if (SKIP_TYPES.has(a.activity_type || '')) return false;
    if (SKIP_NAMES.test(a.name)) return false;
    const hasDeepDive = a.deep_dive && Object.keys(a.deep_dive).length > 2;
    const hasPractical = a.practical_details && Object.keys(a.practical_details).length > 0;
    return !hasDeepDive || !hasPractical;
  });

  log('Filtered', { total: (activities || []).length, needsEnrichment: needsEnrichment.length });

  if (needsEnrichment.length === 0) {
    return { enriched: 0, skipped: (activities || []).length, errors: [] };
  }

  // Get segment info for location context
  const segmentIds = [...new Set(needsEnrichment.map(a => a.segment_id).filter(Boolean))];
  const { data: segments } = await supabase
    .from('trip_segments')
    .select('id, name, country')
    .in('id', segmentIds);
  const segmentMap = new Map((segments || []).map(s => [s.id, s]));

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  let enriched = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const activity of needsEnrichment) {
    try {
      // 1. Fetch Place Details with reviews
      const fields = 'reviews,editorialSummary,primaryTypeDisplayName,rating,userRatingCount,formattedAddress,regularOpeningHours,websiteUri';
      const url = `https://places.googleapis.com/v1/places/${activity.google_place_id}?key=${googleApiKey}`;
      const response = await fetch(url, {
        headers: { 'X-Goog-FieldMask': fields },
      });

      if (!response.ok) {
        errors.push(`Place Details failed for ${activity.name}: ${response.status}`);
        skipped++;
        continue;
      }

      trackPlaceDetails(userId, 'activity_detail_enrichment', tripId);
      const placeDetails = await response.json() as {
        reviews?: Array<{ text?: { text: string }; rating?: number; authorAttribution?: { displayName: string } }>;
        editorialSummary?: { text: string };
        primaryTypeDisplayName?: { text: string };
        rating?: number;
        userRatingCount?: number;
        formattedAddress?: string;
        regularOpeningHours?: { weekdayDescriptions?: string[] };
        websiteUri?: string;
      };

      const segment = segmentMap.get(activity.segment_id);
      const country = segment?.country || '';
      const city = segment?.name || '';

      const reviewsText = (placeDetails.reviews || [])
        .map(r => `[${r.rating || '?'}/5] ${r.text?.text || ''}`)
        .join('\n\n');

      const hoursText = placeDetails.regularOpeningHours?.weekdayDescriptions?.join(', ') || '';

      // 2. Claude synthesis
      const isFood = activity.activity_type === 'restaurant' ||
        ['breakfast', 'lunch', 'dinner', 'snack', 'coffee'].includes(activity.activity_sub_type || '') ||
        /\b(pastries|bakery|café|cafe|gelato|nata|restaurant)\b/i.test(activity.name);

      const prompt = isFood
        ? `You are a local food & culture expert for ${city}, ${country}. Analyze this food stop and reviews for "${activity.name}".

Reviews:
${reviewsText || 'No reviews available.'}

Place info: ${placeDetails.rating || '?'}/5 (${placeDetails.userRatingCount || '?'} reviews)
${placeDetails.editorialSummary?.text ? `Editorial: ${placeDetails.editorialSummary.text}` : ''}
Address: ${placeDetails.formattedAddress || ''}
Hours: ${hoursText || 'unknown'}
Existing description: ${activity.description || 'none'}

Generate rich content for a family travel app. Return JSON:
{
  "deep_dive": {
    "what_it_is": "What is this place? History, significance, what it's known for (2-3 sentences)",
    "why_it_matters": "Why should a traveler visit? What makes it special in the local food scene? (1-2 sentences)",
    "the_story": "The backstory — founding, traditions, cultural significance (2-3 sentences)",
    "what_youll_see": [{"name": "item/feature", "description": "what to look for"}],
    "interesting_facts": ["fact 1", "fact 2"],
    "photo_spots": [{"name": "spot", "tip": "best angle/time"}]
  },
  "practical_details": {
    "hours": "opening hours summary",
    "time_needed": "how long to spend",
    "best_times": ["best time to visit"],
    "avoid_times": ["busy times to avoid"],
    "getting_there": "how to get there, parking, transit",
    "cost_breakdown": {"adults": "price info", "kids": "price info"}
  }
}

Base everything on actual reviews and facts. Return ONLY valid JSON.`
        : `You are a local expert and tour guide for ${city}, ${country}. Create rich content about "${activity.name}" for a family travel app.

Reviews:
${reviewsText || 'No reviews available.'}

Place info: ${placeDetails.rating || '?'}/5 (${placeDetails.userRatingCount || '?'} reviews)
${placeDetails.editorialSummary?.text ? `Editorial: ${placeDetails.editorialSummary.text}` : ''}
Type: ${placeDetails.primaryTypeDisplayName?.text || activity.activity_sub_type || 'attraction'}
Address: ${placeDetails.formattedAddress || ''}
Hours: ${hoursText || 'unknown'}
Existing description: ${activity.description || 'none'}

Generate rich content for a family travel app. Return JSON:
{
  "deep_dive": {
    "what_it_is": "What is this place? What will visitors experience? (2-3 sentences)",
    "why_it_matters": "Why is it worth visiting? Historical/cultural significance? (1-2 sentences)",
    "the_story": "Interesting backstory, history, or cultural context (2-3 sentences)",
    "what_youll_see": [{"name": "highlight", "description": "what to look for", "location_hint": "where to find it"}],
    "interesting_facts": ["fact 1", "fact 2", "fact 3"],
    "photo_spots": [{"name": "photo spot", "tip": "best angle/time/framing"}]
  },
  "practical_details": {
    "hours": "opening hours summary",
    "time_needed": "recommended duration",
    "best_times": ["best time to visit and why"],
    "avoid_times": ["times to avoid and why"],
    "getting_there": "directions, parking, stroller accessibility",
    "cost_breakdown": {"adults": "price", "kids": "price or free under age X"}
  }
}

Base everything on actual reviews and facts. Return ONLY valid JSON.`;

      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      if (aiResponse.usage) {
        trackAnthropicUsage(
          userId,
          aiResponse.usage.input_tokens,
          aiResponse.usage.output_tokens,
          'activity_detail_enrichment',
          tripId,
          { model: 'claude-haiku-4-5-20251001', task: 'activity_deep_dive' }
        );
      }

      const content = aiResponse.content[0];
      if (content.type !== 'text') {
        errors.push(`Unexpected AI response type for ${activity.name}`);
        skipped++;
        continue;
      }

      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const result = JSON.parse(jsonText.trim());

      // 3. Update DB — merge with existing data
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

      if (result.deep_dive) {
        const existingDeepDive = (activity.deep_dive as Record<string, unknown>) || {};
        updateData.deep_dive = { ...existingDeepDive, ...result.deep_dive };
      }
      if (result.practical_details) {
        const existingPractical = (activity.practical_details as Record<string, unknown>) || {};
        updateData.practical_details = { ...existingPractical, ...result.practical_details };
      }

      const { error: updateError } = await supabase
        .from('trip_activities')
        .update(updateData)
        .eq('id', activity.id);

      if (updateError) {
        errors.push(`DB update failed for ${activity.name}: ${updateError.message}`);
        skipped++;
        continue;
      }

      enriched++;
      log('Enriched', { activity: activity.name, hasDeepDive: !!result.deep_dive, hasPractical: !!result.practical_details });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error enriching ${activity.name}: ${msg}`);
      log('Error', { activity: activity.name, error: msg });
      skipped++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log('COMPLETE', { duration: `${duration}s`, enriched, skipped, errors: errors.length });

  return { enriched, skipped, errors };
}
