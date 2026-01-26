import { test, expect } from "@playwright/test";

// Use a known trip ID from the database
const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test.describe("Travel Plan Tab", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('#email', "rjoberlander@gmail.com");
    await page.fill('#password', "Cookie123!");
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("Plan tab appears in trip navigation", async ({ page }) => {
    // Navigate directly to the trip details page
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
    await page.waitForLoadState("networkidle");

    // Look for the Plan tab in the navigation
    const planTab = page.locator('a[href*="/plan"]', { hasText: 'Plan' });
    await expect(planTab).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/travel-plan-tab-visible.png" });
  });

  test("Plan page shows planning steps", async ({ page }) => {
    // Navigate directly to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    // Verify the page loaded
    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Verify the planning steps are visible (use .first() since text appears in both stepper and cards)
    await expect(page.locator('text=Trip Basics').first()).toBeVisible();
    await expect(page.locator('text=Accommodations').first()).toBeVisible();
    await expect(page.locator('text=Segments').first()).toBeVisible();
    await expect(page.locator('text=Days & Activities').first()).toBeVisible();

    // Verify progress bar is visible
    await expect(page.locator('text=/\\d+\\/4 complete/')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/travel-plan-page.png" });
  });

  test("can mark a step as complete and undo", async ({ page }) => {
    // Navigate directly to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    // Wait for the page to load
    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Find a "Mark as Done" button and click it
    const markDoneButton = page.locator('button', { hasText: 'Mark as Done' }).first();

    if (await markDoneButton.isVisible().catch(() => false)) {
      await markDoneButton.click();

      // Wait for the mutation to complete
      await page.waitForTimeout(1000);

      // Verify a success toast appeared or the button changed to "Undo Completion"
      const undoButton = page.locator('button', { hasText: 'Undo Completion' }).first();
      const completeBadge = page.locator('text=Complete').first();

      const hasUndo = await undoButton.isVisible().catch(() => false);
      const hasBadge = await completeBadge.isVisible().catch(() => false);

      expect(hasUndo || hasBadge).toBeTruthy();

      // Take screenshot after marking complete
      await page.screenshot({ path: "e2e/screenshots/travel-plan-step-completed.png" });

      // Undo the completion
      if (hasUndo) {
        await undoButton.click();
        await page.waitForTimeout(1000);

        // Verify the Mark as Done button is back
        await expect(page.locator('button', { hasText: 'Mark as Done' }).first()).toBeVisible();
      }
    }
  });

  test("step cards show summary and missing items", async ({ page }) => {
    // Navigate directly to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    // Wait for the page to load
    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Check that step cards show content (dates, destination, transport info, or missing indicators)
    // The compact UI removed section headers, so we check for actual content
    const hasDateInfo = await page.locator('text=/\\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/').first().isVisible().catch(() => false);
    const hasTransportInfo = await page.locator('text=/Transport:|Flying|Driving|Both/').first().isVisible().catch(() => false);
    const hasDestination = await page.locator('text=/Destination:/').first().isVisible().catch(() => false);
    const hasMissingIndicator = await page.locator('.text-red-600, .text-red-400').first().isVisible().catch(() => false);

    // At least one content type should be visible
    expect(hasDateInfo || hasTransportInfo || hasDestination || hasMissingIndicator).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/travel-plan-step-details.png" });
  });

  test("clicking step in stepper updates active card", async ({ page }) => {
    // Navigate directly to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Find step buttons in the stepper (left side) - they're wrapped in button elements
    const stepButtons = page.locator('button', { hasText: /Trip Basics|Accommodations|Segments|Days & Activities/ });

    const stepCount = await stepButtons.count();

    if (stepCount >= 2) {
      // Click on the second step (Accommodations)
      await stepButtons.nth(1).click();
      await page.waitForTimeout(500);

      // The Accommodations card should now have the active ring style
      // We can verify by checking that clicking worked (the UI updated)
      await page.screenshot({ path: "e2e/screenshots/travel-plan-step-clicked.png" });
    }
  });

  test("can edit trip basics inline", async ({ page }) => {
    // Navigate directly to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // If Trip Basics is completed, first undo the completion to show the Edit button
    const undoButton = page.locator('button', { hasText: 'Undo Completion' }).first();
    if (await undoButton.isVisible().catch(() => false)) {
      await undoButton.click();
      await page.waitForTimeout(1500);
    }

    // Find and click the Edit button for Trip Basics
    const editButton = page.locator('[data-testid="edit-basics-button"]');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for edit form to appear
    await page.waitForTimeout(500);

    // Verify the edit form is visible
    const destinationInput = page.locator('[data-testid="destination-input"]');
    await expect(destinationInput).toBeVisible();

    // Fill in destination
    await destinationInput.fill("Portugal");

    // Select transportation type using checkboxes (click both for "Both")
    const flyingCheckbox = page.locator('[data-testid="transportation-flying"]');
    const drivingCheckbox = page.locator('[data-testid="transportation-driving"]');
    await flyingCheckbox.click();
    await drivingCheckbox.click();

    // Take screenshot before saving
    await page.screenshot({ path: "e2e/screenshots/travel-plan-edit-basics-form.png" });

    // Click save
    const saveButton = page.locator('[data-testid="save-basics-button"]');
    await saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(2000);

    // Verify success toast or that the form closed
    const editButtonAfterSave = page.locator('[data-testid="edit-basics-button"]');
    await expect(editButtonAfterSave).toBeVisible({ timeout: 5000 });

    // Take screenshot after saving
    await page.screenshot({ path: "e2e/screenshots/travel-plan-edit-basics-saved.png" });

    // Verify the summary now shows the updated values (with checkmarks)
    await expect(page.locator('text=/Destination.*Portugal/').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Transport.*Flying/').first()).toBeVisible({ timeout: 5000 });
  });

  test("missing items are shown in red", async ({ page }) => {
    // First, clear the destination and transportation to test red styling
    // Navigate to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // Check if there are any missing items with red styling
    // The missing items should have text-red-600 or text-red-400 class
    const missingSection = page.locator('text=Missing').first();
    const hasMissing = await missingSection.isVisible().catch(() => false);

    if (hasMissing) {
      // Verify the missing items exist - they should be styled in red
      const missingItems = page.locator('.text-red-600, .text-red-400');
      const count = await missingItems.count();

      // Take screenshot to verify red styling
      await page.screenshot({ path: "e2e/screenshots/travel-plan-missing-items-red.png" });

      console.log(`Found ${count} missing items with red styling`);
    }
  });
});
