import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1400, height: 900 } });

test.describe('RV Location Photo Gallery', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should open photo gallery and navigate photos', async ({ page }) => {
    // Go to an RV location with photos
    await page.goto('http://localhost:3000/rv-locations/b4f80769-0be6-4e6f-ad06-e55efe176cae');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'e2e/screenshots/rv-gallery-1-page.png' });

    // Find and click on a photo in the cover grid
    const coverPhoto = page.locator('.grid img').first();
    await expect(coverPhoto).toBeVisible({ timeout: 10000 });
    await coverPhoto.click();

    // Wait for gallery modal to open
    await page.waitForTimeout(500);

    // Take screenshot of gallery
    await page.screenshot({ path: 'e2e/screenshots/rv-gallery-2-grid.png' });

    // Verify gallery modal is open - look for the photo count text
    const photoCount = page.getByText(/\d+ photos?/);
    await expect(photoCount).toBeVisible({ timeout: 5000 });

    // Click on a photo in the grid to open full view
    const galleryPhoto = page.locator('[role="dialog"] button img').first();
    await expect(galleryPhoto).toBeVisible();
    await galleryPhoto.click();

    // Wait for full image view
    await page.waitForTimeout(500);

    // Take screenshot of full image view
    await page.screenshot({ path: 'e2e/screenshots/rv-gallery-3-fullview.png' });

    // Verify full image view elements
    const closeButton = page.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeVisible();

    // Verify counter is visible (e.g., "1 / 60")
    const counter = page.getByText(/\d+ \/ \d+/);
    await expect(counter).toBeVisible();

    // Click Close to go back to gallery grid
    await closeButton.click();
    await page.waitForTimeout(300);

    // Verify we're back in gallery grid
    await expect(photoCount).toBeVisible();

    // Close gallery by clicking X
    const closeGallery = page.locator('[role="dialog"] button').filter({ has: page.locator('svg') }).first();
    await closeGallery.click();

    // Verify gallery is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });

    console.log('Photo gallery test passed!');
  });
});
