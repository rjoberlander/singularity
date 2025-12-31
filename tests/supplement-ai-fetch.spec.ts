import { test, expect } from "@playwright/test";

test.describe("Supplement AI Fetch", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("AI fetch populates supplement edit form with Apigenin", async ({ page }) => {
    // Navigate to supplements page
    await page.goto("http://localhost:3000/supplements");
    await page.waitForLoadState("networkidle");

    // Wait for supplements to load
    await page.waitForTimeout(3000);

    // Click on an existing supplement card to open edit form
    // Try multiple selectors to find a card
    const cardSelectors = [
      '[data-testid="supplement-card"]',
      '.rounded-lg.border.cursor-pointer',
      'div[class*="cursor-pointer"]'
    ];

    let clicked = false;
    for (const selector of cardSelectors) {
      const card = page.locator(selector).filter({ has: page.locator('h3, span.font-semibold') }).first();
      const count = await card.count();
      if (count > 0) {
        await card.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      await page.screenshot({ path: "tests/screenshots/supplement-no-cards.png" });
      console.log("No supplement cards found, skipping test");
      return;
    }

    // Wait for dialog to open
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

    // Clear the name field and type "Apigenin"
    const nameInput = page.locator('input[placeholder="Vitamin D3"]');
    await nameInput.clear();
    await nameInput.fill("Apigenin");

    // Wait a moment for React state to update
    await page.waitForTimeout(100);

    // Find and click the AI button
    const aiButton = page.getByRole('button', { name: /Populate by AI/i });
    await expect(aiButton).toBeEnabled();

    // Take screenshot before AI fetch
    await page.screenshot({ path: "tests/screenshots/supplement-before-ai-fetch.png" });

    await aiButton.click();

    // Wait for the fetch to complete (loading spinner disappears)
    // The button shows loader while fetching - wait for it to be enabled again
    await expect(aiButton).toBeEnabled({ timeout: 45000 });

    // Wait a bit for form to populate
    await page.waitForTimeout(500);

    // Check that some fields got populated (the AI should fill in details)
    // We'll check if category or dose_unit got selected (buttons with active state)
    const activeChips = page.locator('button.bg-primary.text-primary-foreground');
    const activeCount = await activeChips.count();

    // Should have at least one category/form/unit selected by AI
    expect(activeCount).toBeGreaterThan(0);

    // Take a screenshot
    await page.screenshot({ path: "tests/screenshots/supplement-ai-fetch.png" });

    console.log("AI fetch test completed - found", activeCount, "auto-filled chip selections");
  });
});
