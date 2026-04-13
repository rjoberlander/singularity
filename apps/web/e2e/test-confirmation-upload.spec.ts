import { test, expect } from '@playwright/test';
import * as path from 'path';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002/api/v1';

// Holiday Inn (Airport Hotel) — has no confirmation file yet
const HOLIDAY_INN_ID = 'f2143813-8b1c-45d3-9a63-caadcbd737b8';

test('upload confirmation file via UI', async ({ page }) => {
  test.setTimeout(60000);

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
  const accHeading = page.locator('h3:has-text("Accommodations")').first();
  await accHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Listen for console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Listen for failed network requests
  const failedRequests: string[] = [];
  page.on('requestfailed', req => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  // Listen for upload-confirmation responses
  let uploadResponse: any = null;
  page.on('response', async resp => {
    if (resp.url().includes('upload-confirmation')) {
      try {
        uploadResponse = { status: resp.status(), body: await resp.json() };
      } catch {
        uploadResponse = { status: resp.status(), body: 'parse error' };
      }
      console.log(`Upload response: ${resp.status()}`);
    }
  });

  // Find all Upload labels
  const uploadLabels = page.locator('label:has-text("Upload")');
  const count = await uploadLabels.count();
  console.log(`Found ${count} Upload buttons`);

  // Screenshot before
  await page.screenshot({ path: 'apps/web/e2e/screenshots/upload-test-before.png' });

  if (count === 0) {
    console.log('No Upload buttons found — all have confirmation files already');
    // Check which accommodations have files
    const loginResp = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rjoberlander@gmail.com', password: 'Cookie123!' }),
    });
    const token = (await loginResp.json()).data?.session?.access_token;
    const fullResp = await fetch(`${API_URL}/travel/trips/${TRIP_ID}/full`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await fullResp.json();
    const docs = data.data.media.filter((m: any) => m.media_type === 'document');
    console.log(`Document media in DB: ${docs.length}`);
    for (const d of docs) {
      console.log(`  parent=${d.parent_id?.substring(0, 8)} file=${d.original_filename}`);
    }

    // Delete one to test upload
    if (docs.length > 0) {
      const toDelete = docs[docs.length - 1];
      console.log(`\nDeleting ${toDelete.original_filename} to test upload...`);
      // Delete via Supabase directly
      const SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w';
      await fetch(`https://cymbadkegbibhxbfevuq.supabase.co/rest/v1/trip_media?id=eq.${toDelete.id}`, {
        method: 'DELETE',
        headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` },
      });
      console.log('Deleted. Reloading page...');
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await accHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }
  }

  // Try again
  const uploadLabels2 = page.locator('label:has-text("Upload")');
  const count2 = await uploadLabels2.count();
  console.log(`Upload buttons after cleanup: ${count2}`);

  if (count2 > 0) {
    // Get the file input inside the first Upload label
    const fileInput = uploadLabels2.first().locator('input[type="file"]');

    // Use Playwright's setInputFiles to upload
    await fileInput.setInputFiles('/Users/richard/Downloads/vilagale.pdf');
    console.log('File selected via setInputFiles');

    // Wait for upload to complete (handler does window.location.reload)
    await page.waitForTimeout(5000);

    // Check results
    console.log(`Console errors: ${consoleErrors.length}`);
    for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    for (const r of failedRequests) console.log(`  FAILED: ${r}`);
    console.log(`Upload response: ${JSON.stringify(uploadResponse)}`);

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: 'apps/web/e2e/screenshots/upload-test-after.png' });
  }
});
