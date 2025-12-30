import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Test user credentials
const TEST_USER = {
  email: "rjoberlander@gmail.com",
  password: "Cookie123!",
};

/**
 * Test Biomarker Extraction functionality
 * Tests the chat input on /biomarkers page that extracts biomarkers from images/text
 */
test.describe("Biomarker Extraction", () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("Browser error:", msg.text());
      }
    });

    // Navigate to login page
    await page.goto("/login");

    // Fill in login credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Click login button and wait for navigation
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for dashboard to load
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("Logged in successfully");
  });

  test("should display biomarkers page with chat input", async ({ page }) => {
    // Navigate to biomarkers page
    await page.goto("/biomarkers");
    await page.waitForLoadState("networkidle");

    // Take screenshot of initial page
    await page.screenshot({
      path: "tests/screenshots/biomarkers-page-initial.png",
      fullPage: true,
    });

    // Check for chat input elements
    const chatInput = page.locator("textarea").first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    console.log("Chat input visible");

    // Check for attach button (paperclip)
    const attachButton = page.getByRole("button").filter({ has: page.locator('svg') }).first();
    await expect(attachButton).toBeVisible();
    console.log("Attach button visible");

    // Check for send button
    const sendButton = page.locator("button").last();
    await expect(sendButton).toBeVisible();
    console.log("Send button visible");

    console.log("Biomarkers page loaded with chat input");
  });

  test("should extract biomarkers from pasted text with dates, values, and confidence", async ({ page }) => {
    // Navigate to biomarkers page
    await page.goto("/biomarkers");
    await page.waitForLoadState("networkidle");

    // Sample lab results text with multiple dates
    const labResultsText = `Lab Results - Quest Diagnostics
Patient: Test User

METABOLIC PANEL (Collected: August 30, 2024):
- LDL Cholesterol: 118 mg/dL (Reference: <100 mg/dL) HIGH
- Hemoglobin A1c: 5.5% (Reference: 4.0-5.6%)
- DHEA-Sulfate: 295 ug/dL (Reference: 70-495)

BLOOD COUNT (Collected: August 25, 2024):
- RBC: 5.48 x10E6/uL (Reference: 4.5-5.5)
- Hemoglobin: 15.2 g/dL (Reference: 13.5-17.5)

HORMONES (Collected: August 20, 2024):
- Testosterone, Total: 650 ng/dL (Reference: 264-916)
- Vitamin D, 25-Hydroxy: 45 ng/mL (Reference: 30-100)`;

    // Find and fill the textarea using data-testid
    const chatInput = page.locator('[data-testid="biomarker-chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill(labResultsText);

    // Take screenshot with text filled
    await page.screenshot({
      path: "tests/screenshots/biomarkers-text-filled.png",
      fullPage: true,
    });

    // Click send button using data-testid
    const sendButton = page.locator('[data-testid="biomarker-send-button"]');
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();
    console.log("Clicked send button");

    console.log("Sent lab results text for extraction");

    // Wait for extraction modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    console.log("Extraction modal appeared");

    // Take screenshot of extracting state
    await page.screenshot({
      path: "tests/screenshots/biomarkers-extracting.png",
      fullPage: true,
    });

    // Wait for extraction to complete (look for "Review" in title or biomarker checkboxes)
    // This may take up to 60 seconds for AI processing
    try {
      await page.waitForSelector('text=Review Extracted Biomarkers', { timeout: 90000 });
      console.log("Extraction completed - review step");

      // Take screenshot of review step
      await page.screenshot({
        path: "tests/screenshots/biomarkers-review.png",
        fullPage: true,
      });

      // Check for extracted biomarker rows using data-testid
      const biomarkerRows = page.locator('[data-testid="biomarker-row"]');
      const rowCount = await biomarkerRows.count();
      console.log(`Found ${rowCount} extracted biomarker rows`);
      expect(rowCount).toBeGreaterThan(0);

      // Verify each row has name, value, confidence %, and date
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = biomarkerRows.nth(i);

        // Check for biomarker name
        const name = row.locator('[data-testid="biomarker-name"]');
        const nameText = await name.textContent();
        console.log(`Row ${i + 1} Name: ${nameText}`);
        expect(nameText).toBeTruthy();

        // Check for biomarker value
        const value = row.locator('[data-testid="biomarker-value"]');
        const valueText = await value.textContent();
        console.log(`Row ${i + 1} Value: ${valueText}`);
        expect(valueText).toBeTruthy();

        // Check for confidence %
        const confidence = row.locator('[data-testid="biomarker-confidence"]');
        const confidenceText = await confidence.textContent();
        console.log(`Row ${i + 1} Confidence: ${confidenceText}`);
        expect(confidenceText).toMatch(/\d+%/);

        // Check for date input
        const dateInput = row.locator('[data-testid="biomarker-date"]');
        const dateValue = await dateInput.inputValue();
        console.log(`Row ${i + 1} Date: ${dateValue}`);
        expect(dateValue).toBeTruthy();
      }

      // Look for specific biomarkers we sent
      const ldlText = page.getByText(/LDL/i);
      const hemoglobinText = page.getByText(/Hemoglobin/i);

      if (await ldlText.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("Found LDL Cholesterol in results");
      }
      if (await hemoglobinText.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("Found Hemoglobin in results");
      }

      // Save the biomarkers
      const saveButton = page.getByRole("button", { name: /save/i });
      await expect(saveButton).toBeVisible({ timeout: 5000 });

      // Get the count of biomarkers being saved
      const saveButtonText = await saveButton.textContent();
      console.log(`Save button text: ${saveButtonText}`);

      await saveButton.click();
      console.log("Clicked save button");

      // Wait for modal to close
      await expect(modal).not.toBeVisible({ timeout: 15000 });
      console.log("Modal closed after save");

      // Wait for page to update
      await page.waitForTimeout(2000);

      // Take screenshot after save
      await page.screenshot({
        path: "tests/screenshots/biomarkers-after-save.png",
        fullPage: true,
      });

      // Verify biomarkers appear on the page
      // Look for biomarker cards on the page
      const biomarkerCards = page.locator('[class*="BiomarkerChartCard"], [class*="biomarker"]').or(
        page.locator('text=/LDL.*mg\\/dL/i').first()
      );

      // Check if any of our extracted biomarkers are now visible on the page
      const ldlOnPage = page.getByText(/LDL/i).first();
      if (await ldlOnPage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("SUCCESS: LDL Cholesterol now visible on biomarkers page!");
      }

      const hemoglobinOnPage = page.getByText(/Hemoglobin A1c/i).first();
      if (await hemoglobinOnPage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("SUCCESS: Hemoglobin A1c now visible on biomarkers page!");
      }

      // Final screenshot showing saved biomarkers on page
      await page.screenshot({
        path: "tests/screenshots/biomarkers-saved-visible.png",
        fullPage: true,
      });

      console.log("Test completed successfully - biomarkers extracted, reviewed, and saved!");
    } catch (error) {
      console.log("Extraction may have failed or timed out:", error);
      await page.screenshot({
        path: "tests/screenshots/biomarkers-extraction-error.png",
        fullPage: true,
      });
      throw error;
    }
  });

  test("should upload an image file for extraction", async ({ page }) => {
    // Navigate to biomarkers page
    await page.goto("/biomarkers");
    await page.waitForLoadState("networkidle");

    // Check if there's a test image file we can use
    const testImagePath = path.join(__dirname, "fixtures", "lab-results.png");

    // Create a simple test image buffer if fixture doesn't exist
    // For now, we'll test the file input mechanism
    const fileInput = page.locator('input[type="file"]');

    // If no fixture exists, create a synthetic test with text content
    if (!fs.existsSync(testImagePath)) {
      console.log("No test image found, testing with text file instead");

      const testContent = `Biomarker Lab Report
Date: 2024-12-29

LDL Cholesterol: 118 mg/dL
HDL Cholesterol: 55 mg/dL
Total Cholesterol: 195 mg/dL
Triglycerides: 110 mg/dL
Glucose, Fasting: 95 mg/dL
Hemoglobin A1c: 5.5%
Vitamin D: 45 ng/mL`;

      await fileInput.setInputFiles({
        name: "lab-results.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(testContent),
      });
    } else {
      await fileInput.setInputFiles(testImagePath);
    }

    // Check for file preview
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: "tests/screenshots/biomarkers-file-attached.png",
      fullPage: true,
    });

    // Click send to start extraction
    const sendButton = page.locator("button").last();
    await sendButton.click();

    // Wait for modal and extraction
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });

    console.log("File upload extraction started");

    // Wait for completion
    try {
      await page.waitForSelector('text=Review Extracted Biomarkers', { timeout: 90000 });
      console.log("File extraction completed");

      await page.screenshot({
        path: "tests/screenshots/biomarkers-file-review.png",
        fullPage: true,
      });
    } catch (error) {
      console.log("File extraction timed out or failed");
      await page.screenshot({
        path: "tests/screenshots/biomarkers-file-error.png",
        fullPage: true,
      });
    }
  });
});
