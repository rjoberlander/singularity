import { test } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('screenshot final accommodation table', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1600, height: 1000 });

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Find the accommodation table (has "Booking Ref" header)
  const accTable = page.locator('table:has(th:text("Booking Ref"))');
  await accTable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await accTable.screenshot({ path: 'apps/web/e2e/screenshots/acc-with-uploads.png' });
});
