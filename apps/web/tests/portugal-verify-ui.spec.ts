import { test, expect } from '@playwright/test';

test.describe('Portugal Trip UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('verify Portugal trip overview with segments and photos', async ({ page }) => {
    // Navigate directly to the Portugal trip overview
    const tripId = '814c38ad-c6d4-4811-acbf-6db049e3ede1';

    await page.goto(`http://localhost:3000/travel/${tripId}/overview`);
    await page.waitForLoadState('networkidle');

    // Wait for segments to appear
    await page.waitForSelector('text=Lisbon', { timeout: 10000 });

    // Wait a bit more for images to load
    await page.waitForTimeout(2000);

    // Screenshot the overview with segments
    await page.screenshot({
      path: 'test-results/portugal-overview-segments.png',
      fullPage: true
    });

    // Verify segment cards are visible
    await expect(page.locator('text=Lisbon').first()).toBeVisible();
    await expect(page.locator('text=Cascais & Sintra').first()).toBeVisible();
    await expect(page.locator('text=Lagos & Sagres').first()).toBeVisible();

    // Expand the first segment to see days
    const expandButton = page.locator('button:has-text("Daily Itinerary")').first();
    if (await expandButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'test-results/portugal-overview-expanded.png',
        fullPage: true
      });
    }

    // Navigate to itinerary tab
    await page.goto(`http://localhost:3000/travel/${tripId}/itinerary`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'test-results/portugal-itinerary-table.png',
      fullPage: true
    });

    console.log('Screenshots saved to test-results/');
  });
});
