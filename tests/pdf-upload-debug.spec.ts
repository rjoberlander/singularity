import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "rjoberlander@gmail.com",
  password: "Cookie123!",
};

test.describe("PDF Upload Debug", () => {
  test("should upload a PDF and show detailed error", async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "log") {
        console.log(`Browser ${msg.type()}: ${msg.text()}`);
      }
    });

    // Capture network requests
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/ai/")) {
        console.log(`API Response: ${response.status()} ${url}`);
        try {
          const body = await response.json();
          console.log("Response body:", JSON.stringify(body, null, 2));
        } catch (e) {
          // Not JSON
        }
      }
    });

    // Login
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("Logged in");

    // Create a test lab results text file
    const labContent = `Lab Results - December 2024
Patient: Test User

COMPREHENSIVE METABOLIC PANEL
================================
Glucose, Fasting: 95 mg/dL (Reference: 70-100)
Hemoglobin A1C: 5.4% (Reference: <5.7%)
Creatinine: 1.0 mg/dL (Reference: 0.7-1.3)
eGFR: 90 mL/min (Reference: >60)

LIPID PANEL
================================
Total Cholesterol: 185 mg/dL (Reference: <200)
LDL Cholesterol: 110 mg/dL (Reference: <100)
HDL Cholesterol: 55 mg/dL (Reference: >40)
Triglycerides: 100 mg/dL (Reference: <150)

THYROID
================================
TSH: 2.1 mIU/L (Reference: 0.4-4.0)
Free T4: 1.2 ng/dL (Reference: 0.8-1.8)

VITAMINS & MINERALS
================================
Vitamin D, 25-OH: 45 ng/mL (Reference: 30-100)
Vitamin B12: 500 pg/mL (Reference: 200-900)
Iron: 80 mcg/dL (Reference: 60-170)
Ferritin: 100 ng/mL (Reference: 30-400)`;

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: "lab-results.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(labContent)
    });

    console.log("File attached");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: "tests/screenshots/pdf-attached.png" });

    // Send it
    await page.click('[data-testid="send-button"]');
    console.log("Clicked send");

    // Wait for response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 60000 });

    // Get the error message
    const assistantMessage = await page.locator('[data-testid="message-assistant"]').first().textContent();
    console.log("Assistant response:", assistantMessage);

    await page.screenshot({ path: "tests/screenshots/pdf-response.png" });
  });
});
