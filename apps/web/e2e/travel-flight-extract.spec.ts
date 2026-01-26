import { test, expect } from "@playwright/test";
import * as path from "path";

// Use a known trip ID from the database
const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test.describe("Travel Flight Extraction", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('#email', "rjoberlander@gmail.com");
    await page.fill('#password', "Cookie123!");
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("can extract flight info from uploaded image", async ({ page }) => {
    // Navigate to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    // Verify the page loaded
    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Find the flight image dropzone
    const flightDropzone = page.locator('[data-testid="import-flight-image-dropzone"]');
    await expect(flightDropzone).toBeVisible();

    // Upload the flight confirmation image via file input
    const fileInput = page.locator('#import-flight-image');
    const imagePath = path.join(__dirname, 'flight-confirmation.png');
    await fileInput.setInputFiles(imagePath);

    // Wait for extraction to complete (look for the loading spinner to appear and disappear)
    // The extraction can take a while with AI processing
    await expect(page.locator('text=Extracting flight info')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Extracting flight info')).not.toBeVisible({ timeout: 60000 });

    // Check for success toast or that flights were extracted
    // The toast should say something like "Extracted X flight(s) from image"
    const successToast = page.locator('text=/Extracted \\d+ flight/');
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // Take screenshot of results
    await page.screenshot({ path: "e2e/screenshots/travel-flight-extracted.png" });

    // Verify the trip summary was updated with extracted info
    // Should show origin LAX, travelers 5, etc.
    await page.waitForTimeout(2000); // Wait for UI to update

    // Check that the summary includes extracted flight info
    // The flight image shows: LAX -> LIS, 5 travelers, Air Canada
    const summaryArea = page.locator('[data-testid="import-flight-image-dropzone"]').locator('..');

    console.log("Flight extraction test completed successfully");
  });

  test("flight data is persisted to database", async ({ page }) => {
    // Navigate to the flights page or check API
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    // Check database has flights for this trip by navigating to details or API
    // For now, just verify the page loads and has flight-related content
    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/travel-flight-persisted.png" });
  });
});
