import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

// Paginate — default 1000 row limit
async function fetchAll(table, filter = (q) => q) {
  const all = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await filter(sb.from(table).select('*').eq('trip_id', TRIP)).range(from, from + step - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return all;
}

const media = await fetchAll('trip_media');
console.log('TOTAL MEDIA:', media.length);
const byType = {};
for (const m of media) byType[m.parent_type] = (byType[m.parent_type] || 0) + 1;
console.log('By parent_type:', byType);

// Per segment — how many activity photos attached to activities in each segment?
const acts = await fetchAll('trip_activities');
const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number,start_date,end_date').eq('trip_id', TRIP).order('segment_number');
const actById = new Map(acts.map((a) => [a.id, a]));

const photosByAct = new Map();
for (const m of media) {
  if (m.parent_type === 'activity') {
    photosByAct.set(m.parent_id, (photosByAct.get(m.parent_id) || 0) + 1);
  }
}

console.log('\n=== PHOTO DISTRIBUTION BY SEGMENT ===');
console.log('#  Segment                          Total Acts  Enriched  WithPhotos  Photos(sum)  AvgPerPhoto');
for (const s of segs) {
  const segActs = acts.filter((a) => a.segment_id === s.id);
  const enriched = segActs.filter((a) => a.google_place_id).length;
  const withPhotos = segActs.filter((a) => (photosByAct.get(a.id) || 0) > 0).length;
  const totalPhotos = segActs.reduce((n, a) => n + (photosByAct.get(a.id) || 0), 0);
  const avg = withPhotos ? (totalPhotos / withPhotos).toFixed(1) : '0';
  console.log(
    String(s.segment_number).padEnd(3) +
    s.name.padEnd(34) +
    String(segActs.length).padEnd(12) +
    String(enriched).padEnd(10) +
    String(withPhotos).padEnd(12) +
    String(totalPhotos).padEnd(13) +
    avg
  );
}

// Also check orphaned photos — parent_id pointing to activities not in our trip
const orphanPhotos = media.filter((m) => m.parent_type === 'activity' && !actById.has(m.parent_id));
console.log('\nOrphan activity photos (parent_id not in trip_activities):', orphanPhotos.length);
if (orphanPhotos.length) {
  const sampleIds = [...new Set(orphanPhotos.map((m) => m.parent_id))].slice(0, 5);
  console.log('  sample parent_ids:', sampleIds);
}

// Photo columns — what fields do they have?
if (media.length) {
  console.log('\nSample media row keys:', Object.keys(media[0]).sort().join(', '));
  // Show the first photo per segment to understand structure
  for (const s of segs.slice(0, 2)) {
    const segActs = acts.filter((a) => a.segment_id === s.id);
    const firstWithPhotos = segActs.find((a) => (photosByAct.get(a.id) || 0) > 0);
    if (firstWithPhotos) {
      const photo = media.find((m) => m.parent_id === firstWithPhotos.id && m.parent_type === 'activity');
      console.log('\n[' + s.name + '] sample photo on activity "' + firstWithPhotos.name + '":');
      console.log('  google_sourced:', photo.google_sourced, '| file_url.len:', (photo.file_url || '').length, '| thumbnail_url.len:', (photo.thumbnail_url || '').length);
      console.log('  created_at:', photo.created_at);
    }
  }
}

// What is the distribution of media creation dates? Hints at when enrichment ran
const createdMonths = {};
for (const m of media) {
  const month = (m.created_at || '').slice(0, 10); // group by day for recency
  createdMonths[month] = (createdMonths[month] || 0) + 1;
}
console.log('\nPhoto creation dates (last 15 dates):');
for (const [d, n] of Object.entries(createdMonths).sort().slice(-15)) {
  console.log('  ' + d + ': ' + n);
}

process.exit(0);
