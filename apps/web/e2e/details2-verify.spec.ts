import { test, expect } from "@playwright/test";

const TRIP_URL = "http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details2";

test.describe("Details 2 page verification", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel)/, { timeout: 15000 });
  });

  test("page loads with segments, day headers, activity cards, and photos", async ({ page }) => {
    await page.goto(TRIP_URL);
    await page.waitForLoadState("networkidle");

    // Filter chips should be present
    const allFilter = page.locator('button:has-text("All")').first();
    await expect(allFilter).toBeVisible({ timeout: 10000 });

    // Take screenshot of top section
    await page.screenshot({ path: "e2e/screenshots/details2-top.png", fullPage: false });

    // Segment overview block should be visible
    const segmentHeader = page.locator("h2").first();
    await expect(segmentHeader).toBeVisible();

    // Day summary header should have weekday badge (Mon/Tue/Wed etc)
    const weekdayBadge = page.locator('.bg-blue-600, .bg-emerald-600, .bg-amber-600, .bg-rose-600').first();
    await expect(weekdayBadge).toBeVisible();

    // Activity rows should have enrichment indicators
    // Star rating
    const starRating = page.locator('.fill-yellow-500').first();
    await expect(starRating).toBeVisible();

    // Photo count indicator (purple)
    const photoCount = page.locator('.text-purple-500').first();
    await expect(photoCount).toBeVisible();

    // Route map should be present
    const routeMap = page.locator('text=Day route').first();
    await expect(routeMap).toBeVisible();

    // Activity cards should be visible (Browse-style with content)
    const activityCard = page.locator('[data-activity-id]').first();
    await expect(activityCard).toBeVisible();

    // Photos should be in mosaic grid (grid-cols-4)
    const mosaicGrid = page.locator('.grid-cols-4').first();
    await expect(mosaicGrid).toBeVisible();

    // Two-column layout: text left, photos right
    const photoColumn = page.locator('.border-l .grid-cols-4').first();
    if (await photoColumn.isVisible()) {
      console.log("✅ Photos in right column (two-column layout)");
    }

    // Scroll down and screenshot an activity with photos
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/details2-activity.png", fullPage: false });

    // Scroll more to verify full content
    await page.evaluate(() => window.scrollBy(0, 1600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/details2-scrolled.png", fullPage: false });

    console.log("✅ Details 2 page renders correctly");
  });
});
