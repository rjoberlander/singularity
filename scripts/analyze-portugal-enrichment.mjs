import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

// Skip filter — mirror of schedule-validation.ts::shouldSkip()
const NON_ENRICHABLE = new Set(['transport', 'downtime', 'logistics', 'sleep', 'rest', 'custom']);
const SKIP_KW = [
  'arrive', 'depart', 'pick up', 'check-in', 'check in', 'checkout',
  'wake up', 'kids to bed', 'load car', 'pack', 'pool time', 'siesta',
  'nap', 'sleep', 'morning routine',
];
const TRANSIT = [
  /^uber\b/i, /^taxi\b/i, /^bus\b/i, /^train\b/i, /^tram\b/i,
  /^drive\s+(to|from|back)\b/i,
  /^walk\s+(to|from|back|down\s+to)\b/i,
  /^travel\s+to\b/i, /^head\s+to\b/i, /^ride\s+to\b/i,
  /^transfer\b/i, /^drop[\s-]*off\b/i, /^park\s+at\b/i,
  /\b(back\s+to|to\s+the)\s+(hotel|airport|car|station|accommodation)\b/i,
];
const MEAL_WORDS = '(breakfast|lunch|dinner|supper|brunch)';
const MEAL_MODS = '(early|quick|light|big|full|easy|simple|late|fast|hotel|room|family|kids?)';
const GENERIC_MEAL = [
  new RegExp(`^${MEAL_WORDS}$`, 'i'),
  new RegExp(`^${MEAL_MODS}(\\s+${MEAL_MODS})?\\s+${MEAL_WORDS}$`, 'i'),
  new RegExp(`^${MEAL_WORDS}\\s+(at|in)\\s+(hotel|accommodation|resort|room)`, 'i'),
  /^hotel breakfast$/i, /^breakfast at hotel$/i, /^breakfast at accommodation$/i,
  /breakfast \(at hotel\)/i, /lunch \(at hotel\)/i, /dinner \(at hotel\)/i,
  /room service/i,
];

function shouldSkip(a) {
  if (a.activity_type && NON_ENRICHABLE.has(a.activity_type)) return 'non-enrichable-type';
  const lower = (a.name || '').toLowerCase();
  if (SKIP_KW.some((k) => lower.includes(k))) return 'skip-keyword';
  if (TRANSIT.some((p) => p.test(a.name || ''))) return 'transit';
  if (GENERIC_MEAL.some((p) => p.test(a.name || ''))) {
    const loc = (a.location_name || '').trim();
    if (loc && !/^(hotel|accommodation|resort)\b/i.test(loc)) return null;
    return 'generic-meal-at-hotel';
  }
  return null;
}

const { data: segs } = await sb
  .from('trip_segments')
  .select('id,name,segment_number,start_date,end_date')
  .eq('trip_id', TRIP)
  .order('segment_number');

const { data: acts } = await sb
  .from('trip_activities')
  .select('id,name,activity_type,location_name,day_id,date,segment_id,google_place_id,latitude,longitude')
  .eq('trip_id', TRIP);

// Paginate — default Supabase cap is 1000 rows per query
const media = [];
{
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('trip_media')
      .select('parent_id')
      .eq('trip_id', TRIP)
      .eq('parent_type', 'activity')
      .range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    media.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
}
const photosByAct = new Map();
for (const m of media) photosByAct.set(m.parent_id, (photosByAct.get(m.parent_id) || 0) + 1);

const { data: days } = await sb
  .from('trip_days')
  .select('id,date,segment_id')
  .eq('trip_id', TRIP);
const dayById = new Map(days.map((d) => [d.id, d]));

const perSegRows = [];
const missingActivitiesSample = [];
const enrichedNoPhotoSample = [];

