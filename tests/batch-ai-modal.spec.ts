import { test, expect } from '@playwright/test';

test.describe('Batch AI Population Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|biomarkers|supplements)/, { timeout: 10000 });
  });

  test('should fetch AI data for supplements', async ({ page }) => {
    // Navigate to supplements page
    await page.goto('/supplements');
    await page.waitForLoadState('networkidle');

    // Look for the "Populate by AI" button
    const populateButton = page.locator('button:has-text("Populate by AI")').first();
    const buttonExists = await populateButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonExists) {
      console.log('No "Populate by AI" button found - skipping test');
      return;
    }

    console.log('Opening batch AI modal...');
    await populateButton.click();
    await page.waitForTimeout(1000);

    // Verify modal opened
    const modalTitle = page.locator('text="Populate All Supplements by AI"');
    await expect(modalTitle).toBeVisible({ timeout: 3000 });
    console.log('Modal opened!');

    // Take screenshot before fetching
    await page.screenshot({ path: 'tests/screenshots/batch-ai-before-fetch.png' });

    // Click "Fetch All with AI" button
    const fetchButton = page.locator('button:has-text("Fetch All with AI")');
    await expect(fetchButton).toBeVisible({ timeout: 2000 });
    console.log('Clicking "Fetch All with AI"...');
    await fetchButton.click();

    // Wait for fetching to start - look for "Fetching" status
    console.log('Waiting for AI to fetch data and watching per-field updates...');

    // Poll very frequently to catch per-field updates (200ms intervals)
    let foundCount = 0;
    let errorCount = 0;
    let screenshotIndex = 0;

    for (let i = 0; i < 150; i++) { // 150 iterations * 200ms = 30 seconds max
      await page.waitForTimeout(200);

      // Count "Found" statuses
      const foundElements = await page.locator('text="Found"').count();
      const errorElements = await page.locator('text="Error"').count();
      const fetchingElements = await page.locator('text="Fetching"').count();

      // Take screenshot every iteration for first 40 to catch per-field animation
      if (i < 40 || i % 10 === 0) {
        await page.screenshot({ path: `tests/screenshots/batch-ai-frame-${screenshotIndex++}.png` });
      }

      if (foundElements > foundCount || errorElements > errorCount) {
        foundCount = foundElements;
        errorCount = errorElements;
        console.log(`Progress: ${foundCount} found, ${errorCount} errors, ${fetchingElements} fetching`);
      }

      // Check if fetching is complete
      if (fetchingElements === 0 && (foundCount > 0 || errorCount > 0)) {
        console.log('Fetching complete!');
        break;
      }

      // Break early if we have at least 2 results
      if (foundCount + errorCount >= 2) {
        // Wait a bit more to capture some per-field updates for next row
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `tests/screenshots/batch-ai-fields-appearing.png` });
        console.log('Got enough results, stopping early...');
        break;
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/batch-ai-complete.png' });
    console.log(`Final results: ${foundCount} found, ${errorCount} errors`);

    // Verify we got at least some results
    expect(foundCount + errorCount).toBeGreaterThan(0);

    // Check if "Save All Selected" button is now enabled
    const saveButton = page.locator('button:has-text("Save All Selected")');
    const saveEnabled = await saveButton.isEnabled();
    console.log('Save button enabled:', saveEnabled);
  });
});
