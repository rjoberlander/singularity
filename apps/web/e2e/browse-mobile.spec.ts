import { test, expect } from "@playwright/test";

const TRIP_URL = "/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/browse";

test.describe("Browse tab - mobile responsiveness", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel|$)/);
  });

  test("loads on mobile viewport with time bars and photos", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TRIP_URL);
    await page.waitForSelector('[data-testid="browse-page"]', { timeout: 15000 });

    // Segment tabs should be visible
    const segmentTabs = page.locator('[data-testid="segment-tabs"]');
    await expect(segmentTabs).toBeVisible();

    // Segment header should show
    const segmentHeader = page.locator('[data-testid="segment-header"]');
    await expect(segmentHeader).toBeVisible();

    // Should have day sections
    const days = page.locator('[data-testid="browse-day"]');
    const dayCount = await days.count();
    expect(dayCount).toBeGreaterThan(0);

    // Activity cards should exist
    const activityCards = page.locator('[data-testid="browse-activity-card"]');
    const cardCount = await activityCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Mobile time bars should be visible (md:hidden means visible on mobile)
    const mobileTimeBars = page.locator('[data-testid="mobile-time-bar"]');
    const timeBarCount = await mobileTimeBars.count();
    expect(timeBarCount).toBeGreaterThan(0);

    // Desktop timeline strips should NOT be visible on mobile
    const desktopTimeline = page.locator('[data-testid="timeline-strip"]').first();
    if (await desktopTimeline.count() > 0) {
      await expect(desktopTimeline).not.toBeVisible();
    }

    // Take screenshot
    await page.screenshot({ path: "tests/screenshots/browse-mobile.png", fullPage: false });
  });

  test("loads on desktop viewport with timeline strips", async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(TRIP_URL);
    await page.waitForSelector('[data-testid="browse-page"]', { timeout: 15000 });

    // Desktop timeline strips should be visible
    const timelineStrips = page.locator('[data-testid="timeline-strip"]');
    const stripCount = await timelineStrips.count();
    expect(stripCount).toBeGreaterThan(0);

    // Mobile time bars should NOT be visible on desktop
    const mobileTimeBars = page.locator('[data-testid="mobile-time-bar"]').first();
    if (await mobileTimeBars.count() > 0) {
      await expect(mobileTimeBars).not.toBeVisible();
    }

    // Photos should be visible
    const photos = page.locator('[data-testid="activity-photos"]');
    const photoCount = await photos.count();
    expect(photoCount).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({ path: "tests/screenshots/browse-desktop.png", fullPage: false });
  });

  test("segment tabs are scrollable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TRIP_URL);
    await page.waitForSelector('[data-testid="browse-page"]', { timeout: 15000 });

    // Check first tab is active
    const firstTab = page.locator('[data-testid="segment-tab-0"]');
    await expect(firstTab).toBeVisible();

    // Check if there are multiple tabs
    const tabCount = await page.locator('[data-testid^="segment-tab-"]').count();
    if (tabCount > 1) {
      // Click second tab
      const secondTab = page.locator('[data-testid="segment-tab-1"]');
      await secondTab.click();
      await page.waitForTimeout(500);

      // Segment header should update
      const segmentHeader = page.locator('[data-testid="segment-header"]');
      await expect(segmentHeader).toBeVisible();
    }
  });

  test("can scroll through activities on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(TRIP_URL);
    await page.waitForSelector('[data-testid="browse-page"]', { timeout: 15000 });

    // Scroll down to check more content loads/renders
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(300);

    // Activity cards should still be present after scroll
    const activityCards = page.locator('[data-testid="browse-activity-card"]');
    const cardCount = await activityCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Take scrolled screenshot
    await page.screenshot({ path: "tests/screenshots/browse-mobile-scrolled.png", fullPage: false });
  });
});
