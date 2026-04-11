#!/usr/bin/env node
/**
 * One-off data cleanup for the Portugal Summer 2026 trip
 * (trip id: 2e2ae20a-832b-4e7c-9419-2afdb506b6ab).
 *
 * Fixes three data-quality bugs uncovered on the production browse page:
 *
 *   1. Time AM/PM shift — activities in Alentejo / Sagres / Douro / Porto /
 *      Peneda were imported without AM/PM indicators, so afternoon times
 *      (e.g. "3:00 PM") were stored as "03:00" (3 AM). Shift obviously-
 *      afternoon activities forward by 12 hours.
 *
 *   2. Deep-dive content leak onto transit/logistics/downtime activities —
 *      "Walk to Jerónimos" inherited Tower of Belém's educational blob and
 *      "REST/NAP" inherited Benagil boat-tour content. Strip deep_dive,
 *      kid_engagement, why_its_great from non-POI activities.
 *
 *   3. Hotel-restaurant metadata leak — "Kids to bed", "Wake up",
 *      "Quick breakfast" and "Early dinner" at the Hyatt inherited the
 *      hotel restaurant's Google rating and filter chips. Clear restaurant-
 *      specific fields on any non-restaurant activity that picked them up.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-portugal-trip.mjs
 *   node scripts/fix-portugal-trip.mjs --dry-run   # preview without writing
 *   node scripts/fix-portugal-trip.mjs --trip=<uuid>  # override trip id
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

// ── Classifiers ──────────────────────────────────────────────────────────
// Morning evidence (keep as AM even for ambiguous times):
const MORNING_NAME =
  /\b(wake|breakfast|morning|sunrise|dawn|check.?out|checkout|depart|airport|flight|early|load\s+car|pack)\b/i;
// Strong evening evidence (force PM for any hours < 12):
const STRONG_EVENING_NAME =
  /\b(dinner|supper|sunset|sundown|evening|night|bedtime|golden\s+hour|late\s+(cruise|dinner|lunch|walk))\b/i;
// Afternoon / midday context — only applied to hours 1-7 (afternoon keywords
// like "pool"/"rest"/"lunch" at hours 8-11 are ambiguous; a 9am pool time
// and a 9pm pool time are both plausible, and there's no way to tell which
// was meant, so we leave those alone):
const AFTERNOON_NAME =
  /\b(lunch|afternoon|siesta|nap|rest|rest\/nap|check.?in|check-in|return\s+to|back\s+to\s+hotel)\b/i;
const NON_POI_TYPES = new Set(['transport', 'logistics', 'downtime']);
const RESTAURANT_TYPE = 'restaurant';

const TRANSIT_OR_SLEEP_NAME =
  /^(walk to|drive to|uber|taxi|transfer|rest|nap|rest\/nap|wake up|kids to bed|pool time|park at)\b/i;

/**
 * Given an activity name and its stored start_time, decide whether the time
 * is the result of the import-parser AM/PM bug and return the corrected 24h
 * time. Returns null if no shift should be applied.
 *
 * Rules (applied in order):
 *   1. Already ≥ 12:00 → keep (24h).
 *   2. Strong evening keyword (dinner/sunset/etc.) → shift +12.
 *   3. Morning keyword (breakfast/wake/checkout/…) → keep as AM.
 *   4. Afternoon keyword (lunch/pool/rest/check-in/…):
 *        - hours 1–11 but NOT 11 or 12 → shift +12
 *        - hours 11 (e.g. 11:30 lunch/pool) → keep (plausible late-morning)
 *   5. Hours 1–4 with no morning evidence → shift +12 (implausible 1-4 AM).
 *   6. Hours 5–11 with no evidence → keep (leave alone, let user fix if wrong).
 */
