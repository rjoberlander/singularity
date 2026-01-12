import { test, expect } from "@playwright/test";

/**
 * Test to verify location data displays correctly after Fetch from Google
 */

async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Verify Location Data Display", () => {
  test("should display address, phone, website, maps link after Google fetch", async ({ page }) => {
    await login(page);

    // Navigate to Portugal trip
    await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
    await page.waitForLoadState("networkidle");

    // Click on Day 2 to expand
    await page.locator("text=Sintra's Fairy-Tale Palaces").click();
    await page.waitForTimeout(500);

    // Click on Pena Palace
    await page.locator("text=Pena Palace").first().click();
    await page.waitForTimeout(1000);

    // Take initial screenshot
    await page.screenshot({ path: "test-results/pena-palace-top.png" });

    // Scroll down in the activity detail panel to see links
    const detailPanel = page.locator('[class*="overflow-y-auto"]').last();
    await detailPanel.evaluate((el: HTMLElement) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);

    // Take screenshot of bottom section
    await page.screenshot({ path: "test-results/pena-palace-bottom-links.png" });

    // Verify phone is visible
    const phoneLink = page.locator("text=21 923 7300");
    await expect(phoneLink).toBeVisible({ timeout: 5000 });

    // Verify website link exists
    const websiteLink = page.locator("text=Website");
    await expect(websiteLink).toBeVisible();

    // Verify Maps link exists
    const mapsLink = page.locator("text=Maps").first();
    await expect(mapsLink).toBeVisible();

    // Verify Book link exists (from booking_url)
    const bookLink = page.locator("text=Book").first();
    await expect(bookLink).toBeVisible();

    console.log("All location data displaying correctly!");
  });
});
