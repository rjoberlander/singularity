import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002/api/v1';
const VILA_GALE_ID = 'ca63033a-2048-47bc-bbb2-73c792e28ea6';

test('upload Vila Galé confirmation via UI and verify', async ({ page }) => {
  test.setTimeout(60000);

  // Get token for DB verification
  const loginResp = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rjoberlander@gmail.com', password: 'Cookie123!' }),
  });
  const authToken = (await loginResp.json()).data?.session?.access_token;

  // Delete existing Vila Galé document first so we can test the upload
  const SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w';
  await fetch(`https://cymbadkegbibhxbfevuq.supabase.co/rest/v1/trip_media?parent_id=eq.${VILA_GALE_ID}&media_type=eq.document`, {
    method: 'DELETE',
    headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` },
  });
  console.log('Cleared existing Vila Galé document');

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Navigate to plan page
  await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Scroll to accommodations
  await page.locator('h3:has-text("Accommodations")').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Find the Upload button for Vila Galé row
  // Vila Galé has booking ref 9181362 but needs file upload
  const uploadLabels = page.locator('label:has-text("Upload")');
  const count = await uploadLabels.count();
  console.log(`Upload buttons found: ${count}`);

  expect(count).toBeGreaterThan(0);

  // Upload the file
  const fileInput = uploadLabels.first().locator('input[type="file"]');
  await fileInput.setInputFiles('/Users/richard/Downloads/vilagale.pdf');
  console.log('File selected');

  // Wait for upload + page reload
  await page.waitForTimeout(8000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // Verify in DB
  const fullResp = await fetch(`${API_URL}/travel/trips/${TRIP_ID}/full`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await fullResp.json();
  const doc = data.data.media.find(
    (m: any) => m.parent_id === VILA_GALE_ID && m.media_type === 'document'
  );

  expect(doc, 'Vila Galé should have a confirmation document').toBeTruthy();
  console.log(`PASS: Document saved`);
  console.log(`  file_url: ${doc.file_url}`);
  console.log(`  filename: ${doc.original_filename}`);

  // Verify it shows on the page
  await page.locator('h3:has-text("Accommodations")').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  const pageHtml = await page.content();
  expect(pageHtml).toContain('vilagale');
  console.log('PASS: File link visible on page');

  await page.screenshot({ path: 'apps/web/e2e/screenshots/vilagale-uploaded.png' });
});
