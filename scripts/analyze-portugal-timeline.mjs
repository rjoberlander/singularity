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

// Activity creation timeline by segment
const acts = await fetchAll('trip_activities', 'id,name,segment_id,created_at,updated_at,google_place_id');
const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number,created_at').eq('trip_id', TRIP).order('segment_number');

console.log('\n=== SEGMENTS: when created? ===');
for (const s of segs) console.log('  ' + s.segment_number + ' ' + s.name + ' — ' + s.created_at);

console.log('\n=== ACTIVITY CREATION BY SEGMENT (by day) ===');
for (const s of segs) {
  const segActs = acts.filter((a) => a.segment_id === s.id);
  if (!segActs.length) continue;
  const byDay = {};
  const byDayEnriched = {};
  for (const a of segActs) {
    const d = (a.created_at || '').slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
    if (a.google_place_id) byDayEnriched[d] = (byDayEnriched[d] || 0) + 1;
  }
  console.log('\n[' + s.name + '] (' + segActs.length + ' total)');
  for (const [d, n] of Object.entries(byDay).sort()) {
    const e = byDayEnriched[d] || 0;
    console.log('  created ' + d + ': ' + n + ' activities (' + e + ' with google_place_id)');
  }
}

// Media timeline (activity parent) — group by day
const media = await fetchAll('trip_media', 'id,parent_id,parent_type,created_at,google_photo_reference,google_attribution_name,content_hash');
const activityMedia = media.filter((m) => m.parent_type === 'activity');
const actById = new Map(acts.map((a) => [a.id, a]));

console.log('\n=== ACTIVITY MEDIA CREATION TIMELINE ===');
const mediaByDay = {};
const mediaByDayOrphan = {};
for (const m of activityMedia) {
  const d = (m.created_at || '').slice(0, 10);
  mediaByDay[d] = (mediaByDay[d] || 0) + 1;
  if (!actById.has(m.parent_id)) {
    mediaByDayOrphan[d] = (mediaByDayOrphan[d] || 0) + 1;
  }
}
for (const [d, n] of Object.entries(mediaByDay).sort()) {
  const orph = mediaByDayOrphan[d] || 0;
  console.log('  ' + d + ': ' + n + ' photos (' + orph + ' orphan, ' + (n - orph) + ' attached)');
}

// Can orphan photos be re-attached by name? Sample the activity names that orphan parent_ids referenced.
// We don't have the old activities anymore, so we have to see if photos carry any naming metadata
// that maps back to an activity.
console.log('\n=== ORPHAN PHOTO FIELDS ===');
const orphans = activityMedia.filter((m) => !actById.has(m.parent_id));
const withContentHash = orphans.filter((m) => m.content_hash).length;
const withRef = orphans.filter((m) => m.google_photo_reference).length;
const withAttr = orphans.filter((m) => m.google_attribution_name).length;
console.log('  total orphans:', orphans.length);
console.log('  with content_hash:', withContentHash);
console.log('  with google_photo_reference:', withRef);
console.log('  with google_attribution_name (sample):', withAttr);
// Group orphans by parent_id — how many unique activity IDs?
const orphanIds = [...new Set(orphans.map((m) => m.parent_id))];
console.log('  unique orphan activity IDs:', orphanIds.length);

// Query auth.log? No, we don't have that. But we can check if the orphan parent_ids exist in trip_activities at all (maybe in other trips? unlikely)
const { data: anywhere } = await sb.from('trip_activities').select('id,name,trip_id').in('id', orphanIds.slice(0, 10));
console.log('  sample orphan IDs in any trip_activities table?', anywhere);

// Check if accommodations photos match the Hyatt
const accMedia = media.filter((m) => m.parent_type === 'accommodation');
console.log('\nAccommodation media count:', accMedia.length);

process.exit(0);
