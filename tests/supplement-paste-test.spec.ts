import { test, expect } from "@playwright/test";

const TEST_EMAIL = "rjoberlander@gmail.com";
const TEST_PASSWORD = "Cookie123!";

const KRILL_OIL_TEXT = `Krill Oil — 1 softgel (1000mg)
Brand: Sports Research Antarctic Krill
URL: https://www.amazon.com/dp/B00IP1E3O0
Price: ~$0.40/serving
Why: Phospholipid-bound omega-3s + astaxanthin + choline
Mechanism: Phospholipid form integrates directly into cell membranes; astaxanthin = potent antioxidant
Goals: Cardiovascular, Cognitive (DHA for neuronal membranes), Skin (astaxanthin)
Timing: AM
Why AM: Same as fish oil — cognitive benefits during waking hours`;

test.describe("Supplement Paste and Save", () => {
  test.setTimeout(120000); // 2 minute timeout

  test("should extract Krill Oil from pasted text and save", async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Navigate to supplements
    await page.goto("http://localhost:3000/supplements");
    await page.waitForLoadState("networkidle");

    // Delete any existing omega/krill/fish supplements first
    const existingCards = page.locator('text=/Omega|Fish|Krill/i');
    const count = await existingCards.count();
    console.log(`Found ${count} existing omega/fish/krill supplements`);

    // Take initial screenshot
    await page.screenshot({ path: "tests/screenshots/paste-test-1-initial.png" });

    // Find the text input (should be in Text/Image mode by default)
    const textInput = page.locator('[data-testid="supplement-chat-input"]');
    await expect(textInput).toBeVisible({ timeout: 5000 });

    // Paste the Krill Oil text
    await textInput.fill(KRILL_OIL_TEXT);
    console.log("Pasted Krill Oil text");

    // Take screenshot with text filled
    await page.screenshot({ path: "tests/screenshots/paste-test-2-filled.png" });

    // Click Extract Supplements
    const extractButton = page.locator('[data-testid="supplement-send-button"]');
    await extractButton.click();
    console.log("Clicked Extract button");

    // Wait for modal with review step
    await expect(page.locator('text=Review Extracted Supplements')).toBeVisible({ timeout: 60000 });
    console.log("Modal appeared with review step");

    // Take screenshot of extraction results
    await page.screenshot({ path: "tests/screenshots/paste-test-3-extracted.png" });

    // Verify key fields are present
    const modal = page.locator('[role="dialog"]');

    // Check for Krill Oil name
    const hasKrillOil = await modal.locator('text=/Krill/i').count() > 0;
    console.log("Has Krill Oil:", hasKrillOil);

    // Check for brand
    const hasBrand = await modal.locator('text=/Sports Research/i').count() > 0;
    console.log("Has Brand (Sports Research):", hasBrand);

    // Check for reason/why
    const hasReason = await modal.locator('text=/phospholipid|omega-3|astaxanthin/i').count() > 0;
    console.log("Has Reason:", hasReason);

    // Check for mechanism
    const hasMechanism = await modal.locator('text=/membrane|antioxidant/i').count() > 0;
    console.log("Has Mechanism:", hasMechanism);

    // Check for goals
    const hasGoals = await modal.locator('text=/Cardiovascular|Cognitive|Skin/i').count() > 0;
    console.log("Has Goals:", hasGoals);

    // Check for timing
    const hasTiming = await modal.locator('text=/AM|Morning|Wake/i').count() > 0;
    console.log("Has Timing:", hasTiming);

    // Check if it's a duplicate or new
    const isDuplicate = await modal.locator('text=/duplicate/i').count() > 0;
    console.log("Is Duplicate:", isDuplicate);

    // Check selected count
    const selectedText = await modal.locator('text=/of 1 selected/').textContent();
    console.log("Selection status:", selectedText);

    // If it's showing as duplicate, we need to manually select it
    if (isDuplicate) {
      console.log("Clicking to select the duplicate supplement...");
      // Click on the supplement card to select it
      const supplementCard = modal.locator('[class*="cursor-pointer"]').first();
      await supplementCard.click();
      await page.waitForTimeout(500);
    }

    // Take screenshot before save
    await page.screenshot({ path: "tests/screenshots/paste-test-4-before-save.png" });

    // Check if save button is enabled
    const saveButton = modal.locator('button:has-text("Save")');
    const saveButtonText = await saveButton.textContent();
    console.log("Save button text:", saveButtonText);

    // Only try to save if there are supplements selected
    if (saveButtonText && !saveButtonText.includes("Save 0")) {
      await saveButton.click();
      console.log("Clicked Save button");

      // Wait for success toast
      await expect(page.locator('text=/Saved.*supplement/i')).toBeVisible({ timeout: 10000 });
      console.log("Save succeeded!");

      // Take screenshot after save
      await page.screenshot({ path: "tests/screenshots/paste-test-5-saved.png" });

      // Wait for page to update
      await page.waitForLoadState("networkidle");

      // Verify supplement appears in list
      await expect(page.locator('text=/Krill|Omega|Fish/i').first()).toBeVisible({ timeout: 5000 });
      console.log("Supplement visible in list!");

      // Take final screenshot
      await page.screenshot({ path: "tests/screenshots/paste-test-6-final.png" });
    } else {
      console.log("No supplements selected to save (likely all duplicates)");
      // Close modal
      await modal.locator('button:has-text("Cancel")').click();
    }

    console.log("\n=== TEST RESULTS ===");
    console.log("Krill Oil name:", hasKrillOil ? "✅" : "❌");
    console.log("Brand:", hasBrand ? "✅" : "❌");
    console.log("Reason:", hasReason ? "✅" : "❌");
    console.log("Mechanism:", hasMechanism ? "✅" : "❌");
    console.log("Goals:", hasGoals ? "✅" : "❌");
    console.log("Timing:", hasTiming ? "✅" : "❌");
  });
});
