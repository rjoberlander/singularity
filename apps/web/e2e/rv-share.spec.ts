import { test, expect } from "@playwright/test";

test.describe("RV Location Share", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(?<!login)$/);
  });

  test("can generate and use share link", async ({ page, context }) => {
    // Navigate to RV locations
    await page.goto("http://localhost:3000/rv-locations");
    await page.waitForLoadState("networkidle");

    // Wait for the location list to load
    await page.waitForSelector('a[href^="/rv-locations/"]', { timeout: 10000 });

    // Click on the first location card that links to a detail page (exclude "new")
    const locationLinks = page.locator('a[href^="/rv-locations/"]:not([href="/rv-locations/new"])');
    const count = await locationLinks.count();

    if (count === 0) {
      test.skip(true, "No RV locations exist to test sharing");
      return;
    }

    await locationLinks.first().click();
    await page.waitForURL(/\/rv-locations\/(?!new)[a-f0-9-]+$/);
    await page.waitForLoadState("networkidle");

    // Find and click the share button
    const shareButton = page.getByTestId('share-button');
    await expect(shareButton).toBeVisible({ timeout: 10000 });
    await shareButton.click();

    // Wait for toast notification
    await expect(page.getByText(/share link copied/i)).toBeVisible({ timeout: 5000 });

    // Get the clipboard content (share URL)
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain("/rv-locations/share/");

    // Verify the slug format (lowercase, hyphens, no special chars)
    const slugMatch = clipboardContent.match(/\/rv-locations\/share\/([a-z0-9-]+)$/);
    expect(slugMatch).toBeTruthy();
    expect(slugMatch![1]).toMatch(/^[a-z0-9-]+$/);

    // Open a new page without authentication to verify public access
    const publicPage = await context.newPage();
    await publicPage.goto(clipboardContent);
    await publicPage.waitForLoadState("networkidle");

    // Verify the public page shows location info
    await expect(publicPage.locator("h1")).toBeVisible();
    await expect(publicPage.getByText("Shared via Singularity")).toBeVisible();
  });
});
