/**
 * Reset photos for a location and re-enrich
 *
 * This script:
 * 1. Deletes all existing photos for a location
 * 2. The user can then click Enrich to fetch fresh photos with proper activity linking
 *
 * WARNING: This will delete all photos for the location!
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetPhotos(locationId: string) {
  console.log(`\n=== Resetting photos for location ${locationId} ===\n`);

  // Count current photos
  const { count: beforeCount } = await supabase
    .from('rv_location_media')
    .select('id', { count: 'exact' })
    .eq('location_id', locationId);

  console.log(`Current photos: ${beforeCount}`);

  if (!beforeCount || beforeCount === 0) {
    console.log('No photos to delete');
    return;
  }

  // Confirm deletion
  console.log(`\nThis will delete ${beforeCount} photos.`);
  console.log('After deletion, click "Enrich" in the UI to fetch fresh photos with activity grouping.\n');

  // Delete photos
  const { error } = await supabase
    .from('rv_location_media')
    .delete()
    .eq('location_id', locationId);

  if (error) {
    console.error('Error deleting photos:', error);
    return;
  }

  // Verify deletion
  const { count: afterCount } = await supabase
    .from('rv_location_media')
    .select('id', { count: 'exact' })
    .eq('location_id', locationId);

  console.log(`Photos after deletion: ${afterCount}`);
  console.log('\nDone! Now click "Enrich" in the UI to fetch fresh photos.');
}

// Run if called directly
const locationId = process.argv[2];
if (!locationId) {
  console.log('Usage: npx tsx src/scripts/reset-and-reenrich-photos.ts <location_id>');
  process.exit(1);
}

resetPhotos(locationId).catch(console.error);
