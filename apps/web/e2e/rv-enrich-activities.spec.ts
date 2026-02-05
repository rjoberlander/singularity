import { test, expect } from '@playwright/test';

/**
 * Test enrichment of activities with Google Place data
 */
test('should enrich activities and fetch grouped photos', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  // Set up response listener before navigating
  const beforeResponsePromise = page.waitForResponse(
    response => response.url().includes(`/rv-locations/${testLocationId}/full`),
    { timeout: 30000 }
  );

  // Navigate to the location
  await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);

  // Get activities before enrichment
  const beforeResponse = await beforeResponsePromise;
  const beforeData = await beforeResponse.json();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const activitiesBefore = beforeData.data?.activities || [];

  console.log('\n=== BEFORE ENRICHMENT ===');
  console.log(`Activities: ${activitiesBefore.length}`);
  for (const a of activitiesBefore) {
    console.log(`  - ${a.name}: google_place_id=${a.google_place_id || 'NULL'}`);
  }

  // Click Enrich button
  const enrichButton = page.locator('button:has-text("Enrich")').first();
  if (await enrichButton.isVisible()) {
    console.log('\nClicking Enrich button...');

    // Listen for enrichment response
    const enrichPromise = page.waitForResponse(
      response => response.url().includes('/enrich') && response.status() === 200,
      { timeout: 180000 } // 3 minute timeout for enrichment
    );

    await enrichButton.click();

    try {
      const enrichResponse = await enrichPromise;
      const enrichData = await enrichResponse.json();
      console.log('\n=== ENRICHMENT RESULT ===');
      console.log(JSON.stringify(enrichData, null, 2));
    } catch (error) {
      console.log('Enrichment timed out or failed');
    }

    // Wait and reload
    await page.waitForTimeout(3000);

    // Get activities after enrichment
    const afterResponsePromise = page.waitForResponse(
      response => response.url().includes(`/rv-locations/${testLocationId}/full`),
      { timeout: 10000 }
    );
    await page.reload();
    const afterResponse = await afterResponsePromise;
    const afterData = await afterResponse.json();

    console.log('\n=== AFTER ENRICHMENT ===');
    const activitiesAfter = afterData.data?.activities || [];
    console.log(`Activities: ${activitiesAfter.length}`);
    for (const a of activitiesAfter) {
      console.log(`  - ${a.name}: google_place_id=${a.google_place_id || 'NULL'}, rating=${a.google_rating || 'NULL'}`);
    }

    // Check photos grouped by activity
    const media = afterData.data?.media || [];
    const photosByActivity: Record<string, { count: number; caption: string | null }> = {};
    for (const photo of media) {
      const key = photo.activity_id || 'campground';
      if (!photosByActivity[key]) {
        photosByActivity[key] = { count: 0, caption: photo.caption };
      }
      photosByActivity[key].count++;
    }

    console.log('\n=== PHOTOS BY ACTIVITY ===');
    for (const [activityId, data] of Object.entries(photosByActivity)) {
      const activityName = activityId === 'campground'
        ? 'Campground'
        : activitiesAfter.find((a: any) => a.id === activityId)?.name || activityId;
      console.log(`  ${activityName}: ${data.count} photos (caption: ${data.caption || 'NULL'})`);
    }

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/rv-after-activity-enrich.png', fullPage: true });
  } else {
    console.log('Enrich button not visible');
  }
});
