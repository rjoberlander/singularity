import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "rjoberlander@gmail.com",
  password: "Cookie123!",
};

test("biomarker extraction modal shows multi-reading format", async ({ page }) => {
  test.setTimeout(180000); // 3 minutes for AI extraction
  // Login
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("Logged in");

  // Go to biomarkers page
  await page.goto("/biomarkers");
  await page.waitForLoadState("networkidle");
  console.log("On biomarkers page");

  // Find the chat input and add some test text with multiple readings
  const chatInput = page.locator("textarea");
  await chatInput.waitFor({ timeout: 5000 });

  // Enter sample text with multiple readings for the same biomarker
  const testText = `
Lab Results Summary:
Apolipoprotein B (mg/dL):
- 07/23/2023: 85
- 10/15/2023: 92
- 02/20/2024: 88
- 04/15/2024: 82
- 08/10/2024: 79

LDL Cholesterol (mg/dL):
- 07/23/2023: 120
- 10/15/2023: 125
- 02/20/2024: 115
- 04/15/2024: 110
  `;

  await chatInput.fill(testText);
  console.log("Filled test text");

  // Find and click the "Extract Biomarkers" button
  const extractButton = page.getByRole("button", { name: /extract biomarkers/i });
  await extractButton.waitFor({ timeout: 5000 });
  await extractButton.click();
  console.log("Clicked Extract Biomarkers button");

  // Wait for the modal to appear
  const modal = page.getByRole("dialog");
  await modal.waitFor({ timeout: 60000 }); // AI extraction can take time
  console.log("Modal appeared");

  // Wait for extraction to complete (look for "Review" in title or readings appearing)
  await page.waitForFunction(
    () => {
      const title = document.querySelector('[role="dialog"] h2');
      return title && title.textContent?.includes("Review");
    },
    { timeout: 120000 }
  );
  console.log("Extraction complete, review step shown");

  // Take a screenshot
  await page.screenshot({ path: "tests/screenshots/multi-reading-modal.png", fullPage: true });

  // Check for readings items
  const readingItems = page.locator('[data-testid="reading-item"]');
  const count = await readingItems.count();
  console.log(`Found ${count} reading items`);

  // We should have multiple readings
  expect(count).toBeGreaterThan(1);

  // Check that readings show date and value
  const firstReading = readingItems.first();
  const readingText = await firstReading.textContent();
  console.log(`First reading text: ${readingText}`);

  // Should contain a date-like format and confidence
  expect(readingText).toMatch(/\d{2}\/\d{2}/); // Date format MM/YY

  // Look for value and confidence
  const valueEl = firstReading.locator('[data-testid="reading-value"]');
  if (await valueEl.isVisible()) {
    const value = await valueEl.textContent();
    console.log(`Reading value: ${value}`);
  }

  const confidenceEl = firstReading.locator('[data-testid="reading-confidence"]');
  if (await confidenceEl.isVisible()) {
    const confidence = await confidenceEl.textContent();
    console.log(`Reading confidence: ${confidence}`);
    expect(confidence).toMatch(/\d+%/); // Should show percentage
  }

  // Check that we can toggle individual readings
  await firstReading.click();
  console.log("Clicked first reading to toggle selection");

  // Screenshot after toggling
  await page.screenshot({ path: "tests/screenshots/multi-reading-toggled.png", fullPage: true });

  // Check footer shows count
  const footer = modal.locator("text=/\\d+\\/\\d+ readings selected/");
  await expect(footer).toBeVisible();
  console.log("Footer shows reading count");

  // Close modal
  const cancelButton = modal.getByRole("button", { name: /cancel/i });
  await cancelButton.click();
  console.log("Modal closed");

  console.log("=== TEST PASSED ===");
});