function inferTimeShift(name, startTime) {
  if (!startTime) return null;
  const [h, m] = startTime.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h >= 12) return null;

  const shift = () => `${String(h + 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  // 2. Strong evening keyword always forces PM
  if (STRONG_EVENING_NAME.test(name)) return shift();

  // 3. Morning keyword keeps AM
  if (MORNING_NAME.test(name)) return null;

  // 4. Afternoon keyword — shift only if hours 1–7.
  //    Hours 8–11 with an afternoon keyword are ambiguous (9 AM pool, 11 AM
  //    lunch, 9 PM pool, 11 PM lunch are all plausible) so we leave alone.
  if (AFTERNOON_NAME.test(name) && h >= 1 && h <= 7) return shift();

  // 5. Hours 1–4 with no evidence → PM (1-4 AM is essentially never scheduled)
  if (h >= 1 && h <= 4) return shift();

  // 6. Hours 5–11: not enough evidence → leave alone
  return null;
}

// ── Fetch activities ─────────────────────────────────────────────────────
console.log(`\n→ Loading activities for trip ${TRIP_ID}${DRY_RUN ? ' [DRY-RUN]' : ''}\n`);

const { data: activities, error: fetchError } = await supabase
  .from('trip_activities')
  .select('*')
  .eq('trip_id', TRIP_ID);

if (fetchError) {
  console.error('Failed to fetch activities:', fetchError);
  process.exit(1);
}
console.log(`Loaded ${activities.length} activities`);

// ── Fix 1: time shift ────────────────────────────────────────────────────
const timeFixes = [];
for (const a of activities) {
  const newStart = inferTimeShift(a.name, a.start_time);
  if (newStart && newStart !== a.start_time) {
    timeFixes.push({ id: a.id, name: a.name, from: a.start_time, to: newStart });
  }
}
console.log(`\n[1] Time shifts to apply: ${timeFixes.length}`);
const verbose = process.argv.includes('--verbose');
const previewLen = verbose ? timeFixes.length : 10;
for (const f of timeFixes.slice(0, previewLen)) console.log(`    ${f.from} → ${f.to}  ${f.name}`);
if (timeFixes.length > previewLen) console.log(`    ... and ${timeFixes.length - previewLen} more`);

// ── Fix 2: clear deep_dive + leaked Google location fields on non-POI ───
const LEAKED_LOCATION_HINT = /(cafe|café|restaurante|marina|tour|boat|mercado|museu|palace|palácio|sé\b|galeria)/i;
const deepDiveClears = activities.filter((a) => {
  const isNonPoiType = NON_POI_TYPES.has(a.activity_type);
  const isTransitName = TRANSIT_OR_SLEEP_NAME.test(a.name || '');
  const hasDeepContent = !!(
    a.deep_dive ||
    a.kid_engagement ||
    a.why_its_great ||
    a.historical_context ||
    a.architecture_notes ||
    (Array.isArray(a.what_to_see) && a.what_to_see.length > 0)
  );
  const hasLeakedLocation = isNonPoiType && (
    a.google_place_id != null ||
    (a.latitude != null && a.longitude != null) ||
    (a.location_name && LEAKED_LOCATION_HINT.test(a.location_name)) ||
    a.google_maps_url != null
  );
  return (isNonPoiType || isTransitName) && (hasDeepContent || hasLeakedLocation);
});
console.log(`\n[2] Deep-dive clears on non-POI activities: ${deepDiveClears.length}`);
for (const a of deepDiveClears.slice(0, 10)) console.log(`    [${a.activity_type}] ${a.name}`);
if (deepDiveClears.length > 10) console.log(`    ... and ${deepDiveClears.length - 10} more`);

// ── Fix 3: clear restaurant metadata on non-restaurant activities AND on
// generic-meal activities whose location is the hotel (they inherited the
// hotel's Google Place rating from a mismatched enrichment) ─────────────
const HOTEL_LOCATION_NAME = /\b(hyatt|marriott|hilton|four seasons|ritz|sheraton|westin|w hotel|hotel|accommodation|resort|inn|lodge|pousada)\b/i;
const GENERIC_MEAL_NAME = /^(early|quick|light|big|full|easy|simple|late|fast|hotel|room|family|kids?)(\s+(early|quick|light|big|full|easy|simple|late|fast|hotel|room|family|kids?))?\s*(breakfast|lunch|dinner|supper|brunch)$/i;

const restaurantClears = activities.filter((a) => {
  const hasRestaurantFields =
    a.google_rating != null ||
    a.google_review_count != null ||
    a.outdoor_seating != null ||
    a.good_for_children != null ||
    a.good_for_groups != null ||
    a.serves_vegetarian != null ||
    a.serves_wine != null ||
    a.serves_cocktails != null ||
    a.reservable != null ||
    a.serves_breakfast != null ||
    a.serves_lunch != null ||
    a.serves_dinner != null ||
    a.serves_brunch != null ||
    a.serves_beer != null ||
    a.dine_in != null ||
    a.takeout != null ||
    a.delivery != null ||
    a.live_music != null ||
    a.restaurant_details != null;
  if (!hasRestaurantFields) return false;
  // Non-POI types should never carry restaurant metadata
  if (NON_POI_TYPES.has(a.activity_type)) return true;
  // Restaurant activities with a generic meal name at a hotel location —
  // these inherited the hotel's own Google Place rating, not a real restaurant
  if (a.activity_type === RESTAURANT_TYPE &&
      GENERIC_MEAL_NAME.test(a.name || '') &&
      HOTEL_LOCATION_NAME.test(a.location_name || '')) {
    return true;
  }
  return false;
});
console.log(`\n[3] Restaurant-metadata clears on non-restaurant activities: ${restaurantClears.length}`);
for (const a of restaurantClears.slice(0, 10))
  console.log(`    [${a.activity_type}] ${a.name} (rating=${a.google_rating})`);
if (restaurantClears.length > 10) console.log(`    ... and ${restaurantClears.length - 10} more`);

if (DRY_RUN) {
  console.log('\n--dry-run set — no writes performed.');
  process.exit(0);
}

// ── Apply updates ────────────────────────────────────────────────────────
console.log('\nApplying updates...');

let applied = { time: 0, deep: 0, rest: 0 };

for (const fix of timeFixes) {
  const { error } = await supabase
    .from('trip_activities')
    .update({ start_time: fix.to })
    .eq('id', fix.id);
  if (error) console.error(`  time update failed for ${fix.id}: ${error.message}`);
  else applied.time++;
}

for (const a of deepDiveClears) {
  const updates = {
    deep_dive: null,
    kid_engagement: null,
    why_its_great: null,
    historical_context: null,
    architecture_notes: null,
    what_to_see: null,
  };
  // Transit/downtime activities also inherited the wrong Place's coordinates,
  // address, and map URL during enrichment (e.g. "REST/NAP" pinned to "Lagos
  // Marina, Cafe Passeios de Barco" from a Benagil boat tour match). Clear
  // those Google-derived location fields too. Leave location_name alone — it
  // may have been user-set, even if garbage.
  if (NON_POI_TYPES.has(a.activity_type)) {
    updates.latitude = null;
    updates.longitude = null;
    updates.address = null;
    updates.google_maps_url = null;
    updates.google_place_id = null;
    updates.google_rating = null;
    updates.google_review_count = null;
    updates.google_price_level = null;
    updates.google_editorial_summary = null;
    // Also wipe the garbage location_name when it is clearly a leaked POI
    // (e.g. contains "Cafe" / "Restaurante" / "Tour" / "Marina" while the
    // activity is a downtime/transport action — those are not sleep spots).
    if (
      a.location_name &&
      /(cafe|café|restaurante|marina|tour|boat|praia|praia|mercado|museu|palace|palácio|sé\b|galeria)/i.test(a.location_name)
    ) {
      updates.location_name = null;
    }
  }
  const { error } = await supabase
    .from('trip_activities')
    .update(updates)
    .eq('id', a.id);
  if (error) console.error(`  deep_dive clear failed for ${a.id}: ${error.message}`);
  else applied.deep++;
}

for (const a of restaurantClears) {
  const { error } = await supabase
    .from('trip_activities')
    .update({
      google_rating: null,
      google_review_count: null,
      google_price_level: null,
      google_editorial_summary: null,
      restaurant_details: null,
      outdoor_seating: null,
      good_for_children: null,
      good_for_groups: null,
      serves_vegetarian: null,
      serves_wine: null,
      serves_cocktails: null,
      serves_beer: null,
      serves_breakfast: null,
      serves_lunch: null,
      serves_dinner: null,
      serves_brunch: null,
      dine_in: null,
      takeout: null,
      delivery: null,
      reservable: null,
      live_music: null,
    })
    .eq('id', a.id);
  if (error) console.error(`  restaurant clear failed for ${a.id}: ${error.message}`);
  else applied.rest++;
}

console.log(`\nDone. Applied: time=${applied.time}, deep=${applied.deep}, restaurant=${applied.rest}`);
