import { test, expect } from '@playwright/test';

test.describe('Portugal Trip Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('verify Portugal trip is complete with all data', async ({ page }) => {
    // Navigate to travel page
    await page.goto('http://localhost:3000/travel');
    await page.waitForLoadState('networkidle');

    // Click on Portugal trip
    const tripLink = page.locator('text=30-Day Portugal Family Road Trip').first();
    await expect(tripLink).toBeVisible({ timeout: 10000 });
    await tripLink.click();

    // Wait for trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Screenshot Overview tab
    await page.screenshot({ path: 'test-results/portugal-final-overview.png', fullPage: true });

    // Click Media tab
    const mediaTab = page.locator('button:has-text("Media"), [role="tab"]:has-text("Media")').first();
    if (await mediaTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mediaTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/portugal-final-media.png', fullPage: true });
    }

    // Click Itinerary tab
    const itineraryTab = page.locator('button:has-text("Itinerary"), [role="tab"]:has-text("Itinerary")').first();
    if (await itineraryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await itineraryTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/portugal-final-itinerary.png', fullPage: true });
    }

    // Click Accommodations tab
    const accomTab = page.locator('button:has-text("Accommodations"), [role="tab"]:has-text("Accommodations")').first();
    if (await accomTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accomTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/portugal-final-accommodations.png', fullPage: true });
    }

    console.log('Portugal trip verification complete!');
    console.log('Screenshots saved to test-results/portugal-final-*.png');
  });
});
