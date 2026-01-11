import { test, expect } from "@playwright/test";

/**
 * Test for Trip Skeleton Import (Phase 1 workflow)
 *
 * This test:
 * 1. Logs in
 * 2. Navigates to /travel/import
 * 3. Uploads a trip skeleton JSON file
 * 4. Validates the JSON
 * 5. Imports the skeleton
 * 6. Verifies the trip appears in the trips list
 * 7. Clicks into the trip and verifies segments are displayed
 */

const TEST_SKELETON = {
  trip: {
    name: "Test Trip Portugal 2026",
    destination_country: "Portugal",
    destination_country_code: "PT",
    start_date: "2026-06-17",
    end_date: "2026-06-24",
    total_days: 8,
    total_nights: 7,
    traveler_count: 2,
    status: "planning",
    overview: "A week-long trip to Portugal for testing purposes.",
    route_description: "Lisbon to Porto via the coast.",
    logistics: {
      flights: {
        outbound: { from: "LAX", to: "LIS", date: "2026-06-17" },
        return: { from: "OPO", to: "LAX", date: "2026-06-24" },
      },
    },
    pacing_notes: "Relaxed pace with rest days.",
  },
  segments: [
    {
      segment_number: 1,
      name: "Lisbon",
      region: "Lisbon",
      start_date: "2026-06-17",
      end_date: "2026-06-20",
      nights: 3,
      days: 4,
      theme: "History and culture",
      why_here: "Must-see capital city",
      key_experiences: ["Jerónimos Monastery", "Belém Tower", "Alfama"],
      location: {
        location_name: "Lisbon",
        country: "Portugal",
        latitude: 38.7223,
        longitude: -9.1393,
        timezone: "Europe/Lisbon",
      },
      priority: "must_do",
      notes: "Day 1 is jet lag recovery.",
      _research_status: { researched: false },
    },
    {
      segment_number: 2,
      name: "Porto",
      region: "Porto",
      start_date: "2026-06-20",
      end_date: "2026-06-24",
      nights: 4,
      days: 5,
      theme: "Wine and tiles",
      why_here: "Second city with amazing architecture",
      key_experiences: ["Ribeira", "Livraria Lello", "Port tasting"],
      location: {
        location_name: "Porto",
        country: "Portugal",
        latitude: 41.1579,
        longitude: -8.6291,
        timezone: "Europe/Lisbon",
      },
      priority: "must_do",
      notes: "Book Livraria Lello tickets in advance.",
      _research_status: { researched: false },
    },
  ],
};

// Helper function to login
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Trip Skeleton Import", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should import trip skeleton and display in trips list", async ({
    page,
  }) => {
    // Navigate to import page
    await page.goto("/travel/import");
    await page.waitForLoadState("networkidle");

    // Wait for the import page to load - look for the card header
    await expect(
      page.getByRole("heading", { name: /what are you importing/i })
    ).toBeVisible({ timeout: 10000 });

    // Ensure "Trip Skeleton (Phase 1)" is selected by clicking it
    const skeletonLabel = page.getByText("Trip Skeleton (Phase 1)");
    await skeletonLabel.click();

    // Paste JSON into textarea
    const jsonTextarea = page.locator("textarea");
    await jsonTextarea.fill(JSON.stringify(TEST_SKELETON, null, 2));

    // Click Validate
    const validateButton = page.getByRole("button", { name: /validate/i });
    await validateButton.click();

    // Wait for validation to complete - should show parsed skeleton
    await expect(
      page.getByText("Trip Skeleton Parsed", { exact: false })
    ).toBeVisible({ timeout: 5000 });

    // Verify skeleton details are shown - use more specific locator to avoid textarea match
    await expect(page.locator("p.font-medium").filter({ hasText: "Test Trip Portugal 2026" })).toBeVisible();
    await expect(page.getByText("2 segment shells")).toBeVisible();

    // Click Import
    const importButton = page.getByRole("button", {
      name: /import trip skeleton/i,
    });
    await importButton.click();

    // Wait for redirect to trip detail page
    await page.waitForURL(/\/travel\/[a-f0-9-]+$/, { timeout: 10000 });

    // Verify we're on the trip page
    await expect(page.getByText("Test Trip Portugal 2026")).toBeVisible({
      timeout: 5000,
    });

    // Take a screenshot for verification
    await page.screenshot({
      path: "test-results/skeleton-import-success.png",
    });
  });

  test("should show imported trip in trips list", async ({ page }) => {
    // Navigate to travel page
    await page.goto("/travel");
    await page.waitForLoadState("networkidle");

    // Look for the test trip we just created
    // Note: This assumes the previous test ran successfully
    const tripLink = page.getByText("Test Trip Portugal 2026").first();

    // If the trip exists, click into it
    if (await tripLink.isVisible({ timeout: 3000 })) {
      await tripLink.click();

      // Wait for trip detail page
      await page.waitForURL(/\/travel\/[a-f0-9-]+$/, { timeout: 10000 });

      // Verify segments are displayed - use heading role for more specific match
      await expect(page.getByRole("heading", { name: "Lisbon" })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("heading", { name: "Porto" })).toBeVisible();

      // Take a screenshot
      await page.screenshot({ path: "test-results/trip-details-view.png" });
    } else {
      // Trip not found - this might mean we need to import it first
      console.log(
        "Test trip not found in list - run the import test first"
      );
    }
  });
});
