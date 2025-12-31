import { test, expect } from "@playwright/test";

test.describe("Biomarker Detail Modal", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("should open detail modal when clicking a biomarker card", async ({ page }) => {
    // Collect console logs for debugging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Navigate to biomarkers page
    await page.goto("http://localhost:3000/biomarkers");

    // Wait for the page to fully load
    await page.waitForSelector("h1:has-text('Biomarkers')");
    await page.waitForTimeout(3000);

    // Take screenshot of the page after loading
    await page.screenshot({ path: "tests/screenshots/biomarkers-page-load.png" });

    // Find a biomarker card with h3 containing a name
    const firstCard = page.locator('h3:has-text("LDL Cholesterol")').first();

    if (await firstCard.isVisible()) {
      console.log("Found LDL Cholesterol card, clicking...");

      // Click on the h3 element (which should propagate to the card)
      await firstCard.click({ force: true });

      // Take screenshot immediately after click
      await page.screenshot({ path: "tests/screenshots/after-click.png" });

      // Wait for any dialog/modal
      await page.waitForTimeout(1000);

      // Check for dialog
      const dialog = page.locator('[role="dialog"]');
      const dialogVisible = await dialog.isVisible().catch(() => false);
      console.log(`Dialog visible: ${dialogVisible}`);

      // Take screenshot
      await page.screenshot({ path: "tests/screenshots/biomarker-detail-modal.png" });

      if (dialogVisible) {
        // Verify modal has key elements (2-column layout with Alex AI chat)
        await expect(page.locator('text=Trending').first()).toBeVisible();
        await expect(page.locator('text=Optimal').first()).toBeVisible();
        await expect(page.locator('text=Notes').first()).toBeVisible();
        // New Alex AI interface
        await expect(page.locator('text=Alex').first()).toBeVisible();
        await expect(page.locator('text=AI Health Assistant').first()).toBeVisible();
        await expect(page.locator('button:has-text("Explain this marker")')).toBeVisible();
        await expect(page.locator('button:has-text("Analyze my trend")')).toBeVisible();
        await expect(page.locator('button:has-text("Update my data")')).toBeVisible();
        console.log("Modal opened successfully with Alex AI interface!");
      } else {
        // Check for any other modal indicators
        const anyModal = await page.locator('[data-state="open"]').count();
        console.log(`Found ${anyModal} elements with data-state=open`);

        // Fail the test with useful info
        throw new Error("Modal did not appear after clicking card");
      }
    } else {
      console.log("LDL Cholesterol card not visible");
      await page.screenshot({ path: "tests/screenshots/biomarkers-no-ldl.png" });
      throw new Error("Could not find LDL Cholesterol card");
    }
  });
});
