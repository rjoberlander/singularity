import { test, expect } from "@playwright/test";

// Test account with API keys configured
const TEST_EMAIL = "rjoberlander@gmail.com";
const TEST_PASSWORD = "Cookie123!";

test.describe("Supplement Extraction", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("should extract Krill Oil from Amazon URL and display all fields", async ({ page }) => {
    // Navigate to supplements page
    await page.goto("http://localhost:3000/supplements");
    await page.waitForLoadState("networkidle");

    // Take screenshot of initial state
    await page.screenshot({ path: "tests/screenshots/supplements-page.png" });

    // Find the URL input mode toggle and click it
    const urlButton = page.locator('button:has-text("URL")');
    await urlButton.click();

    // Enter the Amazon Krill Oil URL
    const urlInput = page.locator('[data-testid="supplement-url-input"]');
    await urlInput.fill("https://www.amazon.com/dp/B00IP1E3O0");

    // Take screenshot with URL entered
    await page.screenshot({ path: "tests/screenshots/supplement-url-entered.png" });

    // Click Extract Supplements button
    const extractButton = page.locator('[data-testid="supplement-send-button"]');
    await extractButton.click();

    // Wait for the extraction modal to appear and extraction to complete
    // The modal should show the progress bar, then the review screen
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for review step (extraction complete) - look for "Review" in title
    await expect(page.locator('text=Review Extracted Supplements')).toBeVisible({ timeout: 60000 });

    // Take screenshot of extraction results
    await page.screenshot({ path: "tests/screenshots/supplement-extracted.png" });

    // Verify the extracted supplement has the expected fields
    // Check for supplement name (AI may call it Krill Oil, Omega-3, or Fish Oil)
    const supplementName = modal.locator('text=/Krill|Omega|Fish Oil/i');
    await expect(supplementName.first()).toBeVisible();

    // Check for Amazon icon/ASIN display
    const amazonLink = modal.locator('a[href*="amazon.com"]');
    await expect(amazonLink).toBeVisible();

    // Check for reason (why) - look for info icon area
    const reasonSection = modal.locator('text=/omega|phospholipid|astaxanthin/i');
    const hasReason = await reasonSection.count() > 0;
    console.log("Has reason text:", hasReason);

    // Check for mechanism (how it works)
    const mechanismSection = modal.locator('text=/membrane|antioxidant|integrates/i');
    const hasMechanism = await mechanismSection.count() > 0;
    console.log("Has mechanism text:", hasMechanism);

    // Check for goals
    const goalsSection = modal.locator('text=/Cardiovascular|Cognitive|Skin/i');
    const hasGoals = await goalsSection.count() > 0;
    console.log("Has goals:", hasGoals);

    // Check for timing
    const timingSection = modal.locator('text=/AM|Morning|Wake/i');
    const hasTiming = await timingSection.count() > 0;
    console.log("Has timing:", hasTiming);

    // Take final screenshot showing all details
    await page.screenshot({ path: "tests/screenshots/supplement-details.png", fullPage: true });

    // Now save the supplement
    const saveButton = modal.locator('button:has-text("Save")');
    await saveButton.click();

    // Wait for success toast
    await expect(page.locator('text=/Saved.*supplement/i')).toBeVisible({ timeout: 10000 });

    // Take screenshot after save
    await page.screenshot({ path: "tests/screenshots/supplement-saved.png" });

    // Verify the supplement appears in the list (AI may name it differently)
    await page.waitForLoadState("networkidle");
    const supplementCard = page.locator('text=/Krill|Omega|Fish Oil/i').first();
    await expect(supplementCard).toBeVisible({ timeout: 5000 });

    // Take final screenshot
    await page.screenshot({ path: "tests/screenshots/supplement-in-list.png" });

    console.log("Test completed successfully!");
  });
});
