#!/usr/bin/env node
/**
 * Fill in remaining photo gaps for the Portugal trip after the orphan
 * recovery pass. Two categories of activity still have no photos:
 *
 *   Category 1 — has google_place_id already set, but zero photos attached.
 *                We use the Places Details API directly (cheaper than a
 *                fresh searchText) to pull the place's photo list, then
 *                download / upload / insert into trip_media.
 *
 *   Category 2 — no google_place_id. We fall back to the searchText flow
 *                to find a matching place first, update the activity with
 *                google_place_id + metadata, then download photos.
 *
 * Smart-skip: for Category 1 activities whose google_place_id is shared
 * with another activity that ALREADY has photos (same place → photos live
 * on a sibling activity row), we skip the API call. The trip-level unique
 * constraint on (trip_id, google_photo_reference) would block a duplicate
 * insert anyway, and the user can see that place's photos via the sibling.
 *
 * Also skips obvious hotel-meal generic activities — these get pinned to
 * the accommodation's place_id during enrichment, and the hotel's photos
 * already live on trip_accommodation media.
 *
 * Usage:
 *   node scripts/fetch-portugal-photo-gaps.mjs --dry-run     # preview
 *   node scripts/fetch-portugal-photo-gaps.mjs               # apply
 *   node scripts/fetch-portugal-photo-gaps.mjs --segment=<id>  # one segment
 *   node scripts/fetch-portugal-photo-gaps.mjs --limit=5     # first 5 only
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: 'apps/api/.env' });

const TRIP_ID = process.argv.find((a) => a.startsWith('--trip='))?.split('=')[1]
  || '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const SEGMENT_FILTER = process.argv.find((a) => a.startsWith('--segment='))?.split('=')[1] || null;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_PHOTOS_PER_ACTIVITY = 20;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing Supabase env'); process.exit(1); }
if (!GOOGLE_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Helpers ──────────────────────────────────────────────────────────────
async function fetchAll(table, cols, extra = {}) {
  const all = [];
  let from = 0;
  while (true) {
    let q = sb.from(table).select(cols).eq('trip_id', TRIP_ID);
    for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
    const { data, error } = await q.range(from, from + 999);
    if (error) { console.error(`fetch ${table} failed:`, error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// Skip heuristics — mirrors schedule-validation.ts
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

function shouldSkipBaseline(a) {
  if (a.activity_type && NON_ENRICHABLE.has(a.activity_type)) return 'non-enrichable-type';
  const lower = (a.name || '').toLowerCase();
  if (SKIP_KW.some((k) => lower.includes(k))) return 'skip-keyword';
  if (TRANSIT.some((p) => p.test(a.name || ''))) return 'transit';
  if (GENERIC_MEAL.test(a.name || '')) {
    const loc = (a.location_name || '').trim();
    if (loc && !HOTEL_LOC.test(loc)) return null;
    return 'generic-meal-at-hotel';
  }
  return null;
}

// ── Load state ───────────────────────────────────────────────────────────
console.log(`\n→ Fetching photo gaps for trip ${TRIP_ID}${DRY_RUN ? ' [DRY-RUN]' : ''}${SEGMENT_FILTER ? ` (segment=${SEGMENT_FILTER})` : ''}${LIMIT ? ` (limit=${LIMIT})` : ''}\n`);

const { data: trip } = await sb.from('trips').select('user_id').eq('id', TRIP_ID).single();
if (!trip) { console.error('Trip not found'); process.exit(1); }
const USER_ID = trip.user_id;

const acts = await fetchAll('trip_activities', 'id,name,activity_type,location_name,day_id,segment_id,google_place_id,latitude,longitude,address,website,phone');
const media = await fetchAll('trip_media', 'id,parent_id,parent_type,file_url,content_hash,google_photo_reference');
const days = await fetchAll('trip_days', 'id,date,segment_id');
const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number,latitude,longitude').eq('trip_id', TRIP_ID).order('segment_number');
const segById = new Map(segs.map((s) => [s.id, s]));
const dayById = new Map(days.map((d) => [d.id, d]));

const photosByAct = new Map();
const actsByPlaceId = new Map();
for (const m of media) {
  if (m.parent_type === 'activity') {
    photosByAct.set(m.parent_id, (photosByAct.get(m.parent_id) || 0) + 1);
  }
}
for (const a of acts) {
  if (a.google_place_id) {
    if (!actsByPlaceId.has(a.google_place_id)) actsByPlaceId.set(a.google_place_id, []);
    actsByPlaceId.get(a.google_place_id).push(a);
  }
}

// Existing photo references & hashes at trip level — to skip redundant inserts early
const existingRefs = new Set(media.map((m) => m.google_photo_reference).filter(Boolean));
const existingHashes = new Set(media.map((m) => m.content_hash).filter(Boolean));
const existingUrls = new Set(media.map((m) => m.file_url).filter(Boolean));

// ── Classify ─────────────────────────────────────────────────────────────
const targets = [];
const skipped = { baseline: [], siblingHasPhotos: [] };

for (const a of acts) {
  if (SEGMENT_FILTER && a.segment_id !== SEGMENT_FILTER) continue;
  if ((photosByAct.get(a.id) || 0) > 0) continue; // already has photos
  const baseSkip = shouldSkipBaseline(a);
  if (baseSkip) { skipped.baseline.push({ a, reason: baseSkip }); continue; }

  // Smart skip: sibling with same place_id already has photos
  if (a.google_place_id) {
    const siblings = (actsByPlaceId.get(a.google_place_id) || []).filter((s) => s.id !== a.id);
    const siblingWithPhotos = siblings.find((s) => (photosByAct.get(s.id) || 0) > 0);
    if (siblingWithPhotos) {
      skipped.siblingHasPhotos.push({ a, siblingName: siblingWithPhotos.name });
      continue;
    }
  }

  targets.push({
    activity: a,
    hasPlaceId: !!a.google_place_id,
    category: a.google_place_id ? 1 : 2,
    segmentName: segById.get(a.segment_id)?.name || '?',
  });
}

// Deterministic order
targets.sort((x, y) => {
  const sx = segById.get(x.activity.segment_id)?.segment_number || 99;
  const sy = segById.get(y.activity.segment_id)?.segment_number || 99;
  if (sx !== sy) return sx - sy;
  return (x.activity.name || '').localeCompare(y.activity.name || '');
});

const work = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;

console.log('Classification:');
console.log(`  Target activities:           ${targets.length}${LIMIT ? ` (processing ${work.length})` : ''}`);
console.log(`    Category 1 (has place_id): ${targets.filter((t) => t.category === 1).length}`);
console.log(`    Category 2 (needs search): ${targets.filter((t) => t.category === 2).length}`);
console.log(`  Skipped — baseline rules:    ${skipped.baseline.length}`);
console.log(`  Skipped — sibling has photos:${skipped.siblingHasPhotos.length}`);

if (skipped.siblingHasPhotos.length) {
  console.log('\nSkipping (sibling activity for the same place already has photos):');
  for (const { a, siblingName } of skipped.siblingHasPhotos) {
    console.log(`  [${segById.get(a.segment_id)?.name?.slice(0, 16) || '?'}] "${a.name}" → "${siblingName}"`);
  }
}

console.log('\nWill fetch for:');
for (const t of work) {
  const a = t.activity;
  console.log(`  [seg ${segById.get(a.segment_id)?.segment_number || '?'}] cat${t.category} ${a.activity_type || '?'} "${a.name}"${a.location_name ? ' @ ' + a.location_name : ''}`);
}

if (DRY_RUN) {
  console.log('\n--dry-run set — no API calls, no writes.');
  process.exit(0);
}

// ── Execute ──────────────────────────────────────────────────────────────
console.log(`\nFetching photos for ${work.length} activities...\n`);

function buildDayCaption(activity) {
  if (!activity.day_id) return '';
  const day = dayById.get(activity.day_id);
  if (!day) return '';
  // day number = index into sorted unique day dates
  const uniqueDates = [...new Set(days.filter((d) => d.date).map((d) => d.date))].sort();
  const dayNumber = uniqueDates.indexOf(day.date) + 1;
  if (dayNumber === 0) return '';
  const dateObj = new Date(day.date + 'T00:00:00Z');
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `Day ${dayNumber} · ${dateStr} | `;
}

async function placeDetails(placeId) {
  const fieldMask = [
    'id', 'displayName', 'rating', 'userRatingCount', 'priceLevel',
    'photos', 'formattedAddress', 'location', 'websiteUri',
    'nationalPhoneNumber', 'editorialSummary',
  ].join(',');
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const resp = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Places Details ${resp.status}: ${text.slice(0, 200)}`);
  }
  return await resp.json();
}

async function placeSearch(textQuery, biasCenter) {
  const fieldMask = [
    'places.id', 'places.displayName', 'places.rating', 'places.userRatingCount',
    'places.priceLevel', 'places.photos', 'places.formattedAddress',
    'places.location', 'places.websiteUri', 'places.nationalPhoneNumber',
    'places.editorialSummary',
  ].join(',');
  const body = { textQuery, maxResultCount: 1 };
  if (biasCenter?.latitude && biasCenter?.longitude) {
    body.locationBias = {
      circle: { center: { latitude: biasCenter.latitude, longitude: biasCenter.longitude }, radius: 50000 },
    };
  }
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Places searchText ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.places?.[0] || null;
}

const stats = { activitiesProcessed: 0, activitiesWithPhotos: 0, photosAdded: 0, photosSkipped: 0, apiCalls: 0, errors: 0 };

for (let i = 0; i < work.length; i++) {
  const t = work[i];
  const a = t.activity;
  const label = `[${i + 1}/${work.length}]`;
  try {
    let place;
    let apiPath;
    if (t.category === 1) {
      place = await placeDetails(a.google_place_id);
      apiPath = 'details';
      stats.apiCalls++;
    } else {
      const query = a.location_name ? `${a.name} ${a.location_name}` : a.name;
      const bias = segById.get(a.segment_id);
      place = await placeSearch(query, bias);
      apiPath = 'search';
      stats.apiCalls++;
      if (!place) {
        console.log(`${label} ✗ no match — "${a.name}"`);
        stats.errors++;
        continue;
      }
      // Update activity with the newly-found place
      const updateFields = {
        google_place_id: place.id,
        google_rating: place.rating,
        google_review_count: place.userRatingCount,
        google_editorial_summary: place.editorialSummary?.text,
        photos_fetched: true,
      };
      if (!a.address && place.formattedAddress) updateFields.address = place.formattedAddress;
      if (!a.latitude && place.location) {
        updateFields.latitude = place.location.latitude;
        updateFields.longitude = place.location.longitude;
      }
      if (!a.website && place.websiteUri) updateFields.website = place.websiteUri;
      if (!a.phone && place.nationalPhoneNumber) updateFields.phone = place.nationalPhoneNumber;
      await sb.from('trip_activities').update(updateFields).eq('id', a.id);
    }

    const photos = place.photos || [];
    if (photos.length === 0) {
      console.log(`${label} ⚠ no photos from Google for "${a.name}" (${apiPath})`);
      stats.activitiesProcessed++;
      continue;
    }

    const dayCaption = buildDayCaption(a);
    let photosAddedForActivity = 0;
    let photosSkippedForActivity = 0;

    for (const photo of photos) {
      if (photosAddedForActivity >= TARGET_PHOTOS_PER_ACTIVITY) break;
      if (existingRefs.has(photo.name)) {
        photosSkippedForActivity++;
        continue;
      }
      try {
        const photoResp = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?key=${GOOGLE_KEY}&maxWidthPx=1600`);
        if (!photoResp.ok) continue;
        const buf = new Uint8Array(await photoResp.arrayBuffer());
        const contentHash = crypto.createHash('sha256').update(buf).digest('hex');
        if (existingHashes.has(contentHash)) { photosSkippedForActivity++; continue; }

        const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
        const storagePath = `travel/${TRIP_ID}/activities/${a.id}/${filename}`;
        const { error: upErr } = await sb.storage.from('singularity-uploads').upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true });
        if (upErr) { console.error(`  upload error: ${upErr.message}`); continue; }
        const { data: urlData } = sb.storage.from('singularity-uploads').getPublicUrl(storagePath);
        if (existingUrls.has(urlData.publicUrl)) { photosSkippedForActivity++; continue; }

        const attribution = photo.authorAttributions?.[0];
        const { error: insErr } = await sb.from('trip_media').insert({
          trip_id: TRIP_ID,
          user_id: USER_ID,
          parent_type: 'activity',
          parent_id: a.id,
          file_url: urlData.publicUrl,
          media_type: 'image',
          width: photo.widthPx,
          height: photo.heightPx,
          caption: `${dayCaption}${a.name}`,
          is_google_sourced: true,
          approved: true,
          google_attribution_name: attribution?.displayName,
          google_attribution_uri: attribution?.uri,
          google_photo_reference: photo.name,
          content_hash: contentHash,
        });
        if (insErr) {
          // 23505 = unique constraint violation — duplicate photo, just skip
          if (insErr.code === '23505') { photosSkippedForActivity++; continue; }
          console.error(`  insert error: ${insErr.message}`);
          continue;
        }
        existingRefs.add(photo.name);
        existingHashes.add(contentHash);
        existingUrls.add(urlData.publicUrl);
        photosAddedForActivity++;
        // small pause to be nice to the photo fetch API
        await new Promise((r) => setTimeout(r, 150));
      } catch (photoErr) {
        console.error(`  photo loop error: ${photoErr.message}`);
      }
    }

    stats.activitiesProcessed++;
    if (photosAddedForActivity > 0) stats.activitiesWithPhotos++;
    stats.photosAdded += photosAddedForActivity;
    stats.photosSkipped += photosSkippedForActivity;
    console.log(`${label} ✓ "${a.name}" → +${photosAddedForActivity} photos (${photosSkippedForActivity} skipped)`);
  } catch (err) {
    stats.errors++;
    console.error(`${label} ✗ "${a.name}": ${err.message}`);
  }
}

console.log('\n─── Summary ───');
console.log('Activities processed:      ', stats.activitiesProcessed);
console.log('Activities w/ new photos:  ', stats.activitiesWithPhotos);
console.log('Photos added:              ', stats.photosAdded);
console.log('Photos skipped (dedup):    ', stats.photosSkipped);
console.log('Google API calls:          ', stats.apiCalls);
console.log('Errors:                    ', stats.errors);

process.exit(0);
