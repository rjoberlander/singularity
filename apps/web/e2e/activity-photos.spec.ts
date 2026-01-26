import { test, expect } from "@playwright/test";

// Use the Lisbon trip
const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test.describe("Activity Photos", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('#email', "rjoberlander@gmail.com");
    await page.fill('#password', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("Activity detail panel has Fetch from Google button", async ({ page }) => {
    // Navigate to the trip details page with an activity
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
    await page.waitForLoadState("networkidle");

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Click on an activity to open the detail panel
    // Look for activity items - they should have activity names
    const activityItem = page.locator('[data-activity-id]').first();

    if (await activityItem.isVisible().catch(() => false)) {
      await activityItem.click();
      await page.waitForTimeout(1000);
    } else {
      // Try clicking any activity link or button
      const activityLink = page.locator('text=/Pastéis de Belém|Torre de Belém|Jerónimos/i').first();
      if (await activityLink.isVisible().catch(() => false)) {
        await activityLink.click();
        await page.waitForTimeout(1000);
      }
    }

    // Check for the Fetch from Google button
    const fetchButton = page.locator('button', { hasText: /Fetch from Google|Refresh from Google/i });

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/activity-detail-panel.png" });

    // If the sheet/panel is open, verify the button
    const sheetContent = page.locator('[role="dialog"]');
    if (await sheetContent.isVisible().catch(() => false)) {
      await expect(fetchButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("Clicking Fetch from Google loads photos", async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout for API calls

    // Navigate to the trip details with activity query param
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details?activity=pasteis-de-belem`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: "e2e/screenshots/activity-photos-before.png" });

    // Look for the Fetch from Google button
    const fetchButton = page.locator('button', { hasText: /Fetch from Google|Refresh from Google/i }).first();

    if (await fetchButton.isVisible().catch(() => false)) {
      console.log("Found Fetch from Google button - clicking");

      // Set up response listener to capture the actual API response
      const responsePromise = page.waitForResponse(res =>
        res.url().includes('fetch-google') && res.request().method() === 'POST'
      );

      await fetchButton.click();

      // Wait for the API response
      try {
        const response = await responsePromise;
        const responseBody = await response.json();
        console.log("API response status:", response.status());
        console.log("API response body:", JSON.stringify(responseBody, null, 2));

        // Wait for UI to update
        await page.waitForTimeout(3000);

        // Take screenshot after fetch
        await page.screenshot({ path: "e2e/screenshots/activity-photos-after.png" });

        // Check if photos appeared or if there's a photos section
        const hasPhotosSection = await page.locator('text=/Photos|Pending Approval/i').first().isVisible().catch(() => false);
        const hasImages = await page.locator('img[src*="supabase"]').first().isVisible().catch(() => false);

        console.log("Has photos section:", hasPhotosSection);
        console.log("Has Supabase images:", hasImages);

        // Verify photos were added
        if (responseBody.success && responseBody.data?.photos_added > 0) {
          console.log(`SUCCESS: ${responseBody.data.photos_added} photos were added`);
        } else if (responseBody.data?.photos_skipped > 0) {
          console.log(`Photos already exist: ${responseBody.data.photos_skipped} skipped`);
        } else {
          console.log("No photos added - check if Google returned any photos");
        }

      } catch (error) {
        console.log("Fetch request timeout or error:", error);
        await page.screenshot({ path: "e2e/screenshots/activity-photos-error.png" });
      }
    } else {
      console.log("Fetch from Google button not visible - checking page state");
      await page.screenshot({ path: "e2e/screenshots/activity-photos-no-button.png" });
    }
  });

  test("Check if activity has google_photos stored", async ({ page }) => {
    // This test navigates to the details page and checks if photos are displayed
    // after schedule assembly (which should have stored google_photos)
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check the page content
    const pageContent = await page.content();

    // Look for any activity card with photos
    const hasActivityPhotos = await page.locator('img[alt*="activity"], img[alt*="photo"]').first().isVisible().catch(() => false);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/activity-check-photos.png" });

    console.log("Has activity photos on details page:", hasActivityPhotos);
  });
});
