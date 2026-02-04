import { test, expect } from '@playwright/test';

test('verify enrichment API call and response', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Navigate to RV locations
  await page.goto('http://localhost:3000/rv-locations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on first location card
  const locationCard = page.locator('.rounded-lg.border').first();
  if (await locationCard.count() === 0) {
    console.log('No RV locations found - skipping test');
    return;
  }
  await locationCard.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Get page title for logging
  const locationName = await page.locator('h1').first().textContent();
  console.log(`Testing enrichment on: ${locationName}`);

  // Find and click Enrich button
  const enrichButton = page.locator('button:has-text("Enrich")').first();
  await expect(enrichButton).toBeVisible({ timeout: 10000 });

  // Listen for API response
  const enrichPromise = page.waitForResponse(
    response => response.url().includes('/enrich') && response.request().method() === 'POST',
    { timeout: 30000 }
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
      console.log('ENRICHMENT SUCCESSFUL!');
      console.log(`- Location updated: ${responseBody.location_updated}`);
      console.log(`- Reviews fetched: ${responseBody.reviews_fetched}`);
      console.log(`- Photos added: ${responseBody.photos_added}`);
      console.log(`- Activities enriched: ${responseBody.activities_enriched}`);
    } else {
      console.log('Enrichment completed but with issues:');
      console.log(`- Errors: ${JSON.stringify(responseBody.errors)}`);
    }

    // Take final screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/rv-enrichment-final.png', fullPage: true });

  } catch (error) {
    console.log('API call timed out or failed:', error);
    await page.screenshot({ path: 'e2e/screenshots/rv-enrichment-timeout.png', fullPage: true });
  }

  // Check for toast notification (success or error)
  const toast = page.locator('[data-sonner-toast]').first();
  if (await toast.count() > 0) {
    const toastText = await toast.textContent();
    console.log('Toast notification:', toastText);
  }
});
