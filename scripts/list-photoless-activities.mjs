import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

async function fetchAll(table, cols, extra = {}) {
  const all = []; let from = 0;
  while (true) {
    let q = sb.from(table).select(cols).eq('trip_id', TRIP);
    for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

const acts = await fetchAll('trip_activities', 'id,name,activity_type,location_name,segment_id,day_id,google_place_id');
const media = await fetchAll('trip_media', 'parent_id', { parent_type: 'activity' });
const days = await fetchAll('trip_days', 'id,date');
const dayById = new Map(days.map((d) => [d.id, d]));
const photosByAct = new Map();
for (const m of media) photosByAct.set(m.parent_id, (photosByAct.get(m.parent_id) || 0) + 1);
const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number').eq('trip_id', TRIP).order('segment_number');
const segById = new Map(segs.map((s) => [s.id, s]));

// Which activities have ANOTHER activity sharing the same place_id that DOES have photos?
const actsByPlaceId = new Map();
for (const a of acts) {
  if (a.google_place_id) {
    if (!actsByPlaceId.has(a.google_place_id)) actsByPlaceId.set(a.google_place_id, []);
    actsByPlaceId.get(a.google_place_id).push(a);
  }
}

const noPhotos = acts.filter((a) => (photosByAct.get(a.id) || 0) === 0);

const NON_ENRICHABLE = new Set(['transport', 'downtime', 'logistics', 'sleep', 'rest', 'custom']);
const SKIP_KW = ['arrive', 'depart', 'pick up', 'check-in', 'check in', 'checkout', 'wake up', 'kids to bed', 'load car', 'pack', 'pool time', 'siesta', 'nap', 'sleep', 'morning routine'];
const TRANSIT = [
  /^uber\b/i, /^taxi\b/i, /^bus\b/i, /^train\b/i, /^tram\b/i,
  /^drive\s+(to|from|back)\b/i, /^walk\s+(to|from|back|down\s+to)\b/i,
  /^travel\s+to\b/i, /^head\s+to\b/i, /^ride\s+to\b/i,
  /^transfer\b/i, /^drop[\s-]*off\b/i, /^park\s+at\b/i,
  /\b(back\s+to|to\s+the)\s+(hotel|airport|car|station|accommodation)\b/i,
];
const GENERIC_MEAL = /^((early|quick|light|big|full|easy|simple|late|fast|hotel|room|family|kids?)\s+)?(breakfast|lunch|dinner|supper|brunch)$/i;
const HOTEL_LOC = /^(hotel|accommodation|resort)\b/i;

function classify(a) {
  if (a.activity_type && NON_ENRICHABLE.has(a.activity_type)) return 'non-enrichable type (transport/downtime/logistics)';
  const lower = (a.name || '').toLowerCase();
  if (SKIP_KW.some((k) => lower.includes(k))) return 'skip keyword (wake up/pack/nap/etc)';
  if (TRANSIT.some((p) => p.test(a.name || ''))) return 'transit (walk to/drive to/etc)';
  if (GENERIC_MEAL.test(a.name || '')) {
    const loc = (a.location_name || '').trim();
    if (!loc || HOTEL_LOC.test(loc)) return 'generic meal at hotel';
  }
  // Check if a sibling for the same place already has photos
  if (a.google_place_id) {
    const siblings = (actsByPlaceId.get(a.google_place_id) || []).filter((s) => s.id !== a.id);
    const siblingWithPhotos = siblings.find((s) => (photosByAct.get(s.id) || 0) > 0);
    if (siblingWithPhotos) return 'sibling has photos (same place: "' + siblingWithPhotos.name + '")';
    return 'enriched but no photos fetched';
  }
  return 'no Google match found';
}

const byReason = {};
for (const a of noPhotos) {
  const reason = classify(a);
  if (!byReason[reason]) byReason[reason] = [];
  byReason[reason].push(a);
}

console.log('\n=== ' + noPhotos.length + ' of ' + acts.length + ' ACTIVITIES WITHOUT PHOTOS ===\n');
for (const [reason, list] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
  list.sort((x, y) => {
    const sx = segById.get(x.segment_id)?.segment_number || 99;
    const sy = segById.get(y.segment_id)?.segment_number || 99;
    return sx - sy || (x.name || '').localeCompare(y.name || '');
  });
  console.log(reason + ' (' + list.length + '):');
  for (const a of list) {
    const seg = segById.get(a.segment_id);
    const d = a.day_id ? dayById.get(a.day_id)?.date : null;
    console.log(
      '  [seg ' + (seg?.segment_number || '?') + '] ' +
      (d || 'unscheduled').padEnd(12) +
      (a.activity_type || '?').padEnd(13) +
      a.name +
      (a.location_name ? ' @ ' + a.location_name : '')
    );
  }
  console.log();
}

process.exit(0);
