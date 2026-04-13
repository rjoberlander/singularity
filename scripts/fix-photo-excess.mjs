import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const MAX_PHOTOS = 20;
const DRY_RUN = process.argv.includes('--dry-run');

async function fetchAll(cols) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('trip_media').select(cols).eq('trip_id', TRIP).eq('parent_type', 'activity').range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

const media = await fetchAll('id,parent_id,created_at,sort_order');

// Group by parent_id
const byActivity = new Map();
for (const m of media) {
  if (!byActivity.has(m.parent_id)) byActivity.set(m.parent_id, []);
  byActivity.get(m.parent_id).push(m);
}

// Find activities with excess photos
const toDelete = [];
let activitiesCapped = 0;

for (const [actId, photos] of byActivity) {
  if (photos.length <= MAX_PHOTOS) continue;
  activitiesCapped++;
  // Keep the first MAX_PHOTOS by created_at, delete the rest
  photos.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const excess = photos.slice(MAX_PHOTOS);
  for (const p of excess) toDelete.push(p.id);
}

console.log(`Activities with >${MAX_PHOTOS} photos: ${activitiesCapped}`);
console.log(`Photos to delete: ${toDelete.length}`);
console.log(`Photos to keep: ${media.length - toDelete.length}`);

if (DRY_RUN) {
  console.log('--dry-run, not deleting.');
  process.exit(0);
}

// Delete in chunks
for (let i = 0; i < toDelete.length; i += 500) {
  const chunk = toDelete.slice(i, i + 500);
  const { error } = await sb.from('trip_media').delete().in('id', chunk);
  if (error) console.error('Delete error:', error.message);
}

console.log(`Deleted ${toDelete.length} excess photos.`);
console.log(`Remaining: ${media.length - toDelete.length}`);

process.exit(0);
