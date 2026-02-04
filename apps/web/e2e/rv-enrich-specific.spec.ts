import { test, expect } from '@playwright/test';

test('enrich specific RV location', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Navigate directly to the specific location
  await page.goto('http://localhost:3000/rv-locations/64c22c93-c9ab-43a9-a498-6c883de25962');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Get page title for logging
  const locationName = await page.locator('h1').first().textContent();
  console.log(`Testing enrichment on: ${locationName}`);

  // Take screenshot before
  await page.screenshot({ path: 'e2e/screenshots/rv-enrich-before.png', fullPage: true });

  // Find and click Enrich button
  const enrichButton = page.locator('button:has-text("Enrich")').first();
  await expect(enrichButton).toBeVisible({ timeout: 10000 });

  // Listen for API response
  const enrichPromise = page.waitForResponse(
    response => response.url().includes('/enrich') && response.request().method() === 'POST',
    { timeout: 60000 }
  );

  // Click Enrich
  await enrichButton.click();
  console.log('Clicked Enrich button, waiting for API response...');

  // Wait for API response
  try {
    const response = await enrichPromise;
    const responseBody = await response.json();

    console.log('API Response status:', response.status());
    console.log('API Response body:', JSON.stringify(responseBody, null, 2));

    // Check if enrichment was successful
    if (responseBody.success) {
      console.log('=== ENRICHMENT SUCCESSFUL! ===');
      console.log(`- Location updated: ${responseBody.location_updated}`);
      console.log(`- Reviews fetched: ${responseBody.reviews_fetched}`);
      console.log(`- Photos added: ${responseBody.photos_added}`);
      console.log(`- Activities enriched: ${responseBody.activities_enriched}`);
    } else {
      console.log('=== ENRICHMENT FAILED ===');
      console.log(`- Errors: ${JSON.stringify(responseBody.errors)}`);
    }

  } catch (error) {
    console.log('API call timed out or failed:', error);
  }

  // Wait for UI to update
  await page.waitForTimeout(3000);

  // Take screenshot after
  await page.screenshot({ path: 'e2e/screenshots/rv-enrich-after.png', fullPage: true });

  // Check for toast notification
  const toast = page.locator('[data-sonner-toast]').first();
  if (await toast.count() > 0) {
    const toastText = await toast.textContent();
    console.log('Toast notification:', toastText);
  }

  // Check if reviews section now has content
  const reviewsSummary = page.locator('text=What people love');
  if (await reviewsSummary.count() > 0) {
    console.log('Reviews summary section is now populated!');
  }
});
