import { test, expect } from "@playwright/test";

/**
 * Test to verify deep_dive JSONB content displays correctly in activity detail
 */

async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Verify Deep Dive Content Display", () => {
  test("should display structured deep_dive content properly", async ({ page }) => {
    await login(page);

    // Navigate to Portugal trip details
    await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
    await page.waitForLoadState("networkidle");

    // Take screenshot of trip overview
    await page.screenshot({ path: "test-results/portugal-trip-overview.png" });

    // Click on Day 2 (Sintra) to expand it
    const day2 = page.locator("text=Sintra's Fairy-Tale Palaces");
    await day2.click();
    await page.waitForTimeout(500);

    // Click on Pena Palace activity
    const penaPalace = page.locator("text=Pena Palace").first();
    await penaPalace.click();
    await page.waitForTimeout(1000);

    // Take screenshot of activity detail panel
    await page.screenshot({ path: "test-results/pena-palace-detail.png" });

    // Verify "What It Is" section is visible (not raw JSON)
    const whatItIs = page.locator("text=What It Is");
    await expect(whatItIs).toBeVisible({ timeout: 5000 });

    // Verify "Why It Matters" section shows readable content (not JSON)
    const whyItMatters = page.locator("text=Why It Matters");
    await expect(whyItMatters).toBeVisible();

    // Verify we DON'T see raw JSON like '{"the_story":'
    const rawJson = page.locator('text={"the_story":');
    await expect(rawJson).not.toBeVisible();

    // Verify we see actual content about Ferdinand (use .first() since multiple matches)
    const ferdinandContent = page.locator("text=Ferdinand").first();
    await expect(ferdinandContent).toBeVisible();

    // Take final screenshot
    await page.screenshot({ path: "test-results/pena-palace-deep-dive-verified.png" });

    console.log("Deep dive content displays correctly - no raw JSON visible");
  });
});
