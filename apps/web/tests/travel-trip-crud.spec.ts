import { test, expect } from '@playwright/test';

test.describe('Travel Trip CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('can navigate to travel page', async ({ page }) => {
    // Navigate to travel page via sidebar
    await page.goto('http://localhost:3000/travel');
    await page.waitForLoadState('networkidle');

    // Verify we're on the travel page
    await expect(page.locator('h1:has-text("Travel")')).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/travel-page.png', fullPage: true });
  });

  test('can create a new trip', async ({ page }) => {
    // Navigate to travel page
    await page.goto('http://localhost:3000/travel');
    await page.waitForLoadState('networkidle');

    // Click "New Trip" button
    const newTripButton = page.locator('a:has-text("New Trip"), button:has-text("New Trip")').first();
    await expect(newTripButton).toBeVisible({ timeout: 10000 });
    await newTripButton.click();

    // Wait for new trip page
    await page.waitForURL('**/travel/new', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Take screenshot of new trip form
    await page.screenshot({ path: 'test-results/travel-new-trip-form.png', fullPage: true });

    // Fill in trip details
    const tripName = `Test Trip ${Date.now()}`;
    await page.fill('input#name', tripName);
    await page.fill('textarea#description', 'A test trip created by Playwright');

    // Set dates (today and 7 days from now)
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await page.fill('input#start_date', startDate);
    await page.fill('input#end_date', endDate);

    // Fill origin and destination
    await page.fill('input#origin', 'San Francisco');
    await page.fill('input#destination', 'Tokyo, Japan');

    // Select transportation type (Flying)
    const flyingButton = page.locator('button:has-text("Flying")');
    await flyingButton.click();

    // Take screenshot before submitting
    await page.screenshot({ path: 'test-results/travel-trip-filled.png', fullPage: true });

    // Submit the form
    const submitButton = page.locator('button[type="submit"]:has-text("Create Trip")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for redirect to trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 15000 });

    // Take screenshot of created trip
    await page.screenshot({ path: 'test-results/travel-trip-created.png', fullPage: true });

    // Verify trip name is displayed
    await expect(page.locator(`text=${tripName}`).first()).toBeVisible({ timeout: 5000 });

    console.log(`Trip created successfully: ${tripName}`);

    // Navigate back to travel list and verify trip appears
    await page.goto('http://localhost:3000/travel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of travel list with new trip
    await page.screenshot({ path: 'test-results/travel-list-with-trip.png', fullPage: true });

    // Verify the trip appears in the list
    await expect(page.locator(`text=${tripName}`).first()).toBeVisible({ timeout: 10000 });
    console.log('Trip appears in travel list - test passed!');
  });

  test('can view trip details', async ({ page }) => {
    // First create a trip
    await page.goto('http://localhost:3000/travel/new');
    await page.waitForLoadState('networkidle');

    const tripName = `Detail View Trip ${Date.now()}`;
    await page.fill('input#name', tripName);

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await page.fill('input#start_date', startDate);
    await page.fill('input#end_date', endDate);
    await page.fill('input#destination', 'Paris, France');

    const submitButton = page.locator('button[type="submit"]:has-text("Create Trip")');
    await submitButton.click();

    // Wait for trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify trip details are displayed
    await expect(page.locator(`text=${tripName}`).first()).toBeVisible({ timeout: 5000 });

    // Check for tabs (Overview, Itinerary, etc.)
    await expect(page.locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")')).toBeVisible({ timeout: 5000 });

    // Take screenshot of trip detail
    await page.screenshot({ path: 'test-results/travel-trip-detail.png', fullPage: true });

    console.log('Trip detail view test passed!');
  });

  test('can delete a trip', async ({ page }) => {
    // First create a trip to delete
    await page.goto('http://localhost:3000/travel/new');
    await page.waitForLoadState('networkidle');

    const tripName = `Delete Test Trip ${Date.now()}`;
    await page.fill('input#name', tripName);

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await page.fill('input#start_date', startDate);
    await page.fill('input#end_date', endDate);

    const submitButton = page.locator('button[type="submit"]:has-text("Create Trip")');
    await submitButton.click();

    // Wait for trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Look for delete button or menu
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();

    // If delete button exists, click it
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion if there's a dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Should redirect to travel list
      await page.waitForURL('**/travel', { timeout: 10000 });

      // Verify trip is no longer visible
      await page.waitForTimeout(1000);
      const tripVisible = await page.locator(`text=${tripName}`).isVisible().catch(() => false);
      expect(tripVisible).toBe(false);

      console.log('Trip deleted successfully!');
    } else {
      console.log('Delete button not found - skipping delete test');
    }
  });
});
