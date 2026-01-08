import { test, expect } from "@playwright/test";

test.describe("Journal View - Mosaic Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("displays mosaic grid layout with multiple photos", async ({ page }) => {
    // Go to entry with multiple photos
    await page.goto("http://localhost:3000/journal/4f1fd0ac-e1c3-4823-b675-eddb51312d94");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/mosaic-layout.png', fullPage: true });

    // Check for two-column layout on desktop
    const leftColumn = page.locator('.lg\\:w-\\[60\\%\\]');
    const rightColumn = page.locator('.lg\\:w-\\[40\\%\\]');

    // Check media gallery exists
    const mediaGallery = page.locator('.bg-muted\\/30.rounded-2xl');
    const galleryVisible = await mediaGallery.isVisible();
    console.log("Media gallery visible:", galleryVisible);

    // Count images in gallery
    const images = page.locator('.bg-muted\\/30.rounded-2xl img');
    const imageCount = await images.count();
    console.log("Images in mosaic gallery:", imageCount);

    // Check for mosaic grid (should have grid-cols-2 or grid-cols-3)
    const mosaicGrid = page.locator('.grid.grid-cols-2, .grid.grid-cols-3');
    const gridCount = await mosaicGrid.count();
    console.log("Mosaic grids found:", gridCount);

    if (imageCount > 1) {
      expect(gridCount).toBeGreaterThan(0);
      console.log("✅ Mosaic grid layout detected");
    }

    // Test lightbox - click first image
    if (imageCount > 0) {
      const firstImage = images.first();
      await firstImage.click();
      await page.waitForTimeout(500);

      // Check lightbox opened
      const lightbox = page.locator('.fixed.inset-0.bg-black\\/90');
      await expect(lightbox).toBeVisible();
      console.log("✅ Lightbox opens on click");

      // Take screenshot of lightbox
      await page.screenshot({ path: 'test-results/lightbox-open.png' });

      // Close lightbox
      await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
    }

    // Verify photo count indicator
    const photoCount = page.locator('text=/\\d+ photos?/');
    await expect(photoCount).toBeVisible();
    console.log("✅ Photo count indicator visible");

    console.log("\n✅ Mosaic layout test passed!");
  });

  test("two-column layout on desktop", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("http://localhost:3000/journal/4f1fd0ac-e1c3-4823-b675-eddb51312d94");
    await page.waitForLoadState("networkidle");

    // Take screenshot at desktop size
    await page.screenshot({ path: 'test-results/desktop-two-column.png', fullPage: true });

    // Check layout is side by side (flex-row on lg)
    const contentArea = page.locator('.lg\\:flex-row');
    await expect(contentArea).toBeVisible();
    console.log("✅ Two-column flex-row layout on desktop");

    // Check text is on left
    const textContent = page.locator('.lg\\:w-\\[60\\%\\] .prose');
    await expect(textContent).toBeVisible();
    console.log("✅ Text content in left column");

    // Check media is on right
    const mediaColumn = page.locator('.lg\\:w-\\[40\\%\\]');
    const mediaVisible = await mediaColumn.isVisible();
    if (mediaVisible) {
      console.log("✅ Media gallery in right column");
    }

    console.log("\n✅ Desktop layout test passed!");
  });
});
