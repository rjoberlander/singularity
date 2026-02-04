import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

const locationId = '64c22c93-c9ab-43a9-a498-6c883de25962';

// Delete all photos WITHOUT content_hash (old format using direct Google URLs)
// Keep only the new ones with content_hash (uploaded to storage with dedup)
const { data: oldPhotos, error: fetchError } = await supabase
  .from('rv_location_media')
  .select('id')
  .eq('location_id', locationId)
  .is('content_hash', null);

if (fetchError) {
  console.error('Error fetching:', fetchError);
  process.exit(1);
}

console.log('Found ' + oldPhotos.length + ' old photos without content_hash to delete');

if (oldPhotos.length > 0) {
  const idsToDelete = oldPhotos.map(p => p.id);

  const { error: deleteError } = await supabase
    .from('rv_location_media')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting:', deleteError);
    process.exit(1);
  }

  console.log('Deleted ' + idsToDelete.length + ' old photos');
}

// Verify final count
const { count } = await supabase
  .from('rv_location_media')
  .select('*', { count: 'exact', head: true })
  .eq('location_id', locationId);

console.log('Remaining photos: ' + count);
