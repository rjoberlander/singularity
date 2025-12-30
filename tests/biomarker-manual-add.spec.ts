import { test, expect } from "@playwright/test";

// Test user credentials
const TEST_USER = {
  email: "rjoberlander@gmail.com",
  password: "Cookie123!",
};

test.describe("Biomarker Manual Add Modal", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill in login credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Click login button and wait for navigation
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for dashboard to load
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Navigate to biomarkers page
    await page.goto("/biomarkers");
    await page.waitForLoadState("networkidle");
  });

  test("can open add biomarker modal", async ({ page }) => {
    // Click "Add Manually" button
    await page.getByRole("button", { name: /add manually/i }).click();

    // Modal should be visible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add biomarker/i })).toBeVisible();
  });

  test("can select biomarker from dropdown in modal", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /add manually/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click the biomarker dropdown
    await page.getByTestId("biomarker-select").click();

    // Search for a biomarker
    await page.getByPlaceholder("Search biomarkers...").fill("Ferritin");

    // Select Ferritin
    await page.getByRole("option", { name: /Ferritin/i }).click();

    // Verify selection
    await expect(page.getByTestId("biomarker-select")).toContainText("Ferritin");
  });

  test("shows unit and optimal range after selecting biomarker", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /add manually/i }).click();
    await expect(page.getByRole("dialog", { name: /add biomarker/i })).toBeVisible();

    // Select a biomarker
    await page.getByTestId("biomarker-select").click();
    await page.getByPlaceholder("Search biomarkers...").fill("Ferritin");
    await page.getByRole("option", { name: /Ferritin/i }).click();

    // Verify optimal range is shown (more specific text)
    await expect(page.getByText(/Optimal range: .* ng\/mL/i)).toBeVisible();
  });

  test("can input value and date", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /add manually/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select biomarker
    await page.getByTestId("biomarker-select").click();
    await page.getByPlaceholder("Search biomarkers...").fill("Glucose");
    await page.getByRole("option", { name: /Glucose/i }).click();

    // Enter value
    await page.getByTestId("biomarker-value").fill("95");
    await expect(page.getByTestId("biomarker-value")).toHaveValue("95");

    // Verify date has today's date by default
    const today = new Date().toISOString().split("T")[0];
    await expect(page.getByTestId("biomarker-date")).toHaveValue(today);

    // Change date
    await page.getByTestId("biomarker-date").fill("2024-01-15");
    await expect(page.getByTestId("biomarker-date")).toHaveValue("2024-01-15");
  });

  test("save button is disabled without required fields", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /add manually/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Save button should be disabled initially
    await expect(page.getByTestId("biomarker-save")).toBeDisabled();

    // Select biomarker only
    await page.getByTestId("biomarker-select").click();
    await page.getByPlaceholder("Search biomarkers...").fill("Glucose");
    await page.getByRole("option", { name: /Glucose/i }).click();

    // Still disabled without value
    await expect(page.getByTestId("biomarker-save")).toBeDisabled();

    // Enter value
    await page.getByTestId("biomarker-value").fill("95");

    // Now should be enabled
    await expect(page.getByTestId("biomarker-save")).toBeEnabled();
  });

  test("can save a biomarker and modal closes", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /add manually/i }).click();
    const modal = page.getByRole("dialog", { name: /add biomarker/i });
    await expect(modal).toBeVisible();

    // Select biomarker - use Phosphorus as it's unlikely to have existing data
    await page.getByTestId("biomarker-select").click();
    await page.getByPlaceholder("Search biomarkers...").fill("Phosphorus");
    await page.getByRole("option", { name: /Phosphorus/i }).click();

    // Enter a unique value
    await page.getByTestId("biomarker-value").fill("3.5");

    // Set a specific date
    await page.getByTestId("biomarker-date").fill("2024-12-30");

    // Click save
    await page.getByTestId("biomarker-save").click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Should still be on biomarkers page
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Biomarkers");

    // Wait for page to refresh/update
    await page.waitForLoadState("networkidle");

    // Verify the saved value appears on the page - look for Phosphorus card with the value
    const phosphorusCard = page.locator('text=Phosphorus').first();
    await expect(phosphorusCard).toBeVisible();

    // The value 3.5 should be visible somewhere on the page (may appear multiple times in chart)
    await expect(page.getByText("3.5").first()).toBeVisible();
  });

  test("cancel button closes modal", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /add manually/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
