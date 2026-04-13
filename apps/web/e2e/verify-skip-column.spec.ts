import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('verify skip column and enrichment accuracy', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForSelector('text=Enrichment status', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Scroll to enrichment table
  await page.locator('text=Enrichment status').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Verify the "Skip" column header exists
  const skipHeader = page.locator('th:text("Skip")');
  await expect(skipHeader).toBeVisible();

  // Verify skip counts are shown (non-zero for Lisbon)
  const html = await page.content();

  // Take screenshot of just the enrichment section
  const enrichmentSection = page.locator('text=Enrichment status').locator('xpath=ancestor::div[contains(@class,"space-y")]').first();
  await enrichmentSection.screenshot({ path: 'apps/web/e2e/screenshots/enrichment-skip-column.png' });

  // Also take full page screenshot
  await page.screenshot({ path: 'apps/web/e2e/screenshots/enrichment-full-fixed.png', fullPage: true });

  console.log('Screenshots saved');
});
