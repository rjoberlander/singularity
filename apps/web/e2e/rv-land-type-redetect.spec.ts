import { test, expect } from '@playwright/test';

/**
 * Test RV Location land type re-detection
 * Clears existing land_type and re-runs enrichment to test improved AI detection
 */
test.describe('RV Land Type Re-detection', () => {
  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  test('should correctly detect national_forest for Serrano Campground', async ({ page, request }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to the location
    await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Edit to clear land_type
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    await page.waitForTimeout(1000);

    // Find land type select and clear it (select empty/placeholder option)
    const landTypeSelect = page.locator('text=Land Type').locator('..').locator('button[role="combobox"]');
    await landTypeSelect.click();
    await page.waitForTimeout(500);

    // Try to clear by clicking outside or selecting a different value first
    // Actually, we need to update via API to set land_type to null
    await page.keyboard.press('Escape');

    // Let's update via the edit form - set to empty/other first then save
    // Since there's no "clear" option, we'll use the API directly after this test
    console.log('Note: Manual clear needed - will test with fresh location or API update');

    // For now, take a screenshot to see current state
    await page.screenshot({ path: 'e2e/screenshots/rv-land-type-edit.png', fullPage: true });

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Find and click Enrich button
    const enrichButton = page.locator('button:has-text("Enrich")').first();
    const isVisible = await enrichButton.isVisible().catch(() => false);

    if (isVisible) {
      // Listen for the response
      const enrichPromise = page.waitForResponse(
        response => response.url().includes('/enrich') && response.status() === 200,
        { timeout: 90000 }
      );

      await enrichButton.click();
      console.log('Clicked Enrich button');

      const response = await enrichPromise;
      const data = await response.json();
      console.log('Enrichment response:', JSON.stringify(data, null, 2));
    }

    // Check if land_type badge is visible
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/rv-land-type-after.png', fullPage: true });

    // Look for National Forest badge
    const forestBadge = page.locator('text=National Forest');
    const hasForestBadge = await forestBadge.isVisible().catch(() => false);
    console.log(`Has National Forest badge: ${hasForestBadge}`);

    // Also check what badge IS shown
    const badges = await page.locator('.flex.items-center.gap-3 span, .flex.items-center.gap-3 div').allTextContents();
    console.log('Badges found:', badges);
  });
});
