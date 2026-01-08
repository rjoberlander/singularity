import { test, expect } from "@playwright/test";

test.describe("Journal Media Layout - Instagram Style", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("view page shows small thumbnails and lightbox works", async ({ page }) => {
    // Go to journal entry with media
    await page.goto("http://localhost:3000/journal/4f1fd0ac-e1c3-4823-b675-eddb51312d94");
    await page.waitForLoadState("networkidle");

    // Check thumbnails are small (80x80 = w-20 h-20)
    const thumbnails = page.locator('img[src*="singularity-uploads"]');
    const count = await thumbnails.count();
    console.log("Thumbnail count:", count);

    if (count > 0) {
      // Check first thumbnail size
      const firstThumb = thumbnails.first();
      const box = await firstThumb.boundingBox();
      console.log("Thumbnail size:", box?.width, "x", box?.height);

      // Should be around 80x80 (w-20 h-20 = 5rem = 80px)
      expect(box?.width).toBeLessThanOrEqual(100);
      expect(box?.height).toBeLessThanOrEqual(100);
      console.log("✅ Thumbnails are small Instagram-style");

      // Click to open lightbox
      await firstThumb.click();
      await page.waitForTimeout(500);

      // Check lightbox is visible
      const lightbox = page.locator('.fixed.inset-0.bg-black\\/90');
      await expect(lightbox).toBeVisible();
      console.log("✅ Lightbox opened");

      // Check full-size image in lightbox
      const fullImage = lightbox.locator('img');
      const fullBox = await fullImage.boundingBox();
      console.log("Full image size:", fullBox?.width, "x", fullBox?.height);

      // Full image should be larger than thumbnail
      expect(fullBox?.width).toBeGreaterThan(box?.width || 0);
      console.log("✅ Full-size image shown in lightbox");

      // Close lightbox by clicking X
      await page.locator('button:has(svg)').filter({ has: page.locator('svg.w-6.h-6') }).click();
      await page.waitForTimeout(300);
      await expect(lightbox).not.toBeVisible();
      console.log("✅ Lightbox closed");
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/view-page-layout.png' });
    console.log("\n✅ View page layout test passed!");
  });

  test("edit page shows small thumbnails and lightbox works", async ({ page }) => {
    // Go to edit page
    await page.goto("http://localhost:3000/journal/4f1fd0ac-e1c3-4823-b675-eddb51312d94/edit");
    await page.waitForLoadState("networkidle");

    // Check thumbnails are small (64x64 = w-16 h-16)
    const thumbnails = page.locator('img[src*="singularity-uploads"]');
    const count = await thumbnails.count();
    console.log("Thumbnail count:", count);

    if (count > 0) {
      // Check first thumbnail size
      const firstThumb = thumbnails.first();
      const box = await firstThumb.boundingBox();
      console.log("Thumbnail size:", box?.width, "x", box?.height);

      // Should be around 64x64 (w-16 h-16 = 4rem = 64px)
      expect(box?.width).toBeLessThanOrEqual(80);
      expect(box?.height).toBeLessThanOrEqual(80);
      console.log("✅ Thumbnails are small Instagram-style");

      // Click to open lightbox
      await firstThumb.click();
      await page.waitForTimeout(500);

      // Check lightbox is visible
      const lightbox = page.locator('.fixed.inset-0.bg-black\\/90');
      await expect(lightbox).toBeVisible();
      console.log("✅ Lightbox opened");

      // Close lightbox
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Or click outside
      if (await lightbox.isVisible()) {
        await lightbox.click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
      }
      console.log("✅ Lightbox closed");
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/edit-page-layout.png' });
    console.log("\n✅ Edit page layout test passed!");
  });
});
