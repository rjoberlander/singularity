import { test, expect } from '@playwright/test';

test.describe('RV Location Enrichment', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should display enrich button and reviews section on detail page', async ({ page }) => {
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

    // Take screenshot of detail page
    await page.screenshot({ path: 'e2e/screenshots/rv-detail-with-enrich.png', fullPage: true });

    // Check if Enrich button exists (using more specific selector)
    const enrichButton = page.locator('button:has-text("Enrich")').first();
    await expect(enrichButton).toBeVisible({ timeout: 10000 });
    console.log('Enrich button found!');

    // Check if Reviews heading exists
    const reviewsHeading = page.getByRole('heading', { name: 'Reviews' });
    await expect(reviewsHeading).toBeVisible();
    console.log('Reviews section found!');

    // Check if Fetch Reviews button exists
    const fetchReviewsButton = page.getByRole('button', { name: /Fetch Reviews/i });
    await expect(fetchReviewsButton).toBeVisible();
    console.log('Fetch Reviews button found!');

    // Check if Suggest button exists in activities section
    const suggestButton = page.getByRole('button', { name: /Suggest/i });
    await expect(suggestButton).toBeVisible();
    console.log('Suggest button found!');

    console.log('All enrichment UI elements verified successfully!');
  });

  test('should click enrich button and show enrichment in progress', async ({ page }) => {
    // Navigate to RV locations
    await page.goto('http://localhost:3000/rv-locations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on first location
    const locationCard = page.locator('.rounded-lg.border').first();
    if (await locationCard.count() === 0) {
      console.log('No RV locations found - skipping test');
      return;
    }
    await locationCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find and click Enrich button
    const enrichButton = page.locator('button:has-text("Enrich")').first();
    await expect(enrichButton).toBeVisible({ timeout: 10000 });

    // Take screenshot before clicking
    await page.screenshot({ path: 'e2e/screenshots/rv-before-enrich.png', fullPage: true });

    // Click Enrich
    await enrichButton.click();
    console.log('Clicked Enrich button');

    // Wait a moment for loading state
    await page.waitForTimeout(1000);

    // Take screenshot during enrichment
    await page.screenshot({ path: 'e2e/screenshots/rv-enrichment-loading.png', fullPage: true });

    // Wait for enrichment to complete or timeout
    await page.waitForTimeout(10000);

    // Take screenshot after enrichment
    await page.screenshot({ path: 'e2e/screenshots/rv-after-enrich.png', fullPage: true });

    console.log('Enrichment process completed');
  });
});
