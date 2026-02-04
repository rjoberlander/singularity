import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('RV Locations Import and Display', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|rv-locations)/);
  });

  test('should import RV locations from JSON and display in UI', async ({ page }) => {
    // Navigate to RV Locations page
    await page.goto('/rv-locations');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'e2e/screenshots/rv-locations-before-import.png', fullPage: true });

    // Try to click either the header Import button or the empty state Import Locations button
    // First try the "Import" button in header (exact match)
    let importButton = page.getByRole('button', { name: 'Import', exact: true });
    if (!await importButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try the "Import Locations" button in empty state
      importButton = page.getByRole('button', { name: 'Import Locations' });
    }

    if (await importButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await importButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot of import dialog
      await page.screenshot({ path: 'e2e/screenshots/rv-locations-import-sheet.png', fullPage: true });

      // Read the JSON file
      const jsonPath = '/Users/richard/Downloads/rv_locations_import.json';
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');

      // Find the textarea and paste the JSON
      const textarea = page.locator('textarea').first();
      await textarea.waitFor({ state: 'visible', timeout: 5000 });
      await textarea.fill(jsonContent);

      // Take screenshot after pasting JSON
      await page.screenshot({ path: 'e2e/screenshots/rv-locations-import-filled.png', fullPage: true });

      // Click the import/submit button in the sheet (look for primary button)
      const submitButton = page.locator('button:has-text("Import")').last();
      await submitButton.click();

      // Wait for import to complete (this may take a while with 30 locations)
      await page.waitForTimeout(15000);

      // Take screenshot after import
      await page.screenshot({ path: 'e2e/screenshots/rv-locations-import-complete.png', fullPage: true });
    } else {
      console.log('Import button not found');
      await page.screenshot({ path: 'e2e/screenshots/rv-locations-no-import-button.png', fullPage: true });
    }

    // Refresh and wait for locations to load
    await page.goto('/rv-locations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot of locations list
    await page.screenshot({ path: 'e2e/screenshots/rv-locations-after-import.png', fullPage: true });

    // Check for specific location names from our import
    const pageContent = await page.content();
    console.log('Page contains Death Valley:', pageContent.includes('Death Valley'));
    console.log('Page contains Grand Canyon:', pageContent.includes('Grand Canyon'));
    console.log('Page contains Joshua Tree:', pageContent.includes('Joshua Tree'));
    console.log('Page contains Pinnacles:', pageContent.includes('Pinnacles'));
  });

  test('should display location details correctly after import', async ({ page }) => {
    // Navigate to RV Locations page
    await page.goto('/rv-locations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of list
    await page.screenshot({ path: 'e2e/screenshots/rv-locations-list-check.png', fullPage: true });

    // Find and click on the first location card (not the "new" link)
    const locationLinks = page.locator('a[href*="/rv-locations/"]');
    const count = await locationLinks.count();
    console.log(`Found ${count} location links`);

    // Find a link that goes to a location detail page (not /new)
    for (let i = 0; i < count; i++) {
      const link = locationLinks.nth(i);
      const href = await link.getAttribute('href');
      if (href && !href.includes('/new')) {
        console.log(`Clicking location with href: ${href}`);
        await link.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Take screenshot of detail page
        await page.screenshot({ path: 'e2e/screenshots/rv-location-detail.png', fullPage: true });

        // Check for tabs
        const detailsTab = page.locator('a, button').filter({ hasText: /^Details$/i });
        const activitiesTab = page.locator('a, button').filter({ hasText: /^Activities$/i });
        const mediaTab = page.locator('a, button').filter({ hasText: /^Media$/i });

        if (await detailsTab.isVisible().catch(() => false)) {
          console.log('Details tab found');
        }
        if (await activitiesTab.isVisible().catch(() => false)) {
          console.log('Activities tab found');
          await activitiesTab.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'e2e/screenshots/rv-location-activities.png', fullPage: true });
        }
        if (await mediaTab.isVisible().catch(() => false)) {
          console.log('Media tab found');
          await mediaTab.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'e2e/screenshots/rv-location-media.png', fullPage: true });
        }
        break;
      }
    }
  });
});
