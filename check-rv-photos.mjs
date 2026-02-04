import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

const locationId = '64c22c93-c9ab-43a9-a498-6c883de25962';

const { data: photos, error } = await supabase
  .from('rv_location_media')
  .select('id, file_url, content_hash, created_at, is_google_sourced')
  .eq('location_id', locationId)
  .order('created_at', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Total photos:', photos.length);
console.log('With content_hash:', photos.filter(p => p.content_hash).length);
console.log('Without content_hash:', photos.filter(p => !p.content_hash).length);
console.log('Google sourced:', photos.filter(p => p.is_google_sourced).length);

// Show sample of file_urls
console.log('\nSample file URLs:');
photos.slice(0, 5).forEach(p => {
  console.log('- ' + (p.content_hash ? '[HASH] ' : '[NO HASH] ') + p.file_url.substring(0, 80) + '...');
});

// Group by URL pattern to find duplicates
const urlCounts = {};
for (const p of photos) {
  // Extract the photo reference from the URL
  const match = p.file_url.match(/google_places%2F([^/]+)/);
  const key = match ? match[1] : p.file_url;
  urlCounts[key] = (urlCounts[key] || 0) + 1;
}

const duplicateUrls = Object.entries(urlCounts).filter(([k, v]) => v > 1);
console.log('\nDuplicate URL patterns:', duplicateUrls.length);
duplicateUrls.forEach(([k, v]) => console.log('  ' + k.substring(0, 40) + '... x' + v));
