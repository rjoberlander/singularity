import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test.describe("Travel Plan Edit Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('#email', "rjoberlander@gmail.com");
    await page.fill('#password', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("edit form loads data and date picker works", async ({ page }) => {
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    // Wait for page to load
    await expect(page.locator('h2', { hasText: 'Trip Planning Guide' })).toBeVisible({ timeout: 10000 });

    // If completed, undo first
    const undoBtn = page.locator('button:has-text("Undo")').first();
    if (await undoBtn.isVisible().catch(() => false)) {
      await undoBtn.click();
      await page.waitForTimeout(1000);
    }

    // Click Edit button
    const editBtn = page.locator('[data-testid="edit-basics-button"]');
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Verify form fields have loaded data (not empty)
    const nameInput = page.locator('[data-testid="trip-name-input"]');
    await expect(nameInput).toBeVisible();
    const nameValue = await nameInput.inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
    console.log("Trip name loaded:", nameValue);

    // Verify date fields have data
    const startDateInput = page.locator('[data-testid="start-date-input"]');
    await expect(startDateInput).toBeVisible();
    const startValue = await startDateInput.inputValue();
    expect(startValue).toMatch(/\d{4}-\d{2}-\d{2}/);
    console.log("Start date loaded:", startValue);

    // Test clicking on date input - should be able to type/change
    await startDateInput.click();
    await page.waitForTimeout(300);

    // Try to change the date by typing
    await startDateInput.fill("2026-06-20");
    const newStartValue = await startDateInput.inputValue();
    expect(newStartValue).toBe("2026-06-20");
    console.log("Start date changed to:", newStartValue);

    // Verify destination loaded
    const destInput = page.locator('[data-testid="destination-input"]');
    const destValue = await destInput.inputValue();
    console.log("Destination loaded:", destValue);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/travel-plan-edit-form.png" });

    // Cancel to not save changes
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
  });
});
