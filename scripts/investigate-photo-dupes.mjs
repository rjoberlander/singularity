import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

async function fetchAll(cols) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('trip_media').select(cols).eq('trip_id', TRIP).range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

const media = await fetchAll('id,parent_id,parent_type,google_photo_reference,content_hash,file_url,created_at');
console.log(`Total trip_media rows: ${media.length}`);
console.log(`  activity: ${media.filter(m => m.parent_type === 'activity').length}`);
console.log(`  accommodation: ${media.filter(m => m.parent_type === 'accommodation').length}`);

// 1. Check for duplicate google_photo_reference
const refCounts = new Map();
for (const m of media) {
  if (!m.google_photo_reference) continue;
  refCounts.set(m.google_photo_reference, (refCounts.get(m.google_photo_reference) || 0) + 1);
}
const dupeRefs = [...refCounts.entries()].filter(([, c]) => c > 1);
console.log(`\n=== Duplicate google_photo_reference: ${dupeRefs.length} ===`);
for (const [ref, count] of dupeRefs.slice(0, 10)) {
  const rows = media.filter(m => m.google_photo_reference === ref);
  const parentIds = [...new Set(rows.map(m => m.parent_id))];
  console.log(`  ref=${ref.slice(0, 40)}... count=${count} parents=${parentIds.length} (${parentIds.map(p => p.slice(0,8)).join(',')})`);
}

// 2. Check for duplicate content_hash
const hashCounts = new Map();
for (const m of media) {
  if (!m.content_hash) continue;
  hashCounts.set(m.content_hash, (hashCounts.get(m.content_hash) || 0) + 1);
}
const dupeHashes = [...hashCounts.entries()].filter(([, c]) => c > 1);
console.log(`\n=== Duplicate content_hash: ${dupeHashes.length} ===`);
for (const [hash, count] of dupeHashes.slice(0, 10)) {
  const rows = media.filter(m => m.content_hash === hash);
  const parentIds = [...new Set(rows.map(m => m.parent_id))];
  console.log(`  hash=${hash.slice(0, 16)}... count=${count} parents=${parentIds.length}`);
}

// 3. Check for duplicate file_url
const urlCounts = new Map();
for (const m of media) {
  if (!m.file_url) continue;
  urlCounts.set(m.file_url, (urlCounts.get(m.file_url) || 0) + 1);
}
const dupeUrls = [...urlCounts.entries()].filter(([, c]) => c > 1);
console.log(`\n=== Duplicate file_url: ${dupeUrls.length} ===`);
for (const [url, count] of dupeUrls.slice(0, 5)) {
  console.log(`  url=${url.slice(-60)}... count=${count}`);
}

// 4. Check NULL fields
const nullRef = media.filter(m => !m.google_photo_reference).length;
const nullHash = media.filter(m => !m.content_hash).length;
const nullUrl = media.filter(m => !m.file_url).length;
console.log(`\n=== NULL fields ===`);
console.log(`  NULL google_photo_reference: ${nullRef}`);
console.log(`  NULL content_hash: ${nullHash}`);
console.log(`  NULL file_url: ${nullUrl}`);

// 5. Check per-activity: any activity with way too many photos?
const photosByActivity = new Map();
for (const m of media) {
  if (m.parent_type !== 'activity') continue;
  photosByActivity.set(m.parent_id, (photosByActivity.get(m.parent_id) || 0) + 1);
}
const highPhotoActs = [...photosByActivity.entries()].filter(([, c]) => c > 20).sort((a, b) => b[1] - a[1]);
console.log(`\n=== Activities with >20 photos (suspicious): ${highPhotoActs.length} ===`);

// Get activity names for these
if (highPhotoActs.length > 0) {
  const ids = highPhotoActs.slice(0, 15).map(([id]) => id);
  const { data: acts } = await sb.from('trip_activities').select('id,name,segment_id').in('id', ids);
  const actMap = new Map((acts || []).map(a => [a.id, a]));
  const { data: segs } = await sb.from('trip_segments').select('id,name').eq('trip_id', TRIP);
  const segMap = new Map((segs || []).map(s => [s.id, s]));

  for (const [actId, count] of highPhotoActs.slice(0, 15)) {
    const act = actMap.get(actId);
    const seg = act ? segMap.get(act.segment_id) : null;
    console.log(`  ${count} photos — ${act?.name || 'UNKNOWN'} [${seg?.name || '?'}]`);
  }
}

// 6. Check if unique indexes actually exist
console.log(`\n=== Summary ===`);
console.log(`Total photos: ${media.length}`);
console.log(`Duplicate refs: ${dupeRefs.length} (${dupeRefs.reduce((s, [,c]) => s + c - 1, 0)} extra rows)`);
console.log(`Duplicate hashes: ${dupeHashes.length} (${dupeHashes.reduce((s, [,c]) => s + c - 1, 0)} extra rows)`);
console.log(`Duplicate URLs: ${dupeUrls.length} (${dupeUrls.reduce((s, [,c]) => s + c - 1, 0)} extra rows)`);
console.log(`NULL content_hash: ${nullHash} (these bypass the hash unique index)`);

process.exit(0);
