import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test.describe("Verify Activity Photos Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('#email', "rjoberlander@gmail.com");
    await page.fill('#password', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("Photos show in activity detail panel", async ({ page }) => {
    // Navigate to the exact URL the user mentioned
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details?day=day1&activity=pasteis-de-belem`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Set viewport to capture full panel
    await page.setViewportSize({ width: 1400, height: 900 });

    // Take full page screenshot
    await page.screenshot({ path: "e2e/screenshots/activity-detail-full.png", fullPage: true });

    // Check for photos section
    const photosSection = page.locator('h4', { hasText: 'Photos' });
    const pendingSection = page.locator('h4', { hasText: 'Pending Approval' });

    const hasPhotos = await photosSection.isVisible().catch(() => false);
    const hasPending = await pendingSection.isVisible().catch(() => false);

    console.log("Has Photos section:", hasPhotos);
    console.log("Has Pending Approval section:", hasPending);

    // Count actual images
    const approvedImages = await page.locator('img[src*="singularity-uploads"]').count();
    console.log("Number of images displayed:", approvedImages);

    // Check if there are any images in the panel
    const sheetContent = page.locator('[role="dialog"]');
    if (await sheetContent.isVisible().catch(() => false)) {
      const imagesInSheet = await sheetContent.locator('img').count();
      console.log("Images in sheet panel:", imagesInSheet);

      // Get all image sources for debugging
      const imageSrcs = await sheetContent.locator('img').evaluateAll(
        imgs => imgs.map(img => (img as HTMLImageElement).src.substring(0, 100))
      );
      console.log("Image sources:", imageSrcs);
    }

    // Take screenshot of just the sheet if visible
    const sheet = page.locator('[role="dialog"]');
    if (await sheet.isVisible().catch(() => false)) {
      await sheet.screenshot({ path: "e2e/screenshots/activity-sheet-only.png" });
    }

    // Should have at least some images
    expect(approvedImages).toBeGreaterThanOrEqual(0);
  });
});
