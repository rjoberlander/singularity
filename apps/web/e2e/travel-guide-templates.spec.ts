import { test, expect } from "@playwright/test";

test.describe("Travel Guide Templates", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('#email', "rjoberlander@gmail.com");
    await page.fill('#password', "Cookie123!");
    await page.click('button:has-text("Sign in")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("can load Phase 1 instructions template", async ({ page }) => {
    // Listen for console errors and network requests
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to travel guide
    await page.goto("http://localhost:3000/travel/guide");
    await page.waitForLoadState("networkidle");

    // Take screenshot of initial page
    await page.screenshot({ path: "tests/screenshots/travel-guide-initial.png" });

    // The accordion should be open by default (defaultValue="workflow")
    // But let's make sure - click on it if Phase 1 isn't visible
    let phase1Visible = await page.locator('text=Phase 1: Trip Planning').isVisible().catch(() => false);

    if (!phase1Visible) {
      console.log("Phase 1 not visible, clicking accordion");
      const accordionTrigger = page.locator('[data-state] >> text=Phase Workflow Details').first();
      if (await accordionTrigger.isVisible()) {
        await accordionTrigger.click();
        await page.waitForTimeout(1000);
      }
    }

    // Screenshot after accordion handling
    await page.screenshot({ path: "tests/screenshots/travel-guide-accordion-expanded.png" });

    // Debug: check what buttons are visible
    const allButtons = await page.locator('button').allTextContents();
    console.log("All button texts:", allButtons.slice(0, 20));

    // Look for instructions.md button with a more flexible selector
    const instructionsButton = page.locator('button', { hasText: 'instructions.md' }).first();

    // If not found, try scrolling
    if (!await instructionsButton.isVisible().catch(() => false)) {
      console.log("instructions.md not visible, scrolling...");
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(500);
    }

    await expect(instructionsButton).toBeVisible({ timeout: 10000 });
    await instructionsButton.click();

    // Wait for the sheet to open and load
    await page.waitForTimeout(3000);

    // Take screenshot after clicking
    await page.screenshot({ path: "tests/screenshots/travel-guide-template-sheet.png" });

    // Log any errors
    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log("Network errors:", networkErrors);
    }

    // Check if there's an error toast
    const errorToast = page.locator('text=Failed to load template');
    const hasError = await errorToast.isVisible().catch(() => false);

    if (hasError) {
      // Take screenshot showing the error
      await page.screenshot({ path: "tests/screenshots/travel-guide-template-error.png" });
      console.log("ERROR TOAST VISIBLE - template failed to load");
    }

    // Check the textarea has content
    const textarea = page.locator('textarea');
    const textareaContent = await textarea.inputValue().catch(() => "");

    console.log("Textarea content length:", textareaContent.length);
    console.log("Has error toast:", hasError);

    // The content should have the instructions
    expect(textareaContent.length).toBeGreaterThan(100);
    expect(textareaContent).toContain("Trip Planner");

    // Close the sheet
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test("can load Phase 2 card-inventory template", async ({ page }) => {
    await page.goto("http://localhost:3000/travel/guide");
    await page.waitForLoadState("networkidle");

    // Click on card-inventory.json button (Phase 2)
    const cardInventoryButton = page.locator('button', { hasText: 'card-inventory.json' }).first();
    await expect(cardInventoryButton).toBeVisible({ timeout: 10000 });
    await cardInventoryButton.click();

    // Wait for the sheet to load
    await page.waitForTimeout(2000);

    // Check the textarea has JSON content
    const textarea = page.locator('textarea');
    const textareaContent = await textarea.inputValue().catch(() => "");

    console.log("Card inventory content length:", textareaContent.length);

    // Verify JSON content
    expect(textareaContent.length).toBeGreaterThan(100);
    expect(textareaContent).toContain("credit_cards");
    expect(textareaContent).toContain("Chase Sapphire");
  });

  test("can load Phase 3 output-template", async ({ page }) => {
    await page.goto("http://localhost:3000/travel/guide");
    await page.waitForLoadState("networkidle");

    // Click on Phase 3 output-template.json button
    // Need to be specific since there are multiple output-template.json buttons
    const outputButtons = page.locator('button', { hasText: 'output-template.json' });
    const phase3Output = outputButtons.nth(1); // Phase 3 is the second one

    await expect(phase3Output).toBeVisible({ timeout: 10000 });
    await phase3Output.click();

    // Wait for the sheet to load
    await page.waitForTimeout(2000);

    // Check the textarea has content
    const textarea = page.locator('textarea');
    const textareaContent = await textarea.inputValue().catch(() => "");

    console.log("Phase 3 output template content length:", textareaContent.length);

    // Verify JSON content for research output
    expect(textareaContent.length).toBeGreaterThan(100);
    expect(textareaContent).toContain("research_items");
  });
});
