import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

// 1. Get all activity IDs to check for orphans
const { data: acts } = await sb.from('trip_activities').select('id').eq('trip_id', TRIP);
const actIds = new Set(acts.map(a => a.id));

// 2. Get ALL trip_media, paginated
const media = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('trip_media')
    .select('id,parent_id,parent_type,content_hash,file_url,google_photo_reference')
    .eq('trip_id', TRIP)
    .range(from, from + 999);
  if (error) { console.error(error); process.exit(1); }
  if (!data?.length) break;
  media.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}

console.log(`Total media: ${media.length}`);

// 3. Delete orphans (parent_id doesn't exist in trip_activities or trip_accommodations)
const { data: accomms } = await sb.from('trip_accommodations').select('id').eq('trip_id', TRIP);
const accommIds = new Set((accomms || []).map(a => a.id));

const orphans = media.filter(m => {
  if (m.parent_type === 'activity') return !actIds.has(m.parent_id);
  if (m.parent_type === 'accommodation') return !accommIds.has(m.parent_id);
  return true; // unknown parent_type = orphan
});
console.log(`Orphans (parent doesn't exist): ${orphans.length}`);

if (orphans.length > 0) {
  for (let i = 0; i < orphans.length; i += 500) {
    await sb.from('trip_media').delete().in('id', orphans.slice(i, i + 500).map(o => o.id));
  }
  console.log(`Deleted ${orphans.length} orphans`);
}

// 4. Re-fetch non-orphan media with NULL content_hash
const remaining = media.filter(m => !orphans.find(o => o.id === m.id));
const nullHash = remaining.filter(m => !m.content_hash);
console.log(`\nPhotos with NULL content_hash: ${nullHash.length}`);

// 5. Backfill: download each photo, compute hash, update row.
//    If download fails (dead URL) → delete the row.
//    If hash matches an existing photo → delete the duplicate.
const existingHashes = new Set(remaining.filter(m => m.content_hash).map(m => m.content_hash));
let backfilled = 0;
let deletedDead = 0;
let deletedDupeHash = 0;

for (let i = 0; i < nullHash.length; i++) {
  const m = nullHash[i];
  if (i > 0 && i % 100 === 0) console.log(`  [${i}/${nullHash.length}] backfilled=${backfilled} dead=${deletedDead} dupeHash=${deletedDupeHash}`);

  try {
    // HEAD first to check if URL is alive
    const resp = await fetch(m.file_url, { method: 'GET' });
    if (!resp.ok) {
      // Dead URL — delete
      await sb.from('trip_media').delete().eq('id', m.id);
      deletedDead++;
      continue;
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.length < 100) {
      // Too small — probably an error page
      await sb.from('trip_media').delete().eq('id', m.id);
      deletedDead++;
      continue;
    }

    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    if (existingHashes.has(hash)) {
      // Duplicate by content — delete this one
      await sb.from('trip_media').delete().eq('id', m.id);
      deletedDupeHash++;
      continue;
    }

    // Update with the computed hash
    const { error } = await sb.from('trip_media').update({ content_hash: hash }).eq('id', m.id);
    if (error) {
      // Likely unique constraint violation — another row already has this hash
      if (error.code === '23505') {
        await sb.from('trip_media').delete().eq('id', m.id);
        deletedDupeHash++;
        continue;
      }
    }

    existingHashes.add(hash);
    backfilled++;
  } catch (err) {
    // Network error — delete
    await sb.from('trip_media').delete().eq('id', m.id);
    deletedDead++;
  }

  // Small pause to avoid hammering Supabase storage
  if (i % 20 === 0) await new Promise(r => setTimeout(r, 100));
}

console.log(`\n=== Results ===`);
console.log(`Orphans deleted: ${orphans.length}`);
console.log(`Backfilled content_hash: ${backfilled}`);
console.log(`Deleted dead URLs: ${deletedDead}`);
console.log(`Deleted duplicate hashes: ${deletedDupeHash}`);
console.log(`Total deleted: ${orphans.length + deletedDead + deletedDupeHash}`);

// Final count
const { count } = await sb.from('trip_media').select('*', { count: 'exact', head: true }).eq('trip_id', TRIP);
console.log(`\nFinal media count: ${count}`);

process.exit(0);
