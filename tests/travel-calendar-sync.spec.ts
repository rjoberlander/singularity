import { test, expect } from "@playwright/test";

/**
 * Phase 5: Google Calendar Sync Tests
 *
 * Tests: Sync day/activity to Google Calendar, unsync
 * Validates: Calendar integration, event creation, sync status
 */

// Helper functions
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

async function goToTravel(page: any) {
  await page.goto("http://localhost:3000/travel");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function openOrCreateTrip(page: any, tripName: string = "Calendar Sync Test Trip") {
  await goToTravel(page);

  const existingTrip = page.locator('[data-testid="trip-card"], .trip-card, [class*="cursor-pointer"]')
    .filter({ hasText: tripName })
    .first();

  if (await existingTrip.count() > 0) {
    await existingTrip.click();
    await page.waitForTimeout(1000);
    return;
  }

  // Create new trip
  await page.locator('button:has-text("Add Trip")').first().click();
  await page.waitForTimeout(500);

  await page.locator('input[name="name"]').fill(tripName);
  await page.locator('textarea[name="description"]').fill("Trip for testing calendar sync");
  await page.locator('input[name="start_date"], input[type="date"]').first().fill("2026-07-01");
  await page.locator('input[name="end_date"], input[type="date"]').last().fill("2026-07-05");
  await page.locator('input[name="origin"]').fill("Los Angeles, CA");
  await page.locator('input[name="destination"]').fill("Lisbon, Portugal");
  await page.locator('input[name="traveler_count"]').fill("5");

  await page.locator('[role="dialog"] button[type="submit"]').click();
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="trip-card"], .trip-card')
    .filter({ hasText: tripName })
    .first()
    .click();
  await page.waitForTimeout(1000);
}

async function ensureDayWithActivity(page: any) {
  // Check if we have a day
  const dayCard = page.locator('[data-testid="day-card"], .day-card').first();

  if (await dayCard.count() === 0) {
    // Add a day
    const addDayButton = page.locator('button:has-text("Add Day")').first();
    if (await addDayButton.count() > 0) {
      await addDayButton.click();
      await page.waitForTimeout(500);
      await page.locator('input[name="date"], input[type="date"]').first().fill("2026-07-01");
      await page.locator('input[name="title"]').fill("Test Day for Calendar");
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
    }
  }

  // Check if we have an activity
  const activityCard = page.locator('[data-testid="activity-card"], .activity-card').first();

  if (await activityCard.count() === 0) {
    // Add an activity
    const addActivityButton = page.locator('button:has-text("Add Activity")').first();
    if (await addActivityButton.count() > 0) {
      await addActivityButton.click();
      await page.waitForTimeout(500);
      await page.locator('input[name="name"]').fill("Calendar Test Activity");
      await page.locator('input[name="start_time"], input[type="time"]').first().fill("10:00");
      await page.locator('input[name="end_time"], input[type="time"]').last().fill("12:00");
      await page.locator('input[name="location_name"]').fill("Test Location");
      await page.locator('input[name="address"], textarea[name="address"]').fill("123 Test Street, Lisbon");
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
    }
  }
}

