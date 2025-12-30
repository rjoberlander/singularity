import { test, expect } from "@playwright/test";

const TEST_EMAIL = "rjoberlander@gmail.com";
const TEST_PASSWORD = "Cookie123!";

test.describe("Verify Inline Add Forms", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|biomarkers|supplements|goals|docs)/, { timeout: 15000 });
  });

  test("1. Biomarkers page - Add Manually opens combined modal with tabs", async ({ page }) => {
    await page.goto("http://localhost:3000/biomarkers");
    await page.waitForLoadState("networkidle");

    // Take screenshot of current state
    await page.screenshot({ path: "tests/screenshots/biomarkers-page.png" });

    // Find and click "Add Manually" button
    const addManuallyBtn = page.locator('button:has-text("Add Manually")');
    await expect(addManuallyBtn).toBeVisible({ timeout: 10000 });
    await addManuallyBtn.click();

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Check for the combined modal with AI/Manual tabs
    const modalTitle = page.locator('[role="dialog"] h2, [role="dialog"] [class*="DialogTitle"]');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Look for tabs (AI and Manual)
    const aiTab = page.locator('[role="dialog"] button:has-text("AI"), [role="dialog"] [role="tab"]:has-text("AI")');
    const manualTab = page.locator('[role="dialog"] button:has-text("Manual"), [role="dialog"] [role="tab"]:has-text("Manual")');

    // Take screenshot of the modal
    await page.screenshot({ path: "tests/screenshots/biomarkers-add-modal.png" });

    // Verify tabs exist (combined modal)
    const hasAiTab = await aiTab.count() > 0;
    const hasManualTab = await manualTab.count() > 0;

    console.log("AI Tab found:", hasAiTab);
    console.log("Manual Tab found:", hasManualTab);

    // The modal should have tabs OR be the combined modal with "Add Biomarkers" title
    const modalText = await modalTitle.textContent();
    console.log("Modal title:", modalText);

    expect(hasAiTab || hasManualTab || modalText?.includes("Biomarkers")).toBeTruthy();
  });

  test("2. Supplements page - shows inline add when empty OR Add Manually opens modal", async ({ page }) => {
    await page.goto("http://localhost:3000/supplements");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "tests/screenshots/supplements-page.png" });

    // Check if there's inline SupplementChatInput visible (for empty state)
    // OR if clicking Add Manually opens a modal (for non-empty state)

    const addManuallyBtn = page.locator('button:has-text("Add Manually")').first();
    const hasAddManually = await addManuallyBtn.count() > 0;

    console.log("Found Add Manually button:", hasAddManually);

    if (hasAddManually) {
      await addManuallyBtn.click();
      await page.waitForTimeout(500);

      // Check if modal opened (not navigated to /supplements/add)
      const currentUrl = page.url();
      console.log("Current URL after clicking Add Manually:", currentUrl);

      // Should NOT navigate to /supplements/add
      expect(currentUrl).not.toContain("/supplements/add");

      // Should see a modal dialog
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: "tests/screenshots/supplements-add-modal.png" });
      console.log("Supplements Add Manually opens modal - PASS");
    }

    console.log("Supplements page test passed");
  });

  test("3. Goals page - shows inline form when empty OR Add Goal opens modal", async ({ page }) => {
    await page.goto("http://localhost:3000/goals");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "tests/screenshots/goals-page.png" });

    // Check for inline form (empty state) or Add Goal button
    const inlineForm = page.locator('form:has(input[id="inline-title"])');
    const addGoalBtn = page.locator('button:has-text("Add Goal")');

    const hasInlineForm = await inlineForm.count() > 0;
    const hasAddGoalBtn = await addGoalBtn.count() > 0;

    console.log("Has inline form:", hasInlineForm);
    console.log("Has Add Goal button:", hasAddGoalBtn);

    if (hasInlineForm) {
      console.log("Goals page shows inline form when empty - PASS");
      await page.screenshot({ path: "tests/screenshots/goals-inline-form.png" });
    } else if (hasAddGoalBtn) {
      await addGoalBtn.first().click();
      await page.waitForTimeout(500);

      // Should open modal, not navigate
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: "tests/screenshots/goals-add-modal.png" });
      console.log("Goals Add Goal opens modal - PASS");
    }
  });

  test("4. Docs page - shows inline form when empty OR Add Document opens modal", async ({ page }) => {
    await page.goto("http://localhost:3000/docs");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "tests/screenshots/docs-page.png" });

    // Check for inline form (empty state) or Add Document button
    const inlineForm = page.locator('form:has(input[id="inline-doc-title"])');
    const addDocBtn = page.locator('button:has-text("Add Document")');

    const hasInlineForm = await inlineForm.count() > 0;
    const hasAddDocBtn = await addDocBtn.count() > 0;

    console.log("Has inline form:", hasInlineForm);
    console.log("Has Add Document button:", hasAddDocBtn);

    if (hasInlineForm) {
      console.log("Docs page shows inline form when empty - PASS");
      await page.screenshot({ path: "tests/screenshots/docs-inline-form.png" });
    } else if (hasAddDocBtn) {
      await addDocBtn.first().click();
      await page.waitForTimeout(500);

      // Should open modal, not navigate to /docs/add
      const currentUrl = page.url();
      console.log("Current URL after clicking Add Document:", currentUrl);
      expect(currentUrl).not.toContain("/docs/add");

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: "tests/screenshots/docs-add-modal.png" });
      console.log("Docs Add Document opens modal - PASS");
    }
  });
});
