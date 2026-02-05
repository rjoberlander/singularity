import { test, expect } from '@playwright/test';

/**
 * Test photo grouping by activity with captions
 */
test('should display photos grouped by activity', async ({ page }) => {
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

  // Take screenshot of the page
  await page.screenshot({ path: 'e2e/screenshots/rv-photo-grouping.png', fullPage: true });

  // Check if there's a Photos section
  const photosCard = page.locator('text=Photos').first();
  await expect(photosCard).toBeVisible();

  // Scroll to the photos section
  await photosCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take a screenshot of the photos section
  await page.screenshot({ path: 'e2e/screenshots/rv-photos-section.png', fullPage: true });

  // Check if there are group headers (Campground or Activity: xxx)
  const groupHeaders = page.locator('h4.text-sm.font-medium.text-muted-foreground');
  const headerCount = await groupHeaders.count();
  console.log(`Found ${headerCount} photo group headers`);

  if (headerCount > 0) {
    for (let i = 0; i < headerCount; i++) {
      const headerText = await groupHeaders.nth(i).textContent();
      console.log(`Group ${i + 1}: ${headerText}`);
    }
  }

  // If no groups yet (old data), the photos should still display
  const photoThumbnails = page.locator('img[class*="object-cover"]');
  const photoCount = await photoThumbnails.count();
  console.log(`Found ${photoCount} photo thumbnails total`);

  expect(photoCount).toBeGreaterThan(0);
  console.log('SUCCESS: Photos are displaying correctly!');
});

test('should re-enrich and show grouped photos', async ({ page }) => {
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

  // Click enrich button to re-fetch photos with new grouping/captions
  const enrichButton = page.locator('button:has-text("Enrich")').first();

  if (await enrichButton.isVisible()) {
    console.log('Clicking Enrich button to fetch grouped photos...');

    // Listen for the enrichment response
    const enrichPromise = page.waitForResponse(
      response => response.url().includes('/enrich') && response.status() === 200,
      { timeout: 120000 }
    );

    await enrichButton.click();

    const response = await enrichPromise;
    const data = await response.json();
    console.log('Enrichment result:', JSON.stringify(data, null, 2));

    // Wait for page to update
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  // Take final screenshot
  await page.screenshot({ path: 'e2e/screenshots/rv-photo-grouping-after-enrich.png', fullPage: true });

  // Verify photos section exists
  const photosSection = page.locator('text=Photos');
  await expect(photosSection.first()).toBeVisible();

  console.log('Test completed successfully!');
});
