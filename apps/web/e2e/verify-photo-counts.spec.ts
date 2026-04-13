import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('photo counts reflect all DB records after pagination fix', async ({ page }) => {
  test.setTimeout(60000);

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Navigate to plan page
  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForSelector('text=Enrichment status', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Scroll to enrichment section
  await page.locator('text=Enrichment status').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Screenshot the enrichment area
  await page.screenshot({ path: 'apps/web/e2e/screenshots/photo-counts-fixed.png', fullPage: true });

  // Use page.content() to get full HTML including rendered numbers
  const html = await page.content();

  // Extract photo ratios from the HTML - pattern: digits/digits where denominator ends in 0
  // These appear as text nodes like "676/320"
  const photoPattern = /(\d{2,4})\/(\d{2,3}0)/g;
  const allMatches = [...html.matchAll(photoPattern)];

  // Filter to likely photo ratios (denominator between 100-500, which matches our segments)
  const ratios = allMatches
    .map(m => ({ actual: parseInt(m[1]), expected: parseInt(m[2]), raw: m[0] }))
    .filter(r => r.expected >= 100 && r.expected <= 500);

  // Deduplicate (same ratio might appear in HTML multiple times)
  const seen = new Set<string>();
  const uniqueRatios = ratios.filter(r => {
    if (seen.has(r.raw)) return false;
    seen.add(r.raw);
    return true;
  });

  console.log('Photo ratios found:', uniqueRatios.map(r => r.raw));

  // We expect 6 segments with photo data
  expect(uniqueRatios.length, 'Should find 6 photo ratios for 6 segments').toBeGreaterThanOrEqual(6);

  // Every segment should have well above the old broken counts
  // Before fix: 327, 83, 87, 49, 68, 5
  // After fix: should all be >100
  for (const r of uniqueRatios) {
    console.log(`  ${r.raw}: actual=${r.actual}`);
    expect(r.actual, `Photo count ${r.raw} - actual should be > 100`).toBeGreaterThan(100);
  }

  // Porto specific: denominator 310, was showing 5, should now be >200
  const portoRatio = uniqueRatios.find(r => r.expected === 310);
  expect(portoRatio, 'Should find Porto photo ratio (*/310)').toBeTruthy();
  console.log(`Porto: ${portoRatio!.raw} (was 5/310 before fix)`);
  expect(portoRatio!.actual, 'Porto photos should be >200').toBeGreaterThan(200);
});
