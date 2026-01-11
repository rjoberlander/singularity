import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Test for Portugal Summer 2026 Skeleton Import
 * Uses the actual skeleton file from Downloads
 */

// Helper function to login
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Portugal Skeleton Import", () => {
  test("should import portugal-summer-2026-skeleton.json successfully", async ({
    page,
  }) => {
    // Login
    await login(page);

    // Navigate to import page
    await page.goto("http://localhost:3000/travel/import");
    await page.waitForLoadState("networkidle");

    // Read the actual skeleton file
    const skeletonPath = "/Users/rich/Downloads/portugal-summer-2026-skeleton.json";
    const skeletonContent = fs.readFileSync(skeletonPath, "utf-8");
    const skeleton = JSON.parse(skeletonContent);

    // Paste JSON into textarea
    const jsonTextarea = page.locator("textarea");
    await jsonTextarea.fill(skeletonContent);

    // Click Validate
    const validateButton = page.getByRole("button", { name: /validate/i });
    await validateButton.click();

    // Wait for validation to complete
    await expect(
      page.getByText("Trip Skeleton Parsed", { exact: false })
    ).toBeVisible({ timeout: 5000 });

    // Verify skeleton details are shown
    await expect(
      page.locator("p.font-medium").filter({ hasText: "Portugal Summer 2026" })
    ).toBeVisible();
    await expect(page.getByText("7 segment shells")).toBeVisible();

    // Click Import
    const importButton = page.getByRole("button", {
      name: /import trip skeleton/i,
    });
    await importButton.click();

    // Wait for redirect to trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+$/, { timeout: 15000 });

    // Verify we're on the trip page
    await expect(page.getByText("Portugal Summer 2026")).toBeVisible({
      timeout: 5000,
    });

    // Verify all 7 segments are displayed
    await expect(page.getByRole("heading", { name: "Lisbon" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alentejo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sagres & Lagos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Douro Valley" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Porto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Peneda-Gerês" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Airport Hotel" })).toBeVisible();

    // Take a screenshot for verification
    await page.screenshot({
      path: "test-results/portugal-skeleton-import-success.png",
      fullPage: true,
    });

    console.log("Successfully imported Portugal Summer 2026 with 7 segments!");
  });
});
