import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002/api/v1';

test('enrich all accommodations via plan page button', async ({ page }) => {
  test.setTimeout(300000); // 5 min — each enrichment calls Perplexity + Claude + Google

  // Get auth token for DB verification
  const loginResp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rjoberlander@gmail.com', password: 'Cookie123!' }),
  });
  const authToken = (await loginResp.json()).data?.session?.access_token;

  // Check state before
  let fullResp = await fetch(`${API_URL}/travel/trips/${TRIP_ID}/full`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  let fullData = await fullResp.json();
  const accsBefore = fullData.data.accommodations;
  console.log('=== BEFORE ENRICH ALL ===');
  for (const acc of accsBefore.sort((a: any, b: any) => (a.check_in_date || '').localeCompare(b.check_in_date || ''))) {
    const photos = fullData.data.media.filter((m: any) => m.parent_type === 'accommodation' && m.parent_id === acc.id && m.media_type !== 'document').length;
    console.log(`  ${acc.name.substring(0, 40).padEnd(40)} enriched=${acc.enriched_at ? 'Y' : 'N'} photos=${photos}`);
  }

  // Login and navigate
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Find and click "Enrich All"
  const enrichAllBtn = page.locator('button:has-text("Enrich All")');
  await enrichAllBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await expect(enrichAllBtn).toBeVisible();

  await page.screenshot({ path: 'apps/web/e2e/screenshots/enrich-all-before.png', fullPage: false });

  await enrichAllBtn.click();
  console.log('Clicked Enrich All — waiting for completion...');

  // Wait for the button to show progress, then for page reload
  // The button shows "1/6: Hyatt...", "2/6: Beautiful...", etc.
  // Then does window.location.reload() when done
  // Just wait for the page to reload (networkidle after the enrichment)
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(5000);
    // Check if we're still enriching (button shows loader)
    const isEnriching = await page.locator('button:has-text("Enrich All")').locator('svg.animate-spin').isVisible().catch(() => false);
    if (!isEnriching && i > 2) {
      console.log(`Enrichment appears complete after ${(i+1)*5}s`);
      break;
    }
    // Log progress
    const btnText = await page.locator('button:has-text("/")').first().textContent().catch(() => '');
    if (btnText) console.log(`  Progress: ${btnText}`);
  }

  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Verify DB state after
  fullResp = await fetch(`${API_URL}/travel/trips/${TRIP_ID}/full`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  fullData = await fullResp.json();
  const accsAfter = fullData.data.accommodations;
  console.log('\n=== AFTER ENRICH ALL ===');
  let allEnriched = true;
  for (const acc of accsAfter.sort((a: any, b: any) => (a.check_in_date || '').localeCompare(b.check_in_date || ''))) {
    const photos = fullData.data.media.filter((m: any) => m.parent_type === 'accommodation' && m.parent_id === acc.id && m.media_type !== 'document').length;
    const enriched = !!acc.enriched_at;
    if (!enriched) allEnriched = false;
    console.log(`  ${acc.name.substring(0, 40).padEnd(40)} enriched=${enriched ? 'Y' : 'N'} photos=${photos} pool=${acc.amenities_structured?.pool?.exists ?? '?'} parking=${acc.parking?.available ?? '?'}`);
  }

  await page.screenshot({ path: 'apps/web/e2e/screenshots/enrich-all-after.png', fullPage: false });

  expect(allEnriched, 'All accommodations should be enriched').toBeTruthy();
  console.log('\nPASS: All accommodations enriched');
});