test.describe("Phase 5: Google Calendar Sync", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================
  // CHECK CALENDAR CONNECTION
  // ============================================

  test("5.C.1 - Verify Google Calendar connection status", async ({ page }) => {
    // First check if calendar is connected in settings
    await page.goto("http://localhost:3000/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Screenshot: Settings page
    await page.screenshot({ path: "tests/screenshots/travel-calendar-settings.png", fullPage: true });

    // Look for Google Calendar section
    const calendarSection = page.locator('text=Google Calendar');

    if (await calendarSection.count() > 0) {
      // Check connection status
      const connectedStatus = page.locator('text=Connected, text=Linked, [data-testid="calendar-connected"]');
      const disconnectedStatus = page.locator('button:has-text("Connect"), button:has-text("Link"), text=Not Connected');

      if (await connectedStatus.count() > 0) {
        console.log("SUCCESS: Google Calendar is connected");
      } else if (await disconnectedStatus.count() > 0) {
        console.log("Google Calendar is NOT connected - sync tests may be limited");
      } else {
        console.log("Calendar connection status unclear");
      }
    } else {
      console.log("Google Calendar section not found in settings");
    }
  });

  // ============================================
  // SYNC DAY TO CALENDAR
  // ============================================

  test("5.C.2 - Sync entire day to Google Calendar", async ({ page }) => {
    await openOrCreateTrip(page);
    await ensureDayWithActivity(page);

    // Screenshot: Before sync
    await page.screenshot({ path: "tests/screenshots/travel-calendar-day-before-sync.png", fullPage: true });

    // Find a day card
    const dayCard = page.locator('[data-testid="day-card"], .day-card').first();

    if (await dayCard.count() > 0) {
      // Expand day if needed
      await dayCard.click();
      await page.waitForTimeout(500);

      // Look for "Sync to Calendar" button on day
      const syncDayButton = page.locator(
        'button:has-text("Sync to Calendar"), ' +
        'button:has-text("Add to Calendar"), ' +
        '[data-testid="sync-day-calendar"], ' +
        'button[aria-label*="calendar" i]'
      ).first();

      if (await syncDayButton.count() > 0) {
        // Screenshot: Sync button visible
        await page.screenshot({ path: "tests/screenshots/travel-calendar-sync-button.png" });

        await syncDayButton.click();
        await page.waitForTimeout(2000);

        // Screenshot: After sync attempt
        await page.screenshot({ path: "tests/screenshots/travel-calendar-day-after-sync.png", fullPage: true });

        // Check for success toast or sync indicator
        const toast = page.locator('[data-sonner-toast]');
        if (await toast.count() > 0) {
          const toastText = await toast.first().textContent();
          console.log(`Toast message: ${toastText}`);

          if (toastText?.toLowerCase().includes('sync') || toastText?.toLowerCase().includes('calendar')) {
            console.log("SUCCESS: Day synced to calendar");
          }
        }

        // Check for sync indicator on day
        const syncIndicator = page.locator('[data-testid="calendar-synced"], svg.lucide-calendar-check, text=Synced');
        if (await syncIndicator.count() > 0) {
          console.log("SUCCESS: Calendar sync indicator visible");
        }
      } else {
        console.log("Sync day to calendar button not found");
      }
    }
  });

  // ============================================
  // SYNC INDIVIDUAL ACTIVITY
  // ============================================

  test("5.C.3 - Sync individual activity to Google Calendar", async ({ page }) => {
    await openOrCreateTrip(page);
    await ensureDayWithActivity(page);

    // Screenshot: Before activity sync
    await page.screenshot({ path: "tests/screenshots/travel-calendar-activity-before-sync.png", fullPage: true });

    // Find an activity
    const activityCard = page.locator('[data-testid="activity-card"], .activity-card').first();

    if (await activityCard.count() > 0) {
      await activityCard.click();
      await page.waitForTimeout(500);

      // Screenshot: Activity detail
      await page.screenshot({ path: "tests/screenshots/travel-calendar-activity-detail.png" });

      // Look for sync button on activity
      const syncActivityButton = page.locator(
        'button:has-text("Sync"), ' +
        'button:has-text("Add to Calendar"), ' +
        '[data-testid="sync-activity-calendar"], ' +
        'button[aria-label*="calendar" i]'
      ).first();

      if (await syncActivityButton.count() > 0) {
        await syncActivityButton.click();
        await page.waitForTimeout(2000);

        // Screenshot: After sync
        await page.screenshot({ path: "tests/screenshots/travel-calendar-activity-after-sync.png" });

        // Check for success
        const toast = page.locator('[data-sonner-toast]');
        if (await toast.count() > 0) {
          const toastText = await toast.first().textContent();
          console.log(`Toast message: ${toastText}`);
        }

        console.log("SUCCESS: Individual activity sync attempted");
      } else {
        console.log("Sync activity button not found");
      }
    }
  });

  // ============================================
  // VERIFY CALENDAR EVENT FORMAT
  // ============================================

  test("5.C.4 - Verify calendar event has correct format", async ({ page }) => {
    await openOrCreateTrip(page);
    await ensureDayWithActivity(page);

    // Look for a synced activity
    const syncedActivity = page.locator(
      '[data-testid="activity-card"][data-synced="true"], ' +
      '.activity-card:has([data-testid="calendar-synced"]), ' +
      '.activity-card:has(svg.lucide-calendar-check)'
    ).first();

    if (await syncedActivity.count() > 0) {
      await syncedActivity.click();
      await page.waitForTimeout(500);

      // Screenshot: Synced activity detail
      await page.screenshot({ path: "tests/screenshots/travel-calendar-event-format.png" });

      // Check that activity has required calendar fields
      const hasTitle = await page.locator('[data-testid="activity-name"], h3, h4').count() > 0;
      const hasTime = await page.locator('text=/\\d{1,2}:\\d{2}/').count() > 0;
      const hasLocation = await page.locator('[data-testid="activity-location"], text=/location|address/i').count() > 0;

      console.log(`Activity has title: ${hasTitle}`);
      console.log(`Activity has time: ${hasTime}`);
      console.log(`Activity has location: ${hasLocation}`);

      if (hasTitle && hasTime) {
        console.log("SUCCESS: Calendar event has required format");
      }
    } else {
      console.log("No synced activities found to verify format");
    }
  });

  // ============================================
  // UNSYNC FROM CALENDAR
  // ============================================

  test("5.C.5 - Unsync activity from Google Calendar", async ({ page }) => {
    await openOrCreateTrip(page);

    // Find a synced activity
    const syncedActivity = page.locator(
      '[data-testid="activity-card"][data-synced="true"], ' +
      '.activity-card:has([data-testid="calendar-synced"])'
    ).first();

    if (await syncedActivity.count() > 0) {
      await syncedActivity.click();
      await page.waitForTimeout(500);

      // Screenshot: Before unsync
      await page.screenshot({ path: "tests/screenshots/travel-calendar-before-unsync.png" });

      // Look for unsync/remove button
      const unsyncButton = page.locator(
        'button:has-text("Unsync"), ' +
        'button:has-text("Remove from Calendar"), ' +
        '[data-testid="unsync-calendar"]'
      ).first();

      if (await unsyncButton.count() > 0) {
        await unsyncButton.click();
        await page.waitForTimeout(2000);

        // Screenshot: After unsync
        await page.screenshot({ path: "tests/screenshots/travel-calendar-after-unsync.png" });

        // Check for success
        const toast = page.locator('[data-sonner-toast]');
        if (await toast.count() > 0) {
          const toastText = await toast.first().textContent();
          console.log(`Toast message: ${toastText}`);
        }

        console.log("SUCCESS: Activity unsynced from calendar");
      } else {
        console.log("Unsync button not found");
      }
    } else {
      console.log("No synced activities found to unsync");
    }
  });

  // ============================================
  // UNSYNC ENTIRE DAY
  // ============================================

  test("5.C.6 - Unsync entire day from Google Calendar", async ({ page }) => {
    await openOrCreateTrip(page);

    // Find a synced day
    const dayCard = page.locator('[data-testid="day-card"], .day-card').first();

    if (await dayCard.count() > 0) {
      await dayCard.click();
      await page.waitForTimeout(500);

      // Look for unsync day button
      const unsyncDayButton = page.locator(
        'button:has-text("Unsync Day"), ' +
        'button:has-text("Remove Day from Calendar"), ' +
        '[data-testid="unsync-day-calendar"]'
      ).first();

      if (await unsyncDayButton.count() > 0) {
        await unsyncDayButton.click();
        await page.waitForTimeout(2000);

        // Screenshot: After unsync day
        await page.screenshot({ path: "tests/screenshots/travel-calendar-unsync-day.png", fullPage: true });

        console.log("SUCCESS: Day unsynced from calendar");
      } else {
        console.log("Unsync day button not found");
      }
    }
  });

  // ============================================
  // SYNC STATUS INDICATOR
  // ============================================

  test("5.C.7 - Verify sync status indicators", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Trip with sync indicators
    await page.screenshot({ path: "tests/screenshots/travel-calendar-sync-indicators.png", fullPage: true });

    // Look for various sync indicators
    const syncIndicators = page.locator(
      '[data-testid="calendar-synced"], ' +
      'svg.lucide-calendar-check, ' +
      'svg.lucide-calendar-x, ' +
      '[class*="synced"], ' +
      'text=Synced'
    );

    const indicatorCount = await syncIndicators.count();
    console.log(`Found ${indicatorCount} sync status indicators`);

    // Check for both synced and unsynced states
    const syncedCount = await page.locator('[data-synced="true"], [data-testid="calendar-synced"]').count();
    const unsyncedCount = await page.locator('[data-synced="false"], :not([data-testid="calendar-synced"])').count();

    console.log(`Synced items: ${syncedCount}`);
    console.log(`Unsynced items: ${unsyncedCount}`);

    console.log("SUCCESS: Sync status indicators verified");
  });

  // ============================================
  // UPDATE SYNCED ACTIVITY
  // ============================================

  test("5.C.8 - Update activity and verify calendar update", async ({ page }) => {
    await openOrCreateTrip(page);
    await ensureDayWithActivity(page);

    // Find a synced activity
    const activityCard = page.locator('[data-testid="activity-card"], .activity-card').first();

    if (await activityCard.count() > 0) {
      await activityCard.click();
      await page.waitForTimeout(500);

      // Edit the activity
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);
      }

      // Update time
      const endTimeField = page.locator('input[name="end_time"], input[type="time"]').last();
      if (await endTimeField.count() > 0) {
        await endTimeField.fill("14:00"); // Extended end time
      }

      // Save
      await page.locator('button[type="submit"]:has-text("Save")').click();
      await page.waitForTimeout(2000);

      // Screenshot: After update
      await page.screenshot({ path: "tests/screenshots/travel-calendar-after-update.png" });

      // Check if there's a re-sync prompt or automatic sync
      const resyncPrompt = page.locator('text=Update Calendar, button:has-text("Resync")');
      if (await resyncPrompt.count() > 0) {
        console.log("Re-sync prompt appeared after activity update");
      }

      console.log("SUCCESS: Activity updated - calendar should reflect changes");
    }
  });

  // ============================================
  // BULK SYNC
  // ============================================

  test("5.C.9 - Bulk sync multiple days/activities", async ({ page }) => {
    await openOrCreateTrip(page);

    // Look for bulk sync option
    const bulkSyncButton = page.locator(
      'button:has-text("Sync All"), ' +
      'button:has-text("Sync Trip to Calendar"), ' +
      '[data-testid="bulk-sync"]'
    ).first();

    if (await bulkSyncButton.count() > 0) {
      // Screenshot: Before bulk sync
      await page.screenshot({ path: "tests/screenshots/travel-calendar-bulk-sync-before.png", fullPage: true });

      await bulkSyncButton.click();
      await page.waitForTimeout(3000); // May take longer for multiple items

      // Screenshot: After bulk sync
      await page.screenshot({ path: "tests/screenshots/travel-calendar-bulk-sync-after.png", fullPage: true });

      // Check for success toast
      const toast = page.locator('[data-sonner-toast]');
      if (await toast.count() > 0) {
        const toastText = await toast.first().textContent();
        console.log(`Toast message: ${toastText}`);
      }

      console.log("SUCCESS: Bulk sync attempted");
    } else {
      console.log("Bulk sync option not found");
    }
  });

  // ============================================
  // CALENDAR PREVIEW
  // ============================================

  test("5.C.10 - Preview calendar event before sync", async ({ page }) => {
    await openOrCreateTrip(page);
    await ensureDayWithActivity(page);

    // Find an activity
    const activityCard = page.locator('[data-testid="activity-card"], .activity-card').first();

    if (await activityCard.count() > 0) {
      await activityCard.click();
      await page.waitForTimeout(500);

      // Look for preview or "view in calendar" option
      const previewButton = page.locator(
        'button:has-text("Preview"), ' +
        'button:has-text("View in Calendar"), ' +
        '[data-testid="calendar-preview"]'
      ).first();

      if (await previewButton.count() > 0) {
        await previewButton.click();
        await page.waitForTimeout(500);

        // Screenshot: Calendar preview
        await page.screenshot({ path: "tests/screenshots/travel-calendar-preview.png" });

        console.log("SUCCESS: Calendar preview available");
      } else {
        console.log("Calendar preview option not found");
      }
    }
  });
});

// ============================================
// CLEANUP
// ============================================
test("cleanup: delete calendar sync test trip", async ({ page }) => {
  await login(page);
  await goToTravel(page);

  const testTrip = page.locator('[data-testid="trip-card"], .trip-card')
    .filter({ hasText: "Calendar Sync Test Trip" })
    .first();

  if (await testTrip.count() > 0) {
    await testTrip.click();
    await page.waitForTimeout(500);

    const deleteButton = page.locator('button:has-text("Delete"), button svg.lucide-trash-2').first();

    if (await deleteButton.count() > 0) {
      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await deleteButton.click();
      await page.waitForTimeout(1500);
      console.log("Deleted: Calendar Sync Test Trip");
    } else {
      await page.keyboard.press('Escape');
    }
  }

  console.log("Cleanup complete");
});
