import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

async function fetchAll(table, columns = '*') {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(columns).eq('trip_id', TRIP).range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

const acts = await fetchAll('trip_activities', 'id,name,segment_id,google_place_id');
const media = await fetchAll('trip_media', 'id,parent_id,parent_type,caption,google_photo_reference,google_attribution_name,google_attribution_uri,file_url,content_hash,original_filename,created_at');
const actIds = new Set(acts.map((a) => a.id));
const orphans = media.filter((m) => m.parent_type === 'activity' && !actIds.has(m.parent_id));

console.log('Orphan photos:', orphans.length);
console.log('\n=== SAMPLE ORPHAN PHOTO FIELDS (first 3) ===\n');
for (const o of orphans.slice(0, 3)) {
  console.log('id:', o.id);
  console.log('  parent_id (dead):', o.parent_id);
  console.log('  google_photo_reference:', o.google_photo_reference);
  console.log('  google_attribution_name:', o.google_attribution_name);
  console.log('  caption:', o.caption);
  console.log('  file_url:', o.file_url);
  console.log('  original_filename:', o.original_filename);
  console.log('  content_hash:', o.content_hash);
  console.log('  created_at:', o.created_at);
  console.log();
}

// Try to parse place_id out of google_photo_reference
// Expected format: "places/ChIJ.../photos/..."
function extractPlaceId(ref) {
  if (!ref) return null;
  const m = String(ref).match(/^places\/([^/]+)\/photos\//);
  return m ? m[1] : null;
}

const placeIdsInOrphans = new Set();
const orphanByPlace = new Map(); // place_id -> array of orphan photos
let orphansWithPlaceId = 0;
for (const o of orphans) {
  const pid = extractPlaceId(o.google_photo_reference);
  if (pid) {
    orphansWithPlaceId++;
    placeIdsInOrphans.add(pid);
    if (!orphanByPlace.has(pid)) orphanByPlace.set(pid, []);
    orphanByPlace.get(pid).push(o);
  }
}
console.log('Orphans with parseable place_id:', orphansWithPlaceId, '/', orphans.length);
console.log('Distinct place IDs in orphans:', placeIdsInOrphans.size);

// How many current enriched activities have a matching place_id in orphans?
const enrichedActs = acts.filter((a) => a.google_place_id);
const matchableActs = enrichedActs.filter((a) => placeIdsInOrphans.has(a.google_place_id));
const matchableByPlace = new Map();
for (const a of matchableActs) {
  if (!matchableByPlace.has(a.google_place_id)) matchableByPlace.set(a.google_place_id, []);
  matchableByPlace.get(a.google_place_id).push(a);
}
console.log('\nCurrent enriched activities:', enrichedActs.length);
console.log('Enriched activities whose google_place_id matches an orphan photo place_id:', matchableActs.length);

// How many orphan photos would we recover?
let recoverable = 0;
let orphansForMatched = 0;
for (const [pid, ph] of orphanByPlace) {
  if (matchableByPlace.has(pid)) {
    orphansForMatched += ph.length;
    recoverable += ph.length;
  }
}
console.log('Orphan photos recoverable (matching place_id):', recoverable);

// Per-segment breakdown of matchable activities
const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number').eq('trip_id', TRIP).order('segment_number');
console.log('\n=== PER-SEGMENT RECOVERY POTENTIAL ===');
for (const s of segs) {
  const segEnriched = enrichedActs.filter((a) => a.segment_id === s.id);
  const segMatchable = matchableActs.filter((a) => a.segment_id === s.id);
  let recoverablePhotosForSeg = 0;
  for (const a of segMatchable) {
    recoverablePhotosForSeg += orphanByPlace.get(a.google_place_id)?.length || 0;
  }
  // Some activities share a place_id — distribute evenly? For now just count total photos attached to each distinct place_id once per activity
  const uniquePlaceIds = [...new Set(segMatchable.map((a) => a.google_place_id))];
  let uniquePhotoPool = 0;
  for (const pid of uniquePlaceIds) uniquePhotoPool += orphanByPlace.get(pid)?.length || 0;
  console.log('  ' + s.segment_number + ' ' + s.name.padEnd(32) + ' enriched=' + segEnriched.length + ' matchable=' + segMatchable.length + ' uniquePlaces=' + uniquePlaceIds.length + ' orphanPhotosInPool=' + uniquePhotoPool);
}

// Cases where multiple current activities share the same place_id (duplicates — must split photos)
const multiActPlaces = [...matchableByPlace.entries()].filter(([, as]) => as.length > 1);
console.log('\nPlaces mapped to MULTIPLE current activities (need careful split):', multiActPlaces.length);
for (const [pid, as] of multiActPlaces.slice(0, 10)) {
  console.log('  place', pid, '→', as.map((a) => a.name).join(' | '));
}

// Orphans whose place_id NO LONGER matches any current activity (these really are stale)
const unrecoverable = orphans.length - recoverable;
console.log('\nUnrecoverable orphans (place_id not in any current activity):', unrecoverable);
// Sample a few to see what they are
const unrecoverablePhotos = orphans.filter((o) => {
  const pid = extractPlaceId(o.google_photo_reference);
  return pid && !matchableByPlace.has(pid);
});
const unrecoverablePlaces = [...new Set(unrecoverablePhotos.map((o) => extractPlaceId(o.google_photo_reference)))];
console.log('Distinct unrecoverable place_ids:', unrecoverablePlaces.length);
console.log('Sample unrecoverable orphan captions (first 10):');
for (const o of unrecoverablePhotos.slice(0, 10)) {
  console.log('  "' + (o.caption || '(no caption)').slice(0, 80) + '"');
}

process.exit(0);
