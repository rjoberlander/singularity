import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('verify enrichment display fixes', async ({ page }) => {
  test.setTimeout(60000);

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForSelector('text=Enrichment status', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Scroll to enrichment table
  const enrichmentHeading = page.locator('text=Enrichment status');
  await enrichmentHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Screenshot just the enrichment section
  await page.screenshot({ path: 'apps/web/e2e/screenshots/enrichment-fixed.png', fullPage: false });

  // Get the enrichment table rows (the last table with Enrich/Timing buttons)
  const enrichmentRows = await page.locator('table:has(th:text("Photos")) tbody tr').all();
  console.log(`Enrichment table rows: ${enrichmentRows.length}`);

  for (const row of enrichmentRows) {
    const text = await row.textContent();
    console.log(`  ${text}`);
  }

  // Verify key assertions after all fixes:
  const html = await page.content();

  // 1. Porto photos should now show >= 100% (130/130) since expected is based on enriched places
  expect(html).toContain('130/130');
  console.log('PASS: Porto photos 130/130 (based on enriched places only)');

  // 2. Douro should be fully green (11/11 places, 110/110 photos)
  expect(html).toContain('110/110');
  console.log('PASS: Douro photos 110/110');

  // 3. Peneda should be fully green (12/12 places, 218/120 photos)
  expect(html).toContain('218/120');
  console.log('PASS: Peneda photos 218/120 (over-complete)');

  // 4. Lisbon photos expected should be based on enriched places (16*10=160 not 17*10=170)
  expect(html).toContain('447/160');
  console.log('PASS: Lisbon photos 447/160 (based on 16 enriched places)');
});
