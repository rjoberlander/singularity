import { test, expect } from '@playwright/test';

test.describe('Activity Details Deep Dive Content', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel|schedule)/);
  });

  test('should display deep_dive content for Pena Palace activity', async ({ page }) => {
    // Navigate to the trip details page with Pena Palace activity
    await page.goto('http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details?day=day2&activity=pena-palace');

    // Wait for the page to load
    await page.waitForSelector('text=Pena Palace', { timeout: 10000 });

    // Check for "What It Is" section
    const whatItIs = page.locator('text=What It Is');
    await expect(whatItIs).toBeVisible();

    // Check for "Why It Matters" section - this was the broken part
    const whyItMatters = page.locator('h4:has-text("Why It Matters")');
    await expect(whyItMatters).toBeVisible();

    // Check that the actual content is displayed (not just the heading)
    // The content should mention "king" based on the deep_dive data
    const whyItMattersContent = page.getByText('Pena Palace is what happens when a king');
    await expect(whyItMattersContent).toBeVisible();

    // Check for "The Story" section
    const theStory = page.locator('h4:has-text("The Story")');
    await expect(theStory).toBeVisible();

    // Check for "Interesting Facts" section
    const interestingFacts = page.locator('text=Interesting Facts');
    await expect(interestingFacts).toBeVisible();

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e/screenshots/activity-details-deep-dive.png',
      fullPage: true
    });
  });

  test('should display kid engagement scripts', async ({ page }) => {
    await page.goto('http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details?day=day2&activity=pena-palace');

    await page.waitForSelector('text=Pena Palace', { timeout: 10000 });

    // Check for kid engagement section with named children
    // The V3.2 format uses parker, charlotte, xander
    const kidSection = page.locator('text=/Parker|Charlotte|Xander/i').first();
    await expect(kidSection).toBeVisible();
  });
});
