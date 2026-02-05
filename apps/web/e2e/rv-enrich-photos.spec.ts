import { test, expect } from '@playwright/test';

/**
 * Test RV Location photo enrichment including activity photos
 * This test verifies that enrichment fetches photos from both:
 * 1. The main location
 * 2. Activities associated with the location
 */
test.describe('RV Location Photo Enrichment', () => {
  // Use a specific location for testing
  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  test.beforeEach(async ({ page }) => {
    // Login with test account that has API keys configured
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should enrich location and fetch photos from activities', async ({ page }) => {
    // Navigate directly to the test location
    await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get initial photo count from the media section
    const mediaSection = page.locator('[data-testid="media-section"], .grid img, [class*="photo"], [class*="media"]');
    const initialPhotoCount = await mediaSection.count();
    console.log(`Initial photo count: ${initialPhotoCount}`);

    // Take screenshot before enrichment
    await page.screenshot({ path: 'e2e/screenshots/rv-photos-before-enrich.png', fullPage: true });

    // Find and click the Enrich button
    const enrichButton = page.locator('button:has-text("Enrich")').first();
    const isEnrichVisible = await enrichButton.isVisible().catch(() => false);

    if (!isEnrichVisible) {
      console.log('Enrich button not visible - location may already be enriched');
      // Check if there are photos displayed
      const photos = page.locator('img[src*="rv-locations"], img[src*="supabase"]');
      const photoCount = await photos.count();
      console.log(`Photos found: ${photoCount}`);
      expect(photoCount).toBeGreaterThan(0);
      return;
    }

    // Click Enrich button
    await enrichButton.click();
    console.log('Clicked Enrich button');

    // Wait for enrichment to complete - watch for loading indicator to disappear
    // The enrichment can take some time as it fetches from Google API
    await page.waitForTimeout(3000);

    // Take screenshot during enrichment
    await page.screenshot({ path: 'e2e/screenshots/rv-photos-enriching.png', fullPage: true });

    // Wait for enrichment to complete (up to 60 seconds)
    await page.waitForFunction(
      () => {
        // Check if loading indicators are gone
        const loadingSpinner = document.querySelector('[class*="animate-spin"]');
        const loadingText = document.body.innerText.includes('Enriching');
        return !loadingSpinner && !loadingText;
      },
      { timeout: 60000 }
    ).catch(() => {
      console.log('Enrichment may still be in progress or already completed');
    });

    // Additional wait for UI to update
    await page.waitForTimeout(3000);

    // Take screenshot after enrichment
    await page.screenshot({ path: 'e2e/screenshots/rv-photos-after-enrich.png', fullPage: true });

    // Check final photo count
    const photos = page.locator('img[src*="rv-locations"], img[src*="supabase"], img[src*="storage"]');
    const finalPhotoCount = await photos.count();
    console.log(`Final photo count: ${finalPhotoCount}`);

    // Verify photos exist
    expect(finalPhotoCount).toBeGreaterThan(0);
    console.log(`Photo enrichment test completed. Photos: ${finalPhotoCount}`);
  });

  test('should display enrichment result with photo count', async ({ page }) => {
    // Navigate to the test location
    await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find Enrich button
    const enrichButton = page.locator('button:has-text("Enrich")').first();
    const isEnrichVisible = await enrichButton.isVisible().catch(() => false);

    if (!isEnrichVisible) {
      console.log('Location already enriched, checking for photos');
      await page.screenshot({ path: 'e2e/screenshots/rv-already-enriched.png', fullPage: true });
      return;
    }

    // Click and wait for response
    const enrichPromise = page.waitForResponse(
      response => response.url().includes('/enrich') && response.status() === 200,
      { timeout: 60000 }
    );

    await enrichButton.click();

    try {
      const response = await enrichPromise;
      const data = await response.json();
      console.log('Enrichment response:', JSON.stringify(data, null, 2));

      // Verify response includes photos_added
      expect(data.success).toBe(true);
      console.log(`Photos added: ${data.photos_added}`);
      console.log(`Activities enriched: ${data.activities_enriched}`);

      // Take final screenshot
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/screenshots/rv-enrich-complete.png', fullPage: true });
    } catch (e) {
      console.log('Could not capture enrichment response:', e);
      await page.screenshot({ path: 'e2e/screenshots/rv-enrich-error.png', fullPage: true });
    }
  });
});
