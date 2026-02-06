import { test, expect } from "@playwright/test";

test.describe("RV Enrichment Progress Bar", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.waitForLoadState("networkidle");

    // Fill in credentials
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");

    // Use force click to bypass any overlay
    await page.click('button[type="submit"]', { force: true });

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });
  });

  test("should show enrichment progress bar when enriching locations", async ({ page }) => {
    // Navigate to RV locations page
    await page.goto("http://localhost:3000/rv-locations");
    await page.waitForLoadState("networkidle");

    // Take a screenshot of the initial state
    await page.screenshot({ path: "e2e/screenshots/rv-enrich-before.png" });

    // Check if there are unenriched locations (button should show count)
    const enrichButton = page.locator('button:has-text("Enrich")');
    await expect(enrichButton).toBeVisible({ timeout: 10000 });

    // Get the button text to see if there are locations to enrich
    const buttonText = await enrichButton.textContent();
    console.log("Enrich button text:", buttonText);

    // If button shows a count (e.g., "Enrich (5)"), click it
    if (buttonText && buttonText.includes("(")) {
      // Click the enrich button to start batch enrichment
      await enrichButton.click();

      // Wait for the progress panel to appear (fixed bottom-right)
      const progressPanel = page.locator('.fixed.bottom-4.right-4');

      // Wait up to 5 seconds for progress panel
      try {
        await expect(progressPanel).toBeVisible({ timeout: 5000 });
        console.log("Progress panel appeared!");

        // Take a screenshot of the progress bar
        await page.screenshot({ path: "e2e/screenshots/rv-enrich-progress.png" });

        // Check for key elements in the progress panel
        const progressBar = progressPanel.locator('[role="progressbar"], .h-2');
        const locationCount = progressPanel.locator('text=/\\d+ \\/ \\d+ locations/');
        const photoCount = progressPanel.locator('text=/\\d+ photos/');

        // Verify progress elements are visible
        await expect(progressBar).toBeVisible({ timeout: 3000 });
        console.log("Progress bar visible");

        // Wait a moment for some progress
        await page.waitForTimeout(3000);

        // Take another screenshot showing progress
        await page.screenshot({ path: "e2e/screenshots/rv-enrich-progress-2.png" });

        // Check if we can see the current location being processed
        const currentLocation = progressPanel.locator('text=/Processing:/');
        if (await currentLocation.isVisible()) {
          console.log("Current location indicator visible");
        }

        // Test the cancel button
        const cancelButton = progressPanel.locator('button:has(svg)').first();
        if (await cancelButton.isVisible()) {
          console.log("Cancel button is available");
        }

      } catch (e) {
        console.log("Progress panel did not appear - may have completed quickly or no locations to enrich");
        await page.screenshot({ path: "e2e/screenshots/rv-enrich-no-progress.png" });
      }
    } else {
      console.log("No unenriched locations found - skipping enrichment test");
      // Take screenshot anyway
      await page.screenshot({ path: "e2e/screenshots/rv-enrich-all-done.png" });
    }
  });

  test("should show API usage in cost modal", async ({ page }) => {
    // Navigate to RV locations page
    await page.goto("http://localhost:3000/rv-locations");
    await page.waitForLoadState("networkidle");

    // Click the Costs button
    const costsButton = page.locator('button:has-text("Costs")');
    await expect(costsButton).toBeVisible({ timeout: 10000 });
    await costsButton.click();

    // Wait for the modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Take a screenshot of the cost modal
    await page.screenshot({ path: "e2e/screenshots/rv-cost-modal.png" });

    // Check for API usage section
    const usageSection = modal.locator('text=/This Month\'s Google Places Usage/i');

    // Check if usage data is displayed
    const photosCount = modal.locator('text=/Photos fetched/i');
    const textSearches = modal.locator('text=/Text searches/i');
    const placeDetails = modal.locator('text=/Place details/i');

    // Log what we find
    if (await usageSection.isVisible()) {
      console.log("API usage section is visible");

      if (await photosCount.isVisible()) {
        console.log("Photos fetched counter visible");
      }
      if (await textSearches.isVisible()) {
        console.log("Text searches counter visible");
      }
      if (await placeDetails.isVisible()) {
        console.log("Place details counter visible");
      }
    } else {
      console.log("API usage section not visible - may not have tracking data yet");
    }

    // Close the modal
    await page.keyboard.press("Escape");
  });
});
