/**
 * Backfill media captions with activity/place names and day info
 *
 * This script:
 * 1. Finds all unique google_place_ids from media file_urls
 * 2. Calls Google Places API to get the display name for each
 * 3. Tries to match place names to activities to get day info
 * 4. Updates media captions with "Day X · Date | Place Name" format
 *
 * Run with: npx ts-node scripts/backfill-media-captions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!googleApiKey) {
  console.error('Missing GOOGLE_PLACES_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extract google_place_id from media file_url
function extractPlaceId(fileUrl: string): string | null {
  const match = fileUrl.match(/google_places_(.+?)_photos_/);
  return match ? match[1] : null;
}

// Extract trip_id from media file_url
function extractTripId(fileUrl: string): string | null {
  const match = fileUrl.match(/travel\/([a-f0-9-]+)\/activities/);
  return match ? match[1] : null;
}

// Get place name from Google Places API
async function getPlaceName(placeId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': googleApiKey!,
        'X-Goog-FieldMask': 'displayName'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch place ${placeId}: ${response.status}`);
      return null;
    }

    const data = await response.json() as { displayName?: { text?: string } };
    return data.displayName?.text || null;
  } catch (error) {
    console.error(`Error fetching place ${placeId}:`, error);
    return null;
  }
}

// Try to find an activity that matches the place name (partial, case-insensitive)
async function findMatchingActivity(tripId: string, placeName: string): Promise<{
  activityName: string;
  dayId: string | null;
} | null> {
  const { data: activities } = await supabase
    .from('trip_activities')
    .select('name, day_id')
    .eq('trip_id', tripId);

  if (!activities) return null;

  // Try exact match first (case-insensitive)
  const lowerPlaceName = placeName.toLowerCase();
  let match = activities.find(a => a.name.toLowerCase() === lowerPlaceName);

  // Try partial match (place name contains activity name or vice versa)
  if (!match) {
    match = activities.find(a => {
      const lowerActivityName = a.name.toLowerCase();
      return lowerPlaceName.includes(lowerActivityName) || lowerActivityName.includes(lowerPlaceName);
    });
  }

  // Try keyword match (significant words)
  if (!match) {
    const placeWords = lowerPlaceName.split(/\s+/).filter((w: string) => w.length > 3);
    match = activities.find(a => {
      const activityWords = a.name.toLowerCase().split(/\s+/);
      return placeWords.some((pw: string) => activityWords.some((aw: string) => aw.includes(pw) || pw.includes(aw)));
    });
  }

  return match ? { activityName: match.name, dayId: match.day_id } : null;
}

// Get day info (day number and date) for a day_id
async function getDayInfo(tripId: string, dayId: string): Promise<string | null> {
  const { data: tripDays } = await supabase
    .from('trip_days')
    .select('id, date')
    .eq('trip_id', tripId)
    .order('date', { ascending: true });

  if (!tripDays || tripDays.length === 0) return null;

  // Get unique dates and calculate day number
  const uniqueDates = [...new Set(tripDays.map(d => d.date))].sort();
  const activityDay = tripDays.find(d => d.id === dayId);

  if (!activityDay) return null;

  const dayIndex = uniqueDates.indexOf(activityDay.date);
  if (dayIndex === -1) return null;

  const dayNumber = dayIndex + 1;
  const date = new Date(activityDay.date);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return `Day ${dayNumber} · ${dateStr}`;
}

async function main() {
  console.log('Starting media caption backfill with day info...\n');

  // Get all media with activity parent_type
  const { data: media, error } = await supabase
    .from('trip_media')
    .select('id, file_url, caption, trip_id')
    .eq('parent_type', 'activity');

  if (error) {
    console.error('Error fetching media:', error);
    process.exit(1);
  }

  console.log(`Found ${media?.length || 0} media records\n`);

  if (!media || media.length === 0) {
    console.log('No media to process');
    return;
  }

  // Group media by place_id
  const mediaByPlaceId: Record<string, typeof media> = {};
  for (const m of media) {
    const placeId = extractPlaceId(m.file_url);
    if (placeId) {
      if (!mediaByPlaceId[placeId]) mediaByPlaceId[placeId] = [];
      mediaByPlaceId[placeId].push(m);
    }
  }

  const uniquePlaceIds = Object.keys(mediaByPlaceId);
  console.log(`Found ${uniquePlaceIds.length} unique place IDs\n`);

  // Cache for day info by tripId
  const dayInfoCache: Record<string, Record<string, string | null>> = {};

  // Fetch place names and update media
  let updated = 0;
  let withDayInfo = 0;
  let failed = 0;

  for (const placeId of uniquePlaceIds) {
    console.log(`Processing place: ${placeId}`);

    const placeName = await getPlaceName(placeId);
    if (!placeName) {
      console.log(`  Could not get name for ${placeId}`);
      failed += mediaByPlaceId[placeId].length;
      continue;
    }

    console.log(`  Name: ${placeName}`);

    // Get trip ID from first media item
    const tripId = mediaByPlaceId[placeId][0]?.trip_id || extractTripId(mediaByPlaceId[placeId][0]?.file_url);

    let dayPrefix = '';
    if (tripId) {
      // Try to find matching activity and get day info
      const activityMatch = await findMatchingActivity(tripId, placeName);
      if (activityMatch?.dayId) {
        // Check cache first
        if (!dayInfoCache[tripId]) dayInfoCache[tripId] = {};
        if (!(activityMatch.dayId in dayInfoCache[tripId])) {
          dayInfoCache[tripId][activityMatch.dayId] = await getDayInfo(tripId, activityMatch.dayId);
        }
        const dayInfo = dayInfoCache[tripId][activityMatch.dayId];
        if (dayInfo) {
          dayPrefix = `${dayInfo} | `;
          console.log(`  Day info: ${dayInfo}`);
        }
      }
    }

    const caption = `${dayPrefix}${placeName}`;
    console.log(`  Caption: ${caption}`);
    console.log(`  Updating ${mediaByPlaceId[placeId].length} media records...`);

    // Update all media with this place_id
    const mediaIds = mediaByPlaceId[placeId].map(m => m.id);
    const { error: updateError } = await supabase
      .from('trip_media')
      .update({ caption })
      .in('id', mediaIds);

    if (updateError) {
      console.log(`  Error updating: ${updateError.message}`);
      failed += mediaIds.length;
    } else {
      console.log(`  Updated ${mediaIds.length} records`);
      updated += mediaIds.length;
      if (dayPrefix) withDayInfo += mediaIds.length;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\nBackfill complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  With day info: ${withDayInfo}`);
  console.log(`  Without day info: ${updated - withDayInfo}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
