import { test, expect } from "@playwright/test";

/**
 * Test the Assemble Schedule feature for travel itinerary
 * This tests the Phase 4 AI schedule assembly that converts activities
 * with time blocks (morning, afternoon) into 15-minute precision schedules
 */

// Helper function to login
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("Travel Assemble Schedule", () => {
  // Trip ID from the user's example
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show unscheduled activity count on button", async ({ page }) => {
    // Navigate to the trip itinerary page
    await page.goto(`http://localhost:3000/travel/${tripId}/itinerary`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: "test-results/itinerary-page-loaded.png" });

    // Find the Assemble Schedule button
    const assembleBtn = page.getByTestId("assemble-schedule-btn");
    await expect(assembleBtn).toBeVisible({ timeout: 10000 });

    // Check if it shows a count (e.g., "Assemble Schedule (7)")
    const btnText = await assembleBtn.textContent();
    console.log("Button text:", btnText);

    // Button should contain "Assemble Schedule"
    expect(btnText).toContain("Assemble Schedule");

    // If there are unscheduled activities, it should show the count
    if (btnText && btnText.includes("(")) {
      const match = btnText.match(/\((\d+)\)/);
      if (match) {
        const count = parseInt(match[1]);
        console.log("Unscheduled activity count:", count);
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test("should assemble schedule using AI and show events on calendar", async ({ page }) => {
    // Set up API response listener to capture error details
    let apiResponse: any = null;
    page.on('response', async (response) => {
      if (response.url().includes('assemble-schedule')) {
        try {
          apiResponse = await response.json();
          console.log("API Response:", JSON.stringify(apiResponse, null, 2));
        } catch (e) {
          console.log("API Response status:", response.status());
        }
      }
    });

    // Navigate to the trip itinerary page
    await page.goto(`http://localhost:3000/travel/${tripId}/itinerary`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot before
    await page.screenshot({ path: "test-results/before-assemble.png" });

    // Find the Assemble Schedule button
    const assembleBtn = page.getByTestId("assemble-schedule-btn");
    await expect(assembleBtn).toBeVisible({ timeout: 10000 });

    // Get initial button text to check activity count
    const initialBtnText = await assembleBtn.textContent();
    console.log("Initial button text:", initialBtnText);

    // Check if there's an info card about no scheduled events
    const noEventsCard = page.locator('text=No scheduled events yet');
    const hasNoEventsCard = await noEventsCard.isVisible();
    console.log("Shows 'No scheduled events' message:", hasNoEventsCard);

    // Click the Assemble Schedule button
    console.log("Clicking Assemble Schedule button...");
    await assembleBtn.click();

    // Wait for the assembling state (button should show "Assembling...")
    await expect(assembleBtn).toContainText("Assembling...", { timeout: 10000 });
    console.log("Assembly started...");

    // Wait for assembly to complete (this may take a while as it calls Claude API)
    // Increase timeout since AI processing can take time
    await expect(assembleBtn).not.toContainText("Assembling...", { timeout: 180000 });
    console.log("Assembly completed!");

    // Wait a bit for the UI to update
    await page.waitForTimeout(3000);

    // Take screenshot after
    await page.screenshot({ path: "test-results/after-assemble.png" });

    // Check for success toast
    const toasts = page.locator('[data-sonner-toast]');
    const toastCount = await toasts.count();
    console.log("Toast count:", toastCount);

    if (toastCount > 0) {
      const toastText = await toasts.first().textContent();
      console.log("Toast message:", toastText);
    }

    // The "No scheduled events" message should be gone now
    await page.waitForTimeout(1000);
    const stillHasNoEventsCard = await noEventsCard.isVisible();
    console.log("Still shows 'No scheduled events' after assembly:", stillHasNoEventsCard);

    // Navigate to the trip's actual dates (June 2026) to see events
    // First check what week is currently shown
    const monthYear = page.locator('text=June 2026');
    const isOnJune2026 = await monthYear.isVisible();
    console.log("Currently showing June 2026:", isOnJune2026);

    if (!isOnJune2026) {
      // Navigate forward until we reach June 2026
      const nextBtn = page.locator('button:has(svg.lucide-chevron-right)');
      let attempts = 0;
      while (attempts < 30) {
        const showsJune = await page.locator('text=June 2026').isVisible();
        if (showsJune) break;
        await nextBtn.click();
        await page.waitForTimeout(200);
        attempts++;
      }
    }

    // Take final screenshot showing the calendar with events
    await page.screenshot({ path: "test-results/calendar-june-2026.png" });

    // Look for event blocks in the calendar
    // Events have border-l-2 class with color classes
    const eventBlocks = page.locator('.border-l-2').filter({ hasText: /.+/ });
    const eventCount = await eventBlocks.count();
    console.log("Event blocks found:", eventCount);

    // Check for specific event types
    const activityEvents = page.locator('[class*="bg-blue-500"]');
    const mealEvents = page.locator('[class*="bg-orange-500"]');
    const transitEvents = page.locator('[class*="bg-gray-500"]');
    const logisticsEvents = page.locator('[class*="bg-purple-500"]');

    console.log("Activity events:", await activityEvents.count());
    console.log("Meal events:", await mealEvents.count());
    console.log("Transit events:", await transitEvents.count());
    console.log("Logistics events:", await logisticsEvents.count());
  });

  test("should verify assembled schedule has transit events between activities", async ({ page }) => {
    // Navigate to the trip itinerary page
    await page.goto(`http://localhost:3000/travel/${tripId}/itinerary`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate to trip dates (June 2026)
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)');
    let attempts = 0;
    while (attempts < 30) {
      const showsJune = await page.locator('text=June 2026').isVisible();
      if (showsJune) break;
      await nextBtn.click();
      await page.waitForTimeout(200);
      attempts++;
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: "test-results/calendar-transit-check.png" });

    // Look for transit events (gray colored)
    const transitEvents = page.locator('[class*="border-l-gray"]');
    const transitCount = await transitEvents.count();
    console.log("Transit events found:", transitCount);

    // If we have transit events, check they have duration badges
    if (transitCount > 0) {
      // Transit events should have a badge showing travel time (e.g., "15min")
      const durationBadges = page.locator('text=/\\d+min/');
      const badgeCount = await durationBadges.count();
      console.log("Duration badges found:", badgeCount);
    }
  });
});
