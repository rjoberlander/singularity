import { test, expect } from '@playwright/test';

test.describe('Plan Step Issues Display', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel|schedule)/);
  });

  test('should display pre-validation issues on Days & Activities step', async ({ page }) => {
    // Navigate to the trip plan page
    await page.goto('http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan');

    // Wait for the page to load
    await page.waitForSelector('text=Days & Activities', { timeout: 10000 });

    // Find the Issues section
    const issuesSection = page.locator('text=Issues').first();
    await expect(issuesSection).toBeVisible();

    // Check for "No hotel" error message
    const noHotelError = page.locator('text=/No hotel:/');
    await expect(noHotelError).toBeVisible();

    // Check for "Missing activities" error message (Jul 14)
    const missingActivities = page.locator('text=/Missing activities:/');
    await expect(missingActivities).toBeVisible();

    // Check for "Not enriched" warning with specific activity details
    const notEnriched = page.locator('text=/Not enriched:/');
    await expect(notEnriched).toBeVisible();

    // Verify the unenriched activity shows the reason
    // Should show something like "Jun 26: Easy first dinner (needs research)"
    const unenrichedDetail = page.locator('text=/Jun 26.*needs research/');
    await expect(unenrichedDetail).toBeVisible();

    // Scroll to the Issues section and take a focused screenshot
    const issuesSectionContainer = page.locator('.bg-muted\\/30').filter({ hasText: 'Issues' }).first();
    await issuesSectionContainer.scrollIntoViewIfNeeded();

    // Take a screenshot of just the Days & Activities card
    const daysActivitiesCard = page.locator('text=Days & Activities').locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
    await daysActivitiesCard.screenshot({
      path: 'e2e/screenshots/plan-issues-display.png'
    });
  });

  test('should show specific dates for missing activities', async ({ page }) => {
    await page.goto('http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan');

    await page.waitForSelector('text=Days & Activities', { timeout: 10000 });

    // Check that Jul 14 is specifically mentioned in the Missing activities error
    const missingActivities = page.locator('text=/Missing activities:.*Jul 14/');
    await expect(missingActivities).toBeVisible();
  });

  test('should show segment names for missing hotels', async ({ page }) => {
    await page.goto('http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan');

    await page.waitForSelector('text=Days & Activities', { timeout: 10000 });

    // Check that segment names are listed for missing hotels
    const noHotelSection = page.locator('text=/No hotel:.*Lisbon/');
    await expect(noHotelSection).toBeVisible();
  });
});
