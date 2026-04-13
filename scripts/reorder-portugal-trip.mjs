#!/usr/bin/env node
/**
 * Reorder + redate segments on the Portugal Summer 2026 trip
 * (trip id: 2e2ae20a-832b-4e7c-9419-2afdb506b6ab).
 *
 * The current segment order and dates are:
 *   1. Lisbon                Jun 15 – Jun 19   (4 nights)
 *   2. Alentejo & Évora      Jun 19 – Jun 24   (5 nights)
 *   3. Sagres & Lagos        Jun 24 – Jun 26   (2 nights)
 *   4. Douro Valley          Jun 26 – Jul 2    (6 nights)
 *   5. Porto                 Jul 2 – Jul 7     (5 nights)
 *   6. Peneda-Gerês          Jul 7 – Jul 13    (6 nights)
 *   7. Airport Hotel         Jul 13 – Jul 14   (1 night)
 *
 * Target order (swap Sagres↔Alentejo and Peneda↔Porto — night counts stay):
 *   1. Lisbon                Jun 15 – Jun 19   (4 nights)
 *   2. Sagres & Lagos        Jun 19 – Jun 21   (2 nights)  shift −5 days
 *   3. Alentejo & Évora      Jun 21 – Jun 26   (5 nights)  shift +2 days
 *   4. Douro Valley          Jun 26 – Jul 2    (6 nights)
 *   5. Peneda-Gerês          Jul 2 – Jul 8     (6 nights)  shift −5 days
 *   6. Porto                 Jul 8 – Jul 13    (5 nights)  shift +6 days
 *   7. Airport Hotel         Jul 13 – Jul 14   (1 night)
 *
 * Since the night count per segment is unchanged, we shift each segment's
 * existing trip_days records in place (preserving activities, photos, and
 * enrichment that link via day_id / segment_id). No days are created or
 * deleted.
 *
 * We also null out the now-stale prose transition fields on the 4 moved
 * segments (driving_from_previous, driving_notes, route_stops,
 * segment_alternatives, key_activities_summary) so the plan page doesn't
 * show "drive from Lisbon" on a segment that now follows Sagres. Regenerate
 * via the normal import flow later.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reorder-portugal-trip.mjs
 *   node scripts/reorder-portugal-trip.mjs --dry-run   # preview, no writes
 *   node scripts/reorder-portugal-trip.mjs --trip=<uuid>  # override trip id
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TRIP_ID = process.argv.find((a) => a.startsWith('--trip='))?.split('=')[1]
  || '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────
// String-based date math — avoids JS Date timezone pitfalls. Input/output
// format: YYYY-MM-DD.
function shiftDateString(dateStr, daysToAdd) {
  // Parse as UTC so we don't cross DST / tz boundaries.
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const shifted = new Date(base + daysToAdd * 86400000);
  const yy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function daysBetween(aStr, bStr) {
  const [ay, am, ad] = aStr.split('-').map(Number);
  const [by, bm, bd] = bStr.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// ── Target plan ──────────────────────────────────────────────────────────
// Keyed by segment `name` exactly as stored in trip_segments.
// - sort_order: 0-indexed to match the reorder-endpoint convention.
// - segment_number: 1-indexed — this is what the plan page actually renders
//   as "#N" next to each segment, so it must be kept in sync with sort_order.
const TARGET = [
  { name: 'Lisbon',                      start: '2026-06-15', end: '2026-06-19', sort_order: 0, segment_number: 1 },
  { name: 'Sagres & Lagos',              start: '2026-06-19', end: '2026-06-21', sort_order: 1, segment_number: 2 },
  { name: 'Alentejo & Évora',            start: '2026-06-21', end: '2026-06-26', sort_order: 2, segment_number: 3 },
  { name: 'Douro Valley',                start: '2026-06-26', end: '2026-07-02', sort_order: 3, segment_number: 4 },
  { name: 'Peneda-Gerês National Park',  start: '2026-07-02', end: '2026-07-08', sort_order: 4, segment_number: 5 },
  { name: 'Porto',                       start: '2026-07-08', end: '2026-07-13', sort_order: 5, segment_number: 6 },
  { name: 'Airport Hotel',               start: '2026-07-13', end: '2026-07-14', sort_order: 6, segment_number: 7 },
];

// Fields cleared on segments that actually moved (stale neighbor refs).
const STALE_PROSE_FIELDS = {
  driving_from_previous: null,
  driving_notes: null,
  route_stops: null,
  segment_alternatives: null,
  key_activities_summary: null,
};

// ── Fetch current state ──────────────────────────────────────────────────
console.log(`\n→ Reorder/redate trip ${TRIP_ID}${DRY_RUN ? ' [DRY-RUN]' : ''}\n`);

const { data: segments, error: segErr } = await supabase
  .from('trip_segments')
  .select('id,name,start_date,end_date,sort_order,segment_number')
  .eq('trip_id', TRIP_ID)
  .order('sort_order');

if (segErr) { console.error('Failed to fetch segments:', segErr); process.exit(1); }

const segByName = new Map(segments.map((s) => [s.name, s]));
for (const t of TARGET) {
  if (!segByName.has(t.name)) {
    console.error(`✗ Target segment "${t.name}" not found in DB. Found:`,
      segments.map((s) => s.name));
    process.exit(1);
  }
}
if (segments.length !== TARGET.length) {
  console.error(`✗ Segment count mismatch. DB has ${segments.length}, target has ${TARGET.length}.`);
  process.exit(1);
}

// Compute per-segment plan with shift offset and list of day updates.
const plan = [];
for (const t of TARGET) {
  const cur = segByName.get(t.name);
  const offset = daysBetween(cur.start_date, t.start);
  const curNights = daysBetween(cur.start_date, cur.end_date);
  const newNights = daysBetween(t.start, t.end);
  if (curNights !== newNights) {
    console.error(`✗ Night-count mismatch for "${t.name}": current=${curNights}, target=${newNights}. Aborting.`);
    process.exit(1);
  }

  const { data: days, error: dayErr } = await supabase
    .from('trip_days')
    .select('id,date,day_number,sort_order')
    .eq('segment_id', cur.id)
    .order('date');
  if (dayErr) { console.error(`Failed to fetch days for ${t.name}:`, dayErr); process.exit(1); }

  const dayShifts = days.map((d) => ({
    id: d.id,
    from: d.date,
    to: shiftDateString(d.date, offset),
  }));

  const changesDates = cur.start_date !== t.start || cur.end_date !== t.end;
  const changesOrder =
    cur.sort_order !== t.sort_order || cur.segment_number !== t.segment_number;

  plan.push({
    name: t.name,
    id: cur.id,
    from: { start: cur.start_date, end: cur.end_date, sort_order: cur.sort_order, segment_number: cur.segment_number },
    to:   { start: t.start, end: t.end, sort_order: t.sort_order, segment_number: t.segment_number },
    offset,
    dayShifts,
    changesDates,
    changesOrder,
  });
}

// ── Preview ──────────────────────────────────────────────────────────────
console.log('Plan:');
console.log('─'.repeat(72));
for (const p of plan) {
  const dateCol = `${p.from.start}→${p.from.end}  →  ${p.to.start}→${p.to.end}`;
  const sortCol = `so ${p.from.sort_order}→${p.to.sort_order}, sn ${p.from.segment_number}→${p.to.segment_number}`;
  const offCol = p.offset === 0 ? 'no shift' : `${p.offset > 0 ? '+' : ''}${p.offset}d`;
  console.log(`  ${p.name.padEnd(32)} ${dateCol}  (${sortCol}, ${offCol})`);
  if (p.dayShifts.length && p.offset !== 0) {
    for (const s of p.dayShifts) {
      console.log(`      day ${s.from} → ${s.to}`);
    }
  }
}
console.log('─'.repeat(72));

const toMove = plan.filter((p) => p.offset !== 0);
console.log(`Segments whose dates change: ${toMove.length} — ${toMove.map((p) => p.name).join(', ')}`);
console.log(`Segments whose sort_order changes: ${plan.filter((p) => p.changesOrder).length}`);
console.log(`Will clear stale prose on ${toMove.length} moved segments (driving_from_previous, driving_notes, route_stops, segment_alternatives, key_activities_summary).\n`);

if (DRY_RUN) {
  console.log('--dry-run set — no writes performed.');
  process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────
// Order of operations per segment:
//   (a) shift its trip_days dates by `offset`
//   (b) update trip_segments start_date/end_date (+ null prose if moved)
//   (c) update sort_order on every segment at the end
//
// We process moved segments in an order that keeps each mid-state sensible,
// though there are no unique constraints on (trip_id, date) so overlap is OK.
const MOVE_ORDER = [
  'Sagres & Lagos',                 // −5 days (shift earlier first)
  'Alentejo & Évora',               // +2 days
  'Peneda-Gerês National Park',     // −5 days
  'Porto',                          // +6 days
];

console.log('Applying updates...\n');

for (const name of MOVE_ORDER) {
  const p = plan.find((x) => x.name === name);
  if (!p || p.offset === 0) continue;

  console.log(`→ ${p.name}: shifting ${p.dayShifts.length} days by ${p.offset > 0 ? '+' : ''}${p.offset} + updating segment`);

  // (a) shift days — one update per day row
  for (const s of p.dayShifts) {
    const { error } = await supabase
      .from('trip_days')
      .update({ date: s.to })
      .eq('id', s.id);
    if (error) {
      console.error(`  ✗ failed to shift day ${s.from}→${s.to} (${s.id}): ${error.message}`);
      process.exit(1);
    }
  }

  // (b) update the segment row: new dates + cleared prose
  const { error: segUpdateErr } = await supabase
    .from('trip_segments')
    .update({
      start_date: p.to.start,
      end_date: p.to.end,
      ...STALE_PROSE_FIELDS,
    })
    .eq('id', p.id);
  if (segUpdateErr) {
    console.error(`  ✗ failed to update segment ${p.name}: ${segUpdateErr.message}`);
    process.exit(1);
  }
  console.log(`  ✓ done`);
}

// (c) reorder sort_order + segment_number for every segment (idempotent)
console.log('\n→ Updating sort_order and segment_number on all segments');
for (const p of plan) {
  if (!p.changesOrder) continue;
  const { error } = await supabase
    .from('trip_segments')
    .update({ sort_order: p.to.sort_order, segment_number: p.to.segment_number })
    .eq('id', p.id);
  if (error) {
    console.error(`  ✗ order update failed for ${p.name}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  ${p.name}: sort_order ${p.from.sort_order}→${p.to.sort_order}, segment_number ${p.from.segment_number}→${p.to.segment_number}`);
}

// ── Verify ───────────────────────────────────────────────────────────────
console.log('\nVerifying final state...\n');
const { data: finalSegs } = await supabase
  .from('trip_segments')
  .select('name,start_date,end_date,sort_order')
  .eq('trip_id', TRIP_ID)
  .order('sort_order');

for (const s of finalSegs) {
  console.log(`  ${String(s.sort_order).padEnd(2)} | ${s.name.padEnd(32)} ${s.start_date} → ${s.end_date}`);
}

console.log('\nDone.');
