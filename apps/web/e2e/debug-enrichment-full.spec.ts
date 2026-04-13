import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('comprehensive enrichment display audit', async ({ page }) => {
  test.setTimeout(60000);

  // Intercept API
  let apiData: any = null;
  await page.route('**/travel/trips/*/full', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    apiData = json.data;
    await route.fulfill({ response });
  });

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForSelector('text=Enrichment status', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Scroll to enrichment section and screenshot
  await page.locator('text=Enrichment status').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'apps/web/e2e/screenshots/enrichment-audit.png', fullPage: false });

  // === BUG HUNT ===
  const activities = apiData.activities || [];
  const media = apiData.media || [];
  const segments = apiData.segments || [];

  // 1. Check: activitiesByDate includes backup activities (inflating day circles)
  const backups = activities.filter((a: any) => a.is_backup);
  const backupsWithGoogle = backups.filter((a: any) => a.google_place_id);
  console.log(`\n=== BUG CHECK: Backup activities in day enrichment ===`);
  console.log(`Total backups: ${backups.length}, with google_place_id: ${backupsWithGoogle.length}`);
  console.log(`These backups inflate day-level enrichment circles!`);

  // 2. Check: hasGoogleData uses OR - activities "enriched" with only partial data
  const enrichableTypes = new Set(['activity','dining','snack','coffee','sightseeing','attraction',
    'restaurant','cafe','museum','hike','beach','shopping']);
  const nonBackup = activities.filter((a: any) => !a.is_backup);
  const enrichable = nonBackup.filter((a: any) => enrichableTypes.has(a.activity_type || ''));

  console.log(`\n=== BUG CHECK: hasGoogleData OR logic ===`);
  let hasOnlyRating = 0, hasOnlyHours = 0, hasOnlyPhotosFetched = 0, hasAll = 0;
  for (const a of enrichable) {
    if (!a.google_place_id) continue;
    const r = a.google_rating !== undefined && a.google_rating !== null;
    const h = a.opening_hours !== undefined && a.opening_hours !== null;
    const p = a.photos_fetched === true;
    if (r && h && p) hasAll++;
    else if (r && !h && !p) hasOnlyRating++;
    else if (!r && h && !p) hasOnlyHours++;
    else if (!r && !h && p) hasOnlyPhotosFetched++;
  }
  console.log(`Activities with ALL 3 (rating+hours+photos): ${hasAll}`);
  console.log(`Activities with ONLY rating: ${hasOnlyRating}`);
  console.log(`Activities with ONLY hours: ${hasOnlyHours}`);
  console.log(`Activities with ONLY photos_fetched: ${hasOnlyPhotosFetched}`);

  // 3. Check: photos_fetched=true but 0 actual photos
  const mediaByActivity = new Map<string, number>();
  for (const m of media) {
    if (m.parent_type === 'activity') {
      mediaByActivity.set(m.parent_id, (mediaByActivity.get(m.parent_id) || 0) + 1);
    }
  }

  console.log(`\n=== BUG CHECK: photos_fetched=true but 0 photos in DB ===`);
  let photosFetchedNoPhotos = 0;
  for (const a of enrichable) {
    if (a.photos_fetched === true && (mediaByActivity.get(a.id) || 0) === 0) {
      photosFetchedNoPhotos++;
      console.log(`  ${a.name} (${a.activity_type}): photos_fetched=true but 0 photos`);
    }
  }
  console.log(`Total: ${photosFetchedNoPhotos} activities say photos_fetched but have 0 photos`);

  // 4. Check: photosExpected = placesTotal * 10 vs reality
  console.log(`\n=== BUG CHECK: Expected photos (places*10) vs max possible ===`);
  for (const seg of segments.sort((a: any, b: any) => a.sort_order - b.sort_order)) {
    const segActs = nonBackup.filter((a: any) => a.segment_id === seg.id);
    const segEnrichable = segActs.filter((a: any) => enrichableTypes.has(a.activity_type || ''));
    let actualPhotos = 0;
    let actsWithPhotos = 0;
    let actsWithoutPhotos = 0;
    for (const a of segEnrichable) {
      const pc = mediaByActivity.get(a.id) || 0;
      actualPhotos += pc;
      if (pc > 0) actsWithPhotos++;
      else actsWithoutPhotos++;
    }
    const expected = segEnrichable.length * 10;
    console.log(`  ${seg.name}: ${actsWithPhotos} with photos, ${actsWithoutPhotos} without | ${actualPhotos}/${expected} photos`);
  }

  // 5. Check which days show as "complete" but shouldn't
  console.log(`\n=== BUG CHECK: Day circles showing complete incorrectly ===`);
  // Get day circle elements
  const dayCircles = await page.locator('[class*="rounded-sm"][class*="w-4"]').all();
  console.log(`Found ${dayCircles.length} day circle elements`);
});
