/**
 * Backfill script to link existing photos to their activities
 *
 * This script downloads activity photos, computes content hashes,
 * and matches them to existing photos in the database by content hash.
 * Then updates those photos to set activity_id and caption.
 *
 * This is needed because:
 * 1. Existing photos were fetched before activity linking was implemented
 * 2. The same photo content exists for both campground and activities
 * 3. The database constraint prevents inserting duplicates
 * 4. So we update existing photos to link them to activities
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface GooglePlacePhotos {
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
}

function computeContentHash(photoBytes: Uint8Array): string {
  return crypto.createHash('sha256').update(photoBytes).digest('hex');
}

async function fetchPlacePhotos(placeId: string): Promise<string[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not configured');
    return [];
  }

  const placeUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(placeUrl, {
      headers: { 'X-Goog-FieldMask': 'photos' }
    });

    if (!response.ok) {
      console.error(`Failed to fetch photos for ${placeId}:`, response.status);
      return [];
    }

    const data = await response.json() as GooglePlacePhotos;
    return data.photos?.map(p => p.name) || [];
  } catch (error) {
    console.error(`Error fetching photos for ${placeId}:`, error);
    return [];
  }
}

async function downloadAndHashPhoto(photoName: string): Promise<string | null> {
  if (!GOOGLE_PLACES_API_KEY) return null;

  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=400&maxHeightPx=400`;

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    return computeContentHash(new Uint8Array(buffer));
  } catch (error) {
    return null;
  }
}

async function backfillActivityPhotos(locationId: string) {
  console.log(`\n=== Backfilling activity photos for location ${locationId} ===\n`);

  // Get all activities with google_place_id
  const { data: activities, error: activitiesError } = await supabase
    .from('rv_location_activities')
    .select('id, name, google_place_id')
    .eq('location_id', locationId)
    .not('google_place_id', 'is', null);

  if (activitiesError) {
    console.error('Error fetching activities:', activitiesError);
    return;
  }

  if (!activities || activities.length === 0) {
    console.log('No activities with google_place_id found');
    return;
  }

  console.log(`Found ${activities.length} activities with Google Place IDs`);

  // Get all existing photos for this location with their content hashes
  const { data: existingPhotos, error: existingError } = await supabase
    .from('rv_location_media')
    .select('id, content_hash, activity_id, caption')
    .eq('location_id', locationId);

  if (existingError || !existingPhotos) {
    console.error('Error fetching existing photos:', existingError);
    return;
  }

  console.log(`Found ${existingPhotos.length} existing photos\n`);

  // Build a map of content_hash -> photo id for quick lookup
  const hashToPhotoId = new Map<string, string>();
  for (const photo of existingPhotos) {
    if (photo.content_hash && !photo.activity_id) {
      hashToPhotoId.set(photo.content_hash, photo.id);
    }
  }

  console.log(`Photos without activity_id: ${hashToPhotoId.size}\n`);

  let totalUpdated = 0;

  for (const activity of activities) {
    console.log(`Processing: ${activity.name}`);

    // Fetch photo references from Google
    const photoRefs = await fetchPlacePhotos(activity.google_place_id);
    console.log(`  Google photos: ${photoRefs.length}`);

    if (photoRefs.length === 0) continue;

    let matchedCount = 0;

    // For each photo, download a small version and compute hash
    for (const photoRef of photoRefs.slice(0, 10)) { // Limit to 10 to save API calls
      const contentHash = await downloadAndHashPhoto(photoRef);
      if (!contentHash) continue;

      // Check if we have a photo with this hash
      const existingPhotoId = hashToPhotoId.get(contentHash);
      if (existingPhotoId) {
        // Update this photo to link to the activity
        const { error: updateError } = await supabase
          .from('rv_location_media')
          .update({
            activity_id: activity.id,
            caption: `Activity: ${activity.name}`
          })
          .eq('id', existingPhotoId);

        if (!updateError) {
          hashToPhotoId.delete(contentHash); // Remove so we don't update again
          matchedCount++;
          totalUpdated++;
        }
      }
    }

    console.log(`  Matched and updated: ${matchedCount} photos`);
  }

  console.log(`\n=== Backfill complete: ${totalUpdated} photos linked to activities ===\n`);
}

// Run if called directly
const locationId = process.argv[2];
if (!locationId) {
  console.log('Usage: npx tsx src/scripts/backfill-activity-photos.ts <location_id>');
  process.exit(1);
}

backfillActivityPhotos(locationId).catch(console.error);
