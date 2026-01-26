import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const SKELETON_PATH = "/Users/richard/Downloads/portugal-summer-2026-trip-skeleton.json";

test.describe("Skeleton Import Date Fix Verification", () => {
  test("import skeleton and verify trip dates are updated to June 15", async ({ page }) => {
    // Read the skeleton file to know what dates to expect
    const skeletonContent = fs.readFileSync(SKELETON_PATH, "utf-8");
    const skeleton = JSON.parse(skeletonContent);
    const expectedStartDate = skeleton.trip.start_date; // "2026-06-15"
    const expectedEndDate = skeleton.trip.end_date; // "2026-07-14"

    console.log(`\n=== SKELETON FILE DATES ===`);
    console.log(`Expected start_date: ${expectedStartDate}`);
    console.log(`Expected end_date: ${expectedEndDate}`);

    // Login
    await page.goto("http://localhost:3000/login");
    await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Capture API responses to verify data
    let tripDataBefore: any = null;
    let tripDataAfter: any = null;

    page.on("response", async (response) => {
      if (response.url().includes(`/travel/trips/${TRIP_ID}/full`)) {
        try {
          const json = await response.json();
          if (!tripDataBefore) {
            tripDataBefore = json;
          } else {
            tripDataAfter = json;
          }
        } catch {}
      }
    });

    // Go to Plan page first to capture initial data
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    if (tripDataBefore) {
      console.log(`\n=== TRIP DATA BEFORE IMPORT ===`);
      console.log(`Trip start_date: ${tripDataBefore.data?.start_date}`);
      console.log(`Trip end_date: ${tripDataBefore.data?.end_date}`);
    }

    // Take screenshot before import
    await page.screenshot({ path: "e2e/screenshots/skeleton-import-before.png", fullPage: true });

    // Find the Trip Basics card and the skeleton drop zone
    // The Trip Basics step has an import skeleton drop zone
    const tripBasicsCard = page.locator('text=Trip Basics').first();
    await expect(tripBasicsCard).toBeVisible({ timeout: 10000 });

    // Look for the drop zone or import button in Trip Basics section
    // The skeleton import is triggered by file input - we need to find it
    const fileInput = page.locator('input[type="file"][accept=".json"]').first();

    // Check if file input exists, if not we may need to trigger it via drag-drop
    const fileInputExists = await fileInput.count() > 0;

    if (fileInputExists) {
      console.log("Found file input, uploading skeleton...");
      await fileInput.setInputFiles(SKELETON_PATH);
    } else {
      // Try to find a skeleton import button or drop zone
      console.log("No file input found, looking for skeleton import area...");

      // The skeleton drop zone should have text about dropping skeleton
      const dropZone = page.locator('text=/Drop.*skeleton|Import.*skeleton/i').first();
      if (await dropZone.isVisible().catch(() => false)) {
        console.log("Found drop zone text");
      }

      // Take screenshot to see what's available
      await page.screenshot({ path: "e2e/screenshots/skeleton-import-no-input.png", fullPage: true });
    }

    // Wait for the import dialog to appear
    await page.waitForTimeout(1000);

    // Look for the confirmation dialog
    const importDialog = page.locator('text=Import Trip Skeleton');
    if (await importDialog.isVisible().catch(() => false)) {
      console.log("Import dialog appeared, confirming...");

      // Click the Import Segments button
      const importButton = page.locator('button:has-text("Import Segments")');
      await expect(importButton).toBeVisible({ timeout: 5000 });
      await importButton.click();

      // Wait for import to complete
      await page.waitForTimeout(3000);
    } else {
      console.log("Import dialog did not appear");
    }

    // Take screenshot after import attempt
    await page.screenshot({ path: "e2e/screenshots/skeleton-import-after.png", fullPage: true });

    // Refresh the page to get fresh data
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check the dates in the UI header card
    // The layout shows dates like "Jun 15 - Jul 14, 2026"
    const datesSection = page.locator('text=/Jun.*15.*-.*Jul.*14/');
    const hasCorrectDates = await datesSection.isVisible().catch(() => false);

    if (hasCorrectDates) {
      console.log("\n=== SUCCESS: UI shows correct dates (Jun 15 - Jul 14) ===");
    } else {
      // Check what dates are actually showing
      const dateText = await page.locator('.font-medium:near(:text("Dates"))').textContent().catch(() => null);
      console.log(`\n=== DATES IN UI: ${dateText} ===`);
    }

    // Final screenshot
    await page.screenshot({ path: "e2e/screenshots/skeleton-import-final.png", fullPage: true });

    // Verify by checking the API response
    if (tripDataAfter) {
      console.log(`\n=== TRIP DATA AFTER IMPORT ===`);
      console.log(`Trip start_date: ${tripDataAfter.data?.start_date}`);
      console.log(`Trip end_date: ${tripDataAfter.data?.end_date}`);

      // Assert the dates match
      expect(tripDataAfter.data?.start_date).toBe(expectedStartDate);
      expect(tripDataAfter.data?.end_date).toBe(expectedEndDate);
    }
  });

  test("verify current trip dates via API", async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    let tripData: any = null;

    page.on("response", async (response) => {
      if (response.url().includes(`/travel/trips/${TRIP_ID}/full`)) {
        try {
          tripData = await response.json();
        } catch {}
      }
    });

    // Go to the trip page
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    console.log("\n=== CURRENT TRIP DATES ===");
    if (tripData?.data) {
      console.log(`Trip ID: ${tripData.data.id}`);
      console.log(`Trip name: ${tripData.data.name}`);
      console.log(`Start date: ${tripData.data.start_date}`);
      console.log(`End date: ${tripData.data.end_date}`);
      console.log(`Traveler count: ${tripData.data.traveler_count}`);
      console.log(`Destination: ${tripData.data.destination}`);

      console.log("\n=== SEGMENT DATES ===");
      for (const seg of tripData.data.segments || []) {
        console.log(`  ${seg.segment_number}. ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
      }
    } else {
      console.log("No trip data captured");
    }

    // Take screenshot showing the dates in the UI
    await page.screenshot({ path: "e2e/screenshots/current-trip-dates.png", fullPage: true });
  });
});
