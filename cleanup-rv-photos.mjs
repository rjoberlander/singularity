import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

const locationId = '64c22c93-c9ab-43a9-a498-6c883de25962';

// Get all photos for this location
const { data: photos, error } = await supabase
  .from('rv_location_media')
  .select('id, file_url, content_hash, created_at')
  .eq('location_id', locationId)
  .order('created_at', { ascending: true });

if (error) {
  console.error('Error fetching photos:', error);
  process.exit(1);
}

console.log('Found ' + photos.length + ' total photos');

// Group by content_hash (or file_url if no hash)
const groups = new Map();
for (const photo of photos) {
  const key = photo.content_hash || photo.file_url;
  if (!groups.has(key)) {
    groups.set(key, []);
  }
  groups.get(key).push(photo);
}

// Find duplicates (keep first, delete rest)
const idsToDelete = [];
for (const [key, group] of groups) {
  if (group.length > 1) {
    console.log('Found ' + group.length + ' duplicates for key: ' + key.substring(0, 20) + '...');
    // Keep the first (oldest), delete the rest
    idsToDelete.push(...group.slice(1).map(p => p.id));
  }
}

console.log('\nDeleting ' + idsToDelete.length + ' duplicate photos...');

if (idsToDelete.length > 0) {
  const { error: deleteError } = await supabase
    .from('rv_location_media')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting:', deleteError);
    process.exit(1);
  }

  console.log('Successfully deleted ' + idsToDelete.length + ' duplicates');
}

// Verify final count
const { count } = await supabase
  .from('rv_location_media')
  .select('*', { count: 'exact', head: true })
  .eq('location_id', locationId);

console.log('\nRemaining photos: ' + count);
