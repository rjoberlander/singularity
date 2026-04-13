import { test } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('screenshot plan and browse amenity displays', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Plan page
  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  const accTable = page.locator('table:has(th:text("Hotel"))');
  await accTable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await accTable.screenshot({ path: 'apps/web/e2e/screenshots/plan-amenity-icons.png' });

  // Browse page - navigate to first segment and find hotel card
  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Look for the hotel info by finding the Building2 icon or hotel name text
  const hotelName = page.locator('text=Hyatt Regency').first();
  if (await hotelName.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Get the parent card
    const card = hotelName.locator('xpath=ancestor::div[contains(@class,"bg-blue") or contains(@class,"rounded")]').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await card.screenshot({ path: 'apps/web/e2e/screenshots/browse-hotel-amenities.png' });
  } else {
    // Maybe need to scroll or select Lisbon segment
    // Try clicking segment 1
    const seg1 = page.locator('text=Lisbon').first();
    if (await seg1.isVisible()) {
      await seg1.click();
      await page.waitForTimeout(2000);
    }
    // Take full page screenshot
    await page.screenshot({ path: 'apps/web/e2e/screenshots/browse-hotel-amenities.png', fullPage: false });
  }
});
