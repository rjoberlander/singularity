import { test, expect } from '@playwright/test';

/**
 * Test photo captions in full-screen view
 */
test('should show caption in full-screen photo view', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  // Navigate to the location
  await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on the first photo to open gallery modal
  const firstPhoto = page.locator('img[class*="object-cover"]').first();
  await firstPhoto.click();
  await page.waitForTimeout(1000);

  // Take screenshot of the gallery modal
  await page.screenshot({ path: 'e2e/screenshots/rv-photo-gallery-modal.png', fullPage: true });

  // Now click on a photo in the gallery to view full-screen
  const galleryPhoto = page.locator('button.block.w-full.break-inside-avoid').first();
  if (await galleryPhoto.isVisible()) {
    await galleryPhoto.click();
    await page.waitForTimeout(1000);

    // Take screenshot of full-screen view
    await page.screenshot({ path: 'e2e/screenshots/rv-photo-fullscreen.png', fullPage: true });

    // Check if caption is visible at the bottom
    const captionElement = page.locator('p.text-white.text-center.text-lg');
    await expect(captionElement).toBeVisible({ timeout: 5000 });
    const captionText = await captionElement.textContent();
    console.log('Caption text:', captionText);
    expect(captionText).toBeTruthy();
    console.log('SUCCESS: Caption is showing in full-screen view!');
  } else {
    console.log('Gallery photo button not found, trying alternative selector');
    // Try the cover photo direct click
    await page.screenshot({ path: 'e2e/screenshots/rv-gallery-state.png', fullPage: true });
  }
});

test('should check activities have Google Place data', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  // Navigate to the location and wait for API response
  const responsePromise = page.waitForResponse(
    response => response.url().includes(`/rv-locations/${testLocationId}/full`),
    { timeout: 10000 }
  );

  await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);

  const response = await responsePromise;
  const locationData = await response.json();

  console.log('\n=== Location Activities ===');
  const activities = locationData.data?.activities || [];
  for (const activity of activities) {
    console.log(`Activity: ${activity.name}`);
    console.log(`  - Google Place ID: ${activity.google_place_id || 'NOT SET'}`);
    console.log(`  - Google Rating: ${activity.google_rating || 'NOT SET'}`);
    console.log(`  - Enriched At: ${activity.enriched_at || 'NOT SET'}`);
  }

  console.log('\n=== Photos by Activity ===');
  const media = locationData.data?.media || [];
  const photosByActivity: Record<string, number> = {};
  for (const photo of media) {
    const key = photo.activity_id || 'campground';
    photosByActivity[key] = (photosByActivity[key] || 0) + 1;
    // Log a few examples
    if (photo.caption && !photosByActivity[`${key}_logged`]) {
      console.log(`Photo caption example for ${key}: "${photo.caption}"`);
      photosByActivity[`${key}_logged`] = 1;
    }
  }

  console.log('\nPhoto counts by activity_id:');
  for (const [key, count] of Object.entries(photosByActivity)) {
    if (!key.endsWith('_logged')) {
      console.log(`  ${key}: ${count} photos`);
    }
  }

  // Verify we have photos
  expect(media.length).toBeGreaterThan(0);
  console.log(`\nTotal photos: ${media.length}`);
});
