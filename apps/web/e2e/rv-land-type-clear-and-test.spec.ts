import { test, expect } from '@playwright/test';

/**
 * Clear land_type and re-test AI detection for Serrano Campground
 * Should correctly detect as national_forest since website is recreation.gov
 */
test('should re-detect Serrano as national_forest after clearing', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  // Navigate to the location
  await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Step 1: Edit and clear land_type by setting it to empty via PUT request
  // We need to use the app's edit functionality

  // Click Edit button
  await page.click('button:has-text("Edit")');
  await page.waitForTimeout(1000);

  // Take screenshot of edit form
  await page.screenshot({ path: 'e2e/screenshots/rv-edit-before-clear.png', fullPage: true });

  // Find Land Type dropdown - we need to clear it
  // The API accepts null/undefined for land_type, so let's use fetch to update directly

  // Close the edit dialog first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Use the Edit form to set land_type to something we can detect as "needs update"
  // Then we'll modify the enrichment condition to re-detect
  // For now, let's manually set via the UI

  // Open edit dialog again
  await page.click('button:has-text("Edit")');
  await page.waitForTimeout(1000);

  // Find Land Type dropdown
  const landTypeSelect = page.locator('label:has-text("Land Type")').locator('..').locator('button[role="combobox"]');
  await landTypeSelect.click();
  await page.waitForTimeout(500);

  // Select "Other" which will trigger re-detection since it's not a confident match
  const otherOption = page.locator('div[role="option"]:has-text("Other")');
  if (await otherOption.isVisible()) {
    await otherOption.click();
    await page.waitForTimeout(500);

    // Save the change
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);
    console.log('Set land_type to "other" via edit form');
  } else {
    console.log('Could not find Other option');
    await page.keyboard.press('Escape');
  }

  // Refresh to verify it's cleared
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'e2e/screenshots/rv-after-clear.png', fullPage: true });

  // Step 2: Click Enrich to trigger re-detection
  const enrichButton = page.locator('button:has-text("Enrich")').first();

  if (await enrichButton.isVisible()) {
    // Listen for enrichment response
    const enrichPromise = page.waitForResponse(
      response => response.url().includes('/enrich') && response.status() === 200,
      { timeout: 90000 }
    );

    await enrichButton.click();
    console.log('Clicked Enrich button');

    const response = await enrichPromise;
    const data = await response.json();
    console.log('Enrichment response:', JSON.stringify(data, null, 2));

    // Wait for page to update
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // Step 3: Verify land_type is now national_forest
  await page.screenshot({ path: 'e2e/screenshots/rv-after-redetect.png', fullPage: true });

  // Get the new land_type from the API
  const locationResponse = await page.evaluate(async (locationId) => {
    const response = await fetch(`/api/v1/rv-locations/${locationId}/full`, {
      credentials: 'include'
    });
    return response.json();
  }, testLocationId);

  console.log('New land_type:', locationResponse.data?.land_type);

  // Check if it's now national_forest
  expect(locationResponse.data?.land_type).toBe('national_forest');
  console.log('SUCCESS: Land type correctly detected as national_forest!');
});
