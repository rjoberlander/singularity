/**
 * Deep Enrichment Service
 *
 * Orchestrates the gap-filler enrichment step:
 * 1. Activity deep_dive gaps (delegates to enrichActivityDetails)
 * 2. Restaurant review gaps (delegates to enrichRestaurantDetails)
 * 3. Trip-level deep overview (country context via Perplexity + Claude)
 * 4. Segment-level narrative synthesis (Claude)
 * 5. Day-level tour guide narrative (Claude)
 *
 * All sub-tasks are idempotent — skip if already populated.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { enrichActivityDetails } from './activity-detail-enrichment';
import { enrichRestaurantDetails } from './restaurant-enrichment';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DeepEnrichResult {
  trip_overview: boolean;
  segments_enriched: number;
  segments_total: number;
  days_enriched: number;
  days_total: number;
  activities_enriched: number;
  restaurants_enriched: number;
  errors: string[];
}

export async function runDeepEnrichment(
  tripId: string,
  userId: string,
  googleApiKey: string,
  anthropicApiKey: string,
  perplexityApiKey?: string
): Promise<DeepEnrichResult> {
  const startTime = Date.now();
  const log = (msg: string, details?: Record<string, unknown>) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[DeepEnrich][${elapsed}s] ${msg}`, details ? JSON.stringify(details) : '');
  };

  const errors: string[] = [];
  const result: DeepEnrichResult = {
    trip_overview: false,
    segments_enriched: 0,
    segments_total: 0,
    days_enriched: 0,
    days_total: 0,
    activities_enriched: 0,
    restaurants_enriched: 0,
    errors: [],
  };

  log('START', { tripId });

  // Fetch trip data
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, name, destination, destination_country, description, overview, deep_overview, start_date, end_date')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return { ...result, errors: ['Trip not found'] };
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  // ── 1. Activity deep_dive gaps ──
  log('Phase 1: Activity detail gaps');
  try {
    const actResult = await enrichActivityDetails(tripId, userId, googleApiKey, anthropicApiKey);
    result.activities_enriched = actResult.enriched;
    if (actResult.errors.length > 0) errors.push(...actResult.errors.slice(0, 5));
    log('Activity details done', { enriched: actResult.enriched });
  } catch (e) {
    errors.push(`Activity enrichment: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 2. Restaurant review gaps ──
  log('Phase 2: Restaurant review gaps');
  try {
    const restResult = await enrichRestaurantDetails(tripId, userId, googleApiKey, anthropicApiKey);
    result.restaurants_enriched = restResult.enriched;
    log('Restaurant details done', { enriched: restResult.enriched });
  } catch (e) {
    errors.push(`Restaurant enrichment: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. Trip-level deep overview ──
  if (!trip.deep_overview) {
    log('Phase 3: Trip overview');
    try {
      let researchText = '';
      if (perplexityApiKey) {
        const searchQuery = `${trip.destination || trip.destination_country || 'Portugal'} travel guide family practical tips culture history customs language`;
        const resp = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${perplexityApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: `You are researching practical travel information about ${trip.destination_country || trip.destination} for a family trip. Cover: cultural context, history highlights, language basics (key phrases), currency tips, safety notes, and family-specific travel tips.` },
              { role: 'user', content: searchQuery }
            ],
            max_tokens: 2000,
            temperature: 0.2,
          }),
        });
        if (resp.ok) {
          const data: any = await resp.json();
          researchText = data.choices?.[0]?.message?.content || '';
        }
      }

      const prompt = `Create a comprehensive destination overview for a family trip to ${trip.destination_country || trip.destination || 'this country'}.
Trip: "${trip.name}" (${trip.start_date} to ${trip.end_date})
${trip.description ? `Trip description: ${trip.description}` : ''}
${researchText ? `\nWeb research:\n${researchText}` : ''}

Return JSON:
{
  "country_background": "2-3 paragraph overview of the country — its identity, what makes it special for travelers, the vibe",
  "cultural_context": "Key cultural norms, social customs, what to expect (e.g., late dinners, siestas, local greetings)",
  "practical_tips": ["tip 1", "tip 2", "tip 3"],
  "history_highlights": ["key historical moment 1", "key historical moment 2"],
  "language_basics": ["hello = olá", "thank you = obrigado/a", "please = por favor"],
  "currency_tips": "Currency info, tipping customs, cash vs card",
  "safety_notes": "Safety info relevant to families",
  "family_travel_tips": ["tip for traveling with kids 1", "tip 2"]
}

Return ONLY valid JSON.`;

      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : '';
      let jsonText = text;
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const overview = JSON.parse(jsonText.trim());
      await supabase.from('trips').update({ deep_overview: overview, updated_at: new Date().toISOString() }).eq('id', tripId);
      result.trip_overview = true;
      log('Trip overview generated');
    } catch (e) {
      errors.push(`Trip overview: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    result.trip_overview = true;
    log('Trip overview already exists');
  }

  // ── 4. Segment-level narrative synthesis ──
  const { data: segments } = await supabase
    .from('trip_segments')
    .select('id, name, description, theme, city_info, segment_narrative')
    .eq('trip_id', tripId)
    .order('sort_order');

  result.segments_total = segments?.length || 0;

  if (segments) {
    // Get accommodations and activities for context
    const { data: accommodations } = await supabase
      .from('trip_accommodations')
      .select('id, name, segment_id, room_type, guest_insights')
      .eq('trip_id', tripId);

    const { data: activities } = await supabase
      .from('trip_activities')
      .select('id, name, activity_type, activity_sub_type, segment_id, restaurant_details')
      .eq('trip_id', tripId)
      .eq('is_backup', false);

    for (const seg of segments) {
      if (seg.segment_narrative) {
        result.segments_enriched++;
        continue;
      }

      log('Phase 4: Segment narrative', { segment: seg.name });
      try {
        const segAccom = accommodations?.filter(a => a.segment_id === seg.id) || [];
        const segActs = activities?.filter(a => a.segment_id === seg.id) || [];
        const restaurants = segActs.filter(a => a.activity_type === 'restaurant' || ['breakfast', 'lunch', 'dinner'].includes(a.activity_sub_type || ''));
        const attractions = segActs.filter(a => a.activity_type === 'activity' || a.activity_type === 'attraction');

        const prompt = `Synthesize a brief narrative for the "${seg.name}" segment of a family trip.

Segment: ${seg.name} — ${seg.theme || ''}
${seg.description ? `Description: ${seg.description}` : ''}

Accommodation: ${segAccom.map(a => `${a.name} (${a.room_type || 'room'})`).join(', ') || 'Not set'}
Key activities (${attractions.length}): ${attractions.slice(0, 8).map(a => a.name).join(', ')}
Dining (${restaurants.length}): ${restaurants.slice(0, 5).map(a => a.name).join(', ')}

Return JSON:
{
  "summary": "2-3 sentence overview of what this segment covers and why it's special",
  "accommodation_context": "Brief note on where you're staying and why it works for this segment",
  "activity_highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "meal_highlights": ["dining highlight 1", "dining highlight 2"],
  "local_tips": ["practical tip 1", "practical tip 2"],
  "getting_around": "How to get around in this area (walking, driving, transit)"
}

Return ONLY valid JSON.`;

        const resp = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });

        const text = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : '';
        let jsonText = text;
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        const narrative = JSON.parse(jsonText.trim());
        await supabase.from('trip_segments').update({ segment_narrative: narrative }).eq('id', seg.id);
        result.segments_enriched++;
        log('Segment narrative done', { segment: seg.name });
      } catch (e) {
        errors.push(`Segment ${seg.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── 5. Day-level narratives ──
  const { data: days } = await supabase
    .from('trip_days')
    .select('id, date, day_number, title, theme, overview, day_narrative, segment_id')
    .eq('trip_id', tripId)
    .order('date');

  result.days_total = days?.length || 0;

  if (days) {
    const { data: allActivities } = await supabase
      .from('trip_activities')
      .select('id, name, day_id, activity_type, activity_sub_type, description')
      .eq('trip_id', tripId)
      .eq('is_backup', false)
      .order('sort_order');

    const activitiesByDay = new Map<string, typeof allActivities>();
    for (const a of allActivities || []) {
      if (!a.day_id) continue;
      const list = activitiesByDay.get(a.day_id) || [];
      list.push(a);
      activitiesByDay.set(a.day_id, list);
    }

    // Get segment names for context
    const segNameMap = new Map<string, string>();
    if (segments) {
      for (const s of segments) segNameMap.set(s.id, s.name);
    }

    for (const day of days) {
      if (day.day_narrative) {
        result.days_enriched++;
        continue;
      }

      const dayActivities = activitiesByDay.get(day.id) || [];
      if (dayActivities.length === 0) continue; // Skip days with no activities

      log('Phase 5: Day narrative', { day: day.day_number, date: day.date });
      try {
        const segName = day.segment_id ? segNameMap.get(day.segment_id) || '' : '';

        const prompt = `Write a brief tour-guide style narrative for Day ${day.day_number} of a family trip to Portugal.

Day ${day.day_number}: "${day.title || day.theme || 'Untitled'}"
Location: ${segName}
Theme: ${day.theme || 'No theme set'}
${day.overview ? `Overview: ${day.overview}` : ''}

Activities today:
${dayActivities.map(a => `- ${a.name} (${a.activity_type || 'activity'}${a.description ? `: ${a.description}` : ''})`).join('\n')}

Write 2-3 sentences that weave these activities into a narrative thread — connecting them with historical/cultural context. Write as if you're a knowledgeable local guide briefing the family on what makes today special. Be specific, not generic. Return ONLY the narrative text, no JSON.`;

        const resp = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        });

        const narrative = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : '';
        if (narrative) {
          await supabase.from('trip_days').update({ day_narrative: narrative }).eq('id', day.id);
          result.days_enriched++;
        }
      } catch (e) {
        errors.push(`Day ${day.day_number}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  result.errors = errors;
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log('COMPLETE', { duration: `${duration}s`, ...result });
  return result;
}
