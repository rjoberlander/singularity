import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002/api/v1';
const AIRBNB_URL = 'https://www.airbnb.com/rooms/923011954010540033';
const SAGRES_SEGMENT_ID = '4f5d2d2f-c4d2-4427-95f4-1e5facc954da';

test('save Airbnb URL for Lagos, enrich, and verify', async ({ page }) => {
  test.setTimeout(180000);

  // Get auth token
  const loginResp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rjoberlander@gmail.com', password: 'Cookie123!' }),
  });
  const authToken = (await loginResp.json()).data?.session?.access_token;
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // === STEP 1: Find Sagres accommodation ID ===
  let fullResp = await fetch(`${API_URL}/travel/trips/${TRIP_ID}/full`, { headers });
  let fullData = await fullResp.json();
  const sagresAcc = fullData.data.accommodations.find(
    (a: any) => a.segment_id === SAGRES_SEGMENT_ID
  );
  expect(sagresAcc).toBeTruthy();
  console.log(`Found Sagres accommodation: id=${sagresAcc.id}, name=${sagresAcc.name}`);
  console.log(`  Current website: ${sagresAcc.website}`);
  console.log(`  Current enriched_at: ${sagresAcc.enriched_at}`);

  // === STEP 2: Save the Airbnb URL via API ===
  console.log(`\n=== Saving Airbnb URL ===`);
  const saveResp = await fetch(
    `${API_URL}/travel/trips/${TRIP_ID}/accommodations/${sagresAcc.id}`,
    { method: 'PUT', headers, body: JSON.stringify({ website: AIRBNB_URL }) }
  );
  expect(saveResp.ok, `Save URL failed: ${saveResp.status}`).toBeTruthy();
  console.log(`PASS: URL saved (${saveResp.status})`);

  // === STEP 3: Verify on plan page UI ===
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Scroll to accommodations and verify URL shows
  const accHeading = page.locator('h3:has-text("Accommodations")').first();
  await accHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  const html = await page.content();
  // The URL should now show as an "Airbnb" badge with external link (green, not red +)
  expect(html).toContain('airbnb.com');
  console.log('PASS: Airbnb URL visible on plan page');
  await page.screenshot({ path: 'apps/web/e2e/screenshots/airbnb-url-saved.png', fullPage: false });

  // === STEP 4: Enrich via Google Places ===
  console.log(`\n=== Fetching Google Places data ===`);
  const googleResp = await fetch(
    `${API_URL}/travel/trips/${TRIP_ID}/accommodations/${sagresAcc.id}/fetch-google`,
    { method: 'POST', headers }
  );
  const googleData = await googleResp.json();
  console.log(`Google fetch status: ${googleResp.status}`);
  if (googleData.data) {
    console.log(`  google_place_id: ${googleData.data.google_place_id || googleData.data.data?.google_place_id}`);
    console.log(`  photos_added: ${googleData.data.photos_added}`);
    console.log(`  message: ${googleData.data.message}`);
  } else {
    console.log(`  response: ${JSON.stringify(googleData).substring(0, 500)}`);
  }

  // === STEP 5: Enrich via AI (Perplexity + Claude) ===
  console.log(`\n=== AI Enrichment (Perplexity + Claude) ===`);
  const aiResp = await fetch(
    `${API_URL}/travel/trips/${TRIP_ID}/accommodations/${sagresAcc.id}/enrich-ai`,
    { method: 'POST', headers }
  );
  const aiData = await aiResp.json();
  console.log(`AI enrich status: ${aiResp.status}`);
  if (aiData.data) {
    console.log(`  fields_updated: ${aiData.data.fields_updated}`);
    console.log(`  source: ${aiData.data.source}`);
    const e = aiData.data.enrichment || {};
    console.log(`  property_type: ${e.property_type}`);
    console.log(`  pool: ${JSON.stringify(e.amenities_structured?.pool)}`);
    console.log(`  restaurant_on_site: ${e.amenities_structured?.restaurant_on_site}`);
    console.log(`  kitchen: ${JSON.stringify(e.amenities_structured?.kitchen)}`);
    console.log(`  parking: ${JSON.stringify(e.parking)}`);
    console.log(`  breakfast: ${JSON.stringify(e.breakfast)}`);
    console.log(`  neighborhood: ${e.neighborhood}`);
  } else {
    console.log(`  response: ${JSON.stringify(aiData).substring(0, 500)}`);
  }

  // === STEP 6: Verify final DB state ===
  console.log(`\n=== FINAL DB VERIFICATION ===`);
  fullResp = await fetch(`${API_URL}/travel/trips/${TRIP_ID}/full`, { headers });
  fullData = await fullResp.json();
  const enriched = fullData.data.accommodations.find(
    (a: any) => a.segment_id === SAGRES_SEGMENT_ID
  );

  console.log(`name: ${enriched.name}`);
  console.log(`address: ${enriched.address}`);
  console.log(`website: ${enriched.website}`);
  console.log(`google_place_id: ${enriched.google_place_id}`);
  console.log(`google_rating: ${enriched.google_rating}`);
  console.log(`google_review_count: ${enriched.google_review_count}`);
  console.log(`photos_fetched: ${enriched.photos_fetched}`);
  console.log(`enriched_at: ${enriched.enriched_at}`);
  console.log(`enrichment_source: ${enriched.enrichment_source}`);
  console.log(`property_type: ${enriched.property_type}`);
  console.log(`star_rating: ${enriched.star_rating}`);
  console.log(`parking: ${JSON.stringify(enriched.parking)}`);
  console.log(`breakfast: ${JSON.stringify(enriched.breakfast)}`);
  console.log(`neighborhood: ${enriched.neighborhood}`);

  const am = enriched.amenities_structured;
  if (am) {
    console.log(`\nAMENITIES:`);
    console.log(`  pool: ${JSON.stringify(am.pool)}`);
    console.log(`  restaurant_on_site: ${am.restaurant_on_site}`);
    console.log(`  bar: ${am.bar}`);
    console.log(`  kitchen: ${JSON.stringify(am.kitchen)}`);
    console.log(`  wifi: ${am.wifi}`);
    console.log(`  air_conditioning: ${am.air_conditioning}`);
    console.log(`  gym: ${am.gym}`);
    console.log(`  laundry: ${am.laundry}`);
    console.log(`  pet_friendly: ${am.pet_friendly}`);
  }

  if (enriched.nearby_landmarks?.length) {
    console.log(`\nNEARBY LANDMARKS:`);
    for (const lm of enriched.nearby_landmarks) {
      console.log(`  ${lm.name} — ${lm.distance || '?'} (${lm.walk_minutes || '?'}min walk)`);
    }
  }

  // Count photos
  const accPhotos = fullData.data.media.filter(
    (m: any) => m.parent_type === 'accommodation' && m.parent_id === enriched.id
  );
  console.log(`\nPHOTOS: ${accPhotos.length}`);

  // Final assertions
  expect(enriched.website).toContain('923011954010540033');
  expect(enriched.enriched_at, 'Should be enriched').toBeTruthy();
  expect(enriched.address, 'Should have address').toBeTruthy();
  console.log('\nPASS: All checks passed');

  // === STEP 7: Verify on lodging page UI ===
  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/lodging`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'apps/web/e2e/screenshots/airbnb-enriched-lodging.png', fullPage: true });
});
