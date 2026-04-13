#!/usr/bin/env node
/**
 * Recover orphaned trip_media photos for the Portugal trip
 * (trip id: 2e2ae20a-832b-4e7c-9419-2afdb506b6ab).
 *
 * Context: During an earlier re-import of segments 1-5 (Feb 6), the old
 * trip_activities rows were replaced with new UUIDs, but the trip_media
 * rows that were fetched on Jan 26 kept pointing to the dead activity IDs.
 * 1,463 activity-scoped photos are stranded in trip_media but the underlying
 * JPEG files are still live in Supabase storage.
 *
 * Strategy: every orphan photo has a `google_photo_reference` of the form
 * `places/{placeId}/photos/{photoId}`. The leading place_id is deterministic
 * and matches the `google_place_id` currently stored on the re-imported
 * activities — so we can re-link a photo to its "new" activity with a pure
 * DB UPDATE, no Google Places API call, no re-download.
 *
 * For each orphan:
 *   - Parse place_id from google_photo_reference
 *   - Look up current activities with that google_place_id
 *     - 1 match  → UPDATE parent_id to that activity
 *     - N>1 match → UPDATE to first-alphabetically (unique-constraint means
 *                   we can't duplicate the row for other matching activities;
 *                   those are logged so you can manually re-share if wanted)
 *     - 0 match  → DELETE the orphan (place truly no longer referenced)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recover-portugal-photos.mjs
 *   node scripts/recover-portugal-photos.mjs --dry-run
 *   node scripts/recover-portugal-photos.mjs --trip=<uuid>
 *   node scripts/recover-portugal-photos.mjs --segment=<id>   # restrict to one segment
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const TRIP_ID = process.argv.find((a) => a.startsWith('--trip='))?.split('=')[1]
  || '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const SEGMENT_FILTER = process.argv.find((a) => a.startsWith('--segment='))?.split('=')[1] || null;
const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Helpers ──────────────────────────────────────────────────────────────
async function fetchAll(table, columns = '*') {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(columns).eq('trip_id', TRIP_ID).range(from, from + 999);
    if (error) { console.error(`fetch ${table} failed:`, error); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// google_photo_reference format: "places/ChIJ.../photos/Axxx..."
function extractPlaceId(ref) {
  if (!ref) return null;
  const m = String(ref).match(/^places\/([^/]+)\/photos\//);
  return m ? m[1] : null;
}

// ── Load state ───────────────────────────────────────────────────────────
console.log(`\n→ Recover orphan photos for trip ${TRIP_ID}${DRY_RUN ? ' [DRY-RUN]' : ''}${SEGMENT_FILTER ? ` (segment=${SEGMENT_FILTER})` : ''}\n`);

const acts = await fetchAll('trip_activities', 'id,name,segment_id,google_place_id');
const media = await fetchAll(
  'trip_media',
  'id,parent_id,parent_type,google_photo_reference,file_url,caption,created_at'
);
const { data: segs } = await sb
  .from('trip_segments')
  .select('id,name,segment_number')
  .eq('trip_id', TRIP_ID)
  .order('segment_number');
const segById = new Map(segs.map((s) => [s.id, s]));

const actById = new Map(acts.map((a) => [a.id, a]));
const orphansAll = media.filter((m) => m.parent_type === 'activity' && !actById.has(m.parent_id));

// Build: place_id -> list of current enriched activities with that place_id
const actsByPlaceId = new Map();
for (const a of acts) {
  if (!a.google_place_id) continue;
  if (SEGMENT_FILTER && a.segment_id !== SEGMENT_FILTER) continue;
  if (!actsByPlaceId.has(a.google_place_id)) actsByPlaceId.set(a.google_place_id, []);
  actsByPlaceId.get(a.google_place_id).push(a);
}

// Deterministic pick per place: first by name (ASCII lowercase)
function pickPrimary(activities) {
  return [...activities].sort((x, y) => (x.name || '').localeCompare(y.name || ''))[0];
}

// ── Classify orphans ─────────────────────────────────────────────────────
const reassign = []; // { orphanId, toActivityId, toActivityName, toSegmentName, placeId }
const toDelete = []; // { orphanId, placeId, reason }
const unparseable = []; // orphans with no parseable place_id
const skippedBySegmentFilter = []; // when --segment is set and place isn't in that segment

// For multi-activity places — collect secondary activities that WON'T get photos attached
const multiActivityLeftovers = new Map(); // activityId -> { name, segmentName, photoCount }

for (const o of orphansAll) {
  const placeId = extractPlaceId(o.google_photo_reference);
  if (!placeId) {
    unparseable.push(o);
    continue;
  }
  const matches = actsByPlaceId.get(placeId);
  if (!matches || matches.length === 0) {
    // Unrecoverable — place no longer referenced by any current activity
    // (or filtered out by --segment)
    if (SEGMENT_FILTER) {
      // With --segment filter, keep other-segment orphans alone (don't delete)
      skippedBySegmentFilter.push(o);
    } else {
      toDelete.push({ orphanId: o.id, placeId, reason: 'no matching activity' });
    }
    continue;
  }
  const primary = pickPrimary(matches);
  reassign.push({
    orphanId: o.id,
    toActivityId: primary.id,
    toActivityName: primary.name,
    toSegmentName: segById.get(primary.segment_id)?.name || '?',
    placeId,
  });
  // Log non-primary activities for this place (they'll miss out on the photo)
  if (matches.length > 1) {
    for (const a of matches) {
      if (a.id === primary.id) continue;
      const key = a.id;
      if (!multiActivityLeftovers.has(key)) {
        multiActivityLeftovers.set(key, {
          name: a.name,
          segmentName: segById.get(a.segment_id)?.name || '?',
          primaryName: primary.name,
          placeId,
          photoCount: 0,
        });
      }
      multiActivityLeftovers.get(key).photoCount++;
    }
  }
}

// ── Preview ──────────────────────────────────────────────────────────────
console.log('Summary:');
console.log('─'.repeat(60));
console.log('  Orphan photos found:          ', orphansAll.length);
if (SEGMENT_FILTER) {
  console.log('  Skipped (other segments):     ', skippedBySegmentFilter.length);
}
console.log('  To re-link (parent_id update):', reassign.length);
console.log('  To delete (unrecoverable):    ', toDelete.length);
console.log('  Unparseable photo refs:       ', unparseable.length);
console.log('─'.repeat(60));

// Per-segment preview of where re-linked photos will land
const landingBySegment = new Map();
for (const r of reassign) {
  const key = r.toSegmentName;
  landingBySegment.set(key, (landingBySegment.get(key) || 0) + 1);
}
console.log('\nRe-linked photos by destination segment:');
for (const s of segs) {
  const n = landingBySegment.get(s.name) || 0;
  if (n > 0) console.log(`  ${String(s.segment_number).padEnd(3)} ${s.name.padEnd(32)} +${n} photos`);
}

// Multi-activity leftover warning
if (multiActivityLeftovers.size > 0) {
  console.log(`\n⚠  ${multiActivityLeftovers.size} activities won't receive photos directly because their`);
  console.log('   Google place_id is shared with another activity (unique constraint on');
  console.log('   (trip_id, file_url) prevents duplicating the row). The shared photos');
  console.log('   will only attach to the first-alphabetical activity for each place.');
  console.log('');
  const sorted = [...multiActivityLeftovers.values()].sort((a, b) => a.segmentName.localeCompare(b.segmentName) || a.name.localeCompare(b.name));
  for (const l of sorted) {
    console.log(`   [${l.segmentName}] "${l.name}" → photos attached to sibling "${l.primaryName}" (${l.photoCount} photos, place ${l.placeId.slice(0, 16)}…)`);
  }
}

if (DRY_RUN) {
  console.log('\n--dry-run set — no writes performed.');
  process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────
console.log('\nApplying...\n');

// 1) Reassign — update parent_id on each orphan row. Must be per-row because
//    the target activity differs per photo.
let reassigned = 0;
let reassignErrors = 0;
for (let i = 0; i < reassign.length; i++) {
  const r = reassign[i];
  const { error } = await sb
    .from('trip_media')
    .update({ parent_id: r.toActivityId })
    .eq('id', r.orphanId);
  if (error) {
    reassignErrors++;
    console.error(`  ✗ update failed on ${r.orphanId} → ${r.toActivityId}: ${error.message}`);
  } else {
    reassigned++;
  }
  if ((i + 1) % 100 === 0) {
    console.log(`  [${i + 1}/${reassign.length}] reassigned`);
  }
}
console.log(`  ✓ reassigned ${reassigned}/${reassign.length}${reassignErrors ? ` (${reassignErrors} errors)` : ''}`);

// 2) Delete unrecoverable orphans in batch
if (toDelete.length > 0) {
  const ids = toDelete.map((d) => d.orphanId);
  console.log(`\nDeleting ${ids.length} unrecoverable orphan rows...`);
  // Delete in chunks of 500 to avoid URL length limits on .in() filter
  const chunkSize = 500;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await sb.from('trip_media').delete().in('id', chunk);
    if (error) {
      console.error(`  ✗ delete chunk failed: ${error.message}`);
      break;
    }
    deleted += chunk.length;
  }
  console.log(`  ✓ deleted ${deleted}/${ids.length}`);
}

// ── Verify ───────────────────────────────────────────────────────────────
console.log('\nVerifying final state...\n');
const { data: finalMedia } = await sb
  .from('trip_media')
  .select('id,parent_id,parent_type')
  .eq('trip_id', TRIP_ID)
  .eq('parent_type', 'activity');

const photosByAct = new Map();
for (const m of finalMedia) photosByAct.set(m.parent_id, (photosByAct.get(m.parent_id) || 0) + 1);

const stillOrphaned = finalMedia.filter((m) => !actById.has(m.parent_id)).length;
console.log(`Activity media rows: ${finalMedia.length} (${stillOrphaned} still orphaned)`);

console.log('\nPhoto counts by segment:');
for (const s of segs) {
  const segActs = acts.filter((a) => a.segment_id === s.id);
  const withPhotos = segActs.filter((a) => (photosByAct.get(a.id) || 0) > 0).length;
  const totalPhotos = segActs.reduce((n, a) => n + (photosByAct.get(a.id) || 0), 0);
  console.log(`  ${String(s.segment_number).padEnd(3)} ${s.name.padEnd(32)} ${String(segActs.length).padStart(3)} acts, ${String(withPhotos).padStart(3)} with photos, ${String(totalPhotos).padStart(4)} total photos`);
}

console.log('\nDone.');