for (const s of segs) {
  const segActs = acts.filter((a) => a.segment_id === s.id);
  let enriched = 0, enrichedWithPhotos = 0, enrichedNoPhotos = 0;
  let needsEnrichment = 0, needsNoLoc = 0;
  const skipCounts = { nonEnrichable: 0, keyword: 0, transit: 0, genericMeal: 0 };
  const missingByDate = {};
  const enrichedNoPhotoByDate = {};

  for (const a of segActs) {
    const photos = photosByAct.get(a.id) || 0;
    if (a.google_place_id) {
      enriched++;
      if (photos > 0) {
        enrichedWithPhotos++;
      } else {
        enrichedNoPhotos++;
        const d = a.date || (a.day_id && dayById.get(a.day_id)?.date) || '(no-date)';
        enrichedNoPhotoByDate[d] = (enrichedNoPhotoByDate[d] || 0) + 1;
        if (enrichedNoPhotoSample.length < 20) {
          enrichedNoPhotoSample.push({ seg: s.name, date: d, name: a.name, type: a.activity_type, loc: a.location_name });
        }
      }
      continue;
    }
    const skipReason = shouldSkip(a);
    if (skipReason === 'non-enrichable-type') { skipCounts.nonEnrichable++; continue; }
    if (skipReason === 'skip-keyword') { skipCounts.keyword++; continue; }
    if (skipReason === 'transit') { skipCounts.transit++; continue; }
    if (skipReason === 'generic-meal-at-hotel') { skipCounts.genericMeal++; continue; }
    needsEnrichment++;
    if (!a.location_name) needsNoLoc++;
    const d = a.date || (a.day_id && dayById.get(a.day_id)?.date) || '(no-date)';
    missingByDate[d] = (missingByDate[d] || 0) + 1;
    if (missingActivitiesSample.length < 30) {
      missingActivitiesSample.push({ seg: s.name, date: d, name: a.name, type: a.activity_type, loc: a.location_name });
    }
  }

  perSegRows.push({
    seg: s.name, segNum: s.segment_number,
    dates: s.start_date + ' → ' + s.end_date,
    total: segActs.length,
    enriched, enrichedWithPhotos, enrichedNoPhotos,
    needsEnrichment, needsNoLoc,
    skipCounts, missingByDate, enrichedNoPhotoByDate,
  });
}

console.log('\n=== ENRICHMENT STATUS BY SEGMENT ===\n');
const header = '#  ' + 'Segment'.padEnd(34) + 'Dates'.padEnd(24) + 'Total  Enriched  WithPhotos  NoPhotos  NeedsEnrich  Skipped(type/kw/trans/meal)';
console.log(header);
console.log('─'.repeat(header.length));
for (const r of perSegRows) {
  console.log(
    String(r.segNum).padEnd(3) +
    r.seg.padEnd(34) +
    r.dates.padEnd(24) +
    String(r.total).padEnd(7) +
    String(r.enriched).padEnd(10) +
    String(r.enrichedWithPhotos).padEnd(12) +
    String(r.enrichedNoPhotos).padEnd(10) +
    String(r.needsEnrichment).padEnd(13) +
    [r.skipCounts.nonEnrichable, r.skipCounts.keyword, r.skipCounts.transit, r.skipCounts.genericMeal].join('/')
  );
}

const g = perSegRows.reduce((acc, r) => {
  acc.total += r.total;
  acc.enriched += r.enriched;
  acc.enrichedWithPhotos += r.enrichedWithPhotos;
  acc.enrichedNoPhotos += r.enrichedNoPhotos;
  acc.needsEnrichment += r.needsEnrichment;
  acc.needsNoLoc += r.needsNoLoc;
  return acc;
}, { total: 0, enriched: 0, enrichedWithPhotos: 0, enrichedNoPhotos: 0, needsEnrichment: 0, needsNoLoc: 0 });
console.log('\nGLOBAL:', JSON.stringify(g, null, 2));

console.log('\n=== DATES WITH ENRICHABLE ACTIVITIES MISSING google_place_id ===\n');
for (const r of perSegRows) {
  if (r.needsEnrichment === 0) continue;
  console.log('[' + r.seg + ' — seg #' + r.segNum + ']');
  for (const [d, n] of Object.entries(r.missingByDate).sort()) {
    console.log('  ' + d + ' → ' + n + ' activity' + (n > 1 ? 'ies' : ''));
  }
}

console.log('\n=== DATES WHERE ENRICHED ACTIVITIES HAVE ZERO PHOTOS ===\n');
for (const r of perSegRows) {
  if (r.enrichedNoPhotos === 0) continue;
  console.log('[' + r.seg + ' — seg #' + r.segNum + '] ' + r.enrichedNoPhotos + ' activities');
  for (const [d, n] of Object.entries(r.enrichedNoPhotoByDate).sort()) {
    console.log('  ' + d + ' → ' + n);
  }
}

console.log('\n=== SAMPLE: UNENRICHED ACTIVITIES (first 30) ===\n');
for (const a of missingActivitiesSample) {
  console.log('  [' + a.seg.slice(0, 20).padEnd(20) + '] ' + a.date + ' ' + String(a.type || '?').padEnd(12) + a.name + (a.loc ? ' @ ' + a.loc : ' (no loc)'));
}

console.log('\n=== SAMPLE: ENRICHED BUT NO PHOTOS (first 20) ===\n');
for (const a of enrichedNoPhotoSample) {
  console.log('  [' + a.seg.slice(0, 20).padEnd(20) + '] ' + a.date + ' ' + String(a.type || '?').padEnd(12) + a.name + (a.loc ? ' @ ' + a.loc : ''));
}

process.exit(0);
