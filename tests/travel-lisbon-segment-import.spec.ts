import { test, expect } from "@playwright/test";
import * as fs from "fs";

/**
 * Test for importing Lisbon segment research into existing Portugal trip
 */

// Helper function to login
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Lisbon Segment Research Import", () => {
  test("should import segment-1-lisbon-research.json into existing Portugal trip", async ({
    page,
  }) => {
    // Login
    await login(page);

    // Navigate to import page
    await page.goto("http://localhost:3000/travel/import");
    await page.waitForLoadState("networkidle");

    // Read the segment research file
    const segmentPath = "/Users/rich/Downloads/segment-1-lisbon-research.json";
    const segmentContent = fs.readFileSync(segmentPath, "utf-8");

    // Paste JSON into textarea
    const jsonTextarea = page.locator("textarea");
    await jsonTextarea.fill(segmentContent);

    // Click Validate
    const validateButton = page.getByRole("button", { name: /validate/i });
    await validateButton.click();

    // Wait for validation - should detect as segment research
    await expect(page.getByText("Detected: Segment Research")).toBeVisible({ timeout: 5000 });

    // Take screenshot of detected state
    await page.screenshot({ path: "test-results/lisbon-segment-detected.png" });

    // Select "Segment Research → Existing Trip" mode
    const existingTripRadio = page.getByText("Segment Research → Existing Trip");
    await existingTripRadio.click();

    // Select the Portugal Summer 2026 trip from dropdown
    const tripSelect = page.locator('button[role="combobox"]').first();
    await tripSelect.click();
    await page.getByRole("option", { name: /Portugal Summer 2026/i }).click();

    // Wait for segments to load, then select Lisbon segment
    await page.waitForTimeout(1000); // Wait for segments to load

    // Find and click the segment dropdown
    const segmentSelect = page.locator('button[role="combobox"]').nth(1);
    await segmentSelect.click();
    await page.getByRole("option", { name: /Lisbon/i }).click();

    // Take screenshot before import
    await page.screenshot({ path: "test-results/lisbon-segment-ready.png" });

    // Scroll down to see the import button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Take another screenshot to see the bottom of the page
    await page.screenshot({ path: "test-results/lisbon-segment-scrolled.png" });

    // Click Import button - it says "Import to Portugal Summer 2026"
    const importButton = page.getByRole("button", { name: /import to portugal/i });
    await importButton.click();

    // Wait for import to complete - should redirect or show success
    await page.waitForTimeout(5000);

    // Take screenshot of result
    await page.screenshot({ path: "test-results/lisbon-segment-imported.png" });

    // Check for success (either redirected to trip page or shows success message)
    const currentUrl = page.url();
    console.log("Final URL:", currentUrl);

    // If still on import page, check for success/error messages
    if (currentUrl.includes("/import")) {
      const pageContent = await page.content();
      console.log("Page still on import - checking for messages...");

      // Look for any toast or error messages
      const toasts = page.locator('[data-sonner-toast]');
      const toastCount = await toasts.count();
      console.log("Toast count:", toastCount);
    }
  });
});
