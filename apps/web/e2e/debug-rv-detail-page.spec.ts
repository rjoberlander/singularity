import { test, expect } from '@playwright/test';

test.describe('RV Location Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel|rv-locations)/);
  });

  test('should load RV location detail page successfully', async ({ page }) => {
    // Navigate to the specific RV location
    await page.goto('http://localhost:3000/rv-locations/64c22c93-c9ab-43a9-a498-6c883de25962');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that back button exists (indicates page structure loaded)
    const backButton = page.locator('a[href="/rv-locations"]').first();
    await expect(backButton).toBeVisible({ timeout: 10000 });

    // Check for "Location not found" - should NOT be visible
    const notFoundMessage = page.locator('text=Location not found');
    const hasNotFound = await notFoundMessage.isVisible().catch(() => false);
    expect(hasNotFound).toBe(false);

    // Verify the location name is visible (h1 with the name)
    const locationTitle = page.locator('h1').first();
    await expect(locationTitle).toBeVisible();
    const titleText = await locationTitle.textContent();
    expect(titleText).toBeTruthy();
    console.log('Location title:', titleText);

    // Verify the Enrich button exists
    const enrichButton = page.locator('button:has-text("Enrich")');
    await expect(enrichButton).toBeVisible();

    // Verify Edit button exists
    const editButton = page.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'apps/web/e2e/screenshots/rv-detail-page-success.png', fullPage: true });
  });
});
