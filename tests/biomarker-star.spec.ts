import { test, expect } from '@playwright/test';

test.describe('Biomarker Star Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('can star and unstar a biomarker from the card', async ({ page }) => {
    // Navigate to biomarkers page
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');

    // Wait for biomarker heading to appear (e.g., "ALT (SGPT)")
    await page.waitForSelector('h3:has-text("ALT")', { timeout: 10000 });

    // Find the first biomarker card - look for the card that contains ALT
    const firstCard = page.locator('h3:has-text("ALT")').first().locator('..').locator('..');

    // Find the star button WITHIN this card (not the filter star button)
    // The star is in the same row as the biomarker name
    const cardStarButton = firstCard.locator('button:has(svg[class*="lucide-star"])');

    const count = await cardStarButton.count();
    console.log(`Found ${count} star buttons in the first card`);

    await expect(cardStarButton).toBeVisible();

    // Get initial state
    const starIcon = cardStarButton.locator('svg');
    const initialClass = await starIcon.getAttribute('class') || '';
    const wasStarred = initialClass.includes('fill-yellow');
    console.log(`Initial starred state: ${wasStarred}, class: ${initialClass}`);

    // Listen for network requests
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/biomarkers/stars'),
      { timeout: 5000 }
    ).catch(() => null);

    // Click to toggle star
    await cardStarButton.click();

    // Wait for API response
    const response = await apiPromise;
    if (response) {
      const status = response.status();
      console.log(`API response status: ${status}`);
      const body = await response.json().catch(() => null);
      console.log(`API response body:`, JSON.stringify(body, null, 2));
    } else {
      console.log('No API response captured - this indicates the click did not trigger an API call');
    }

    await page.waitForTimeout(1500);

    // Verify the star state changed
    const newClass = await starIcon.getAttribute('class') || '';
    console.log(`New class after click: ${newClass}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/after-star-toggle.png' });

    if (wasStarred) {
      expect(newClass).not.toContain('fill-yellow');
    } else {
      expect(newClass).toContain('fill-yellow');
    }

    console.log('Star toggle test passed!');
  });
});
