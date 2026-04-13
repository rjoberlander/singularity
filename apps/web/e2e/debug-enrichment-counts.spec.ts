import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test('debug enrichment counts by intercepting API', async ({ page }) => {
  test.setTimeout(60000);

  // Intercept the /full API call to capture raw data
  let apiData: any = null;
  await page.route('**/travel/trips/*/full', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    apiData = json.data;
    await route.fulfill({ response });
  });

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

  // Now check what the API returned
  expect(apiData).toBeTruthy();
  console.log(`API returned: ${apiData.activities?.length} activities, ${apiData.media?.length} media`);

  // Count activities per segment
  const segments = apiData.segments || [];
  const activities = apiData.activities || [];

  for (const seg of segments.sort((a: any, b: any) => a.sort_order - b.sort_order)) {
    const segActs = activities.filter((a: any) => a.segment_id === seg.id && !a.is_backup);
    const enrichableTypes = new Set(['activity','dining','snack','coffee','sightseeing','attraction',
      'restaurant','cafe','museum','hike','beach','shopping']);
    const enrichableActs = segActs.filter((a: any) => enrichableTypes.has(a.activity_type || ''));
    console.log(`${seg.name}: ${segActs.length} non-backup, ${enrichableActs.length} enrichable-type`);
  }

  // Now scrape the actual displayed values from the table
  const tableRows = await page.locator('table tbody tr').all();
  console.log(`\nTable rows found: ${tableRows.length}`);

  for (const row of tableRows) {
    const text = await row.textContent();
    console.log(`ROW: ${text}`);
  }
});
