import { test, expect } from "@playwright/test";
import * as path from "path";

const TEST_USER = {
  email: "rjoberlander@gmail.com",
  password: "Cookie123!",
};

test.describe("Real PDF Upload", () => {
  test("should upload actual PDF and process it", async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    });

    // Capture network requests
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/ai/")) {
        console.log(`API Response: ${response.status()} ${url}`);
        try {
          const body = await response.json();
          console.log("Response body:", JSON.stringify(body, null, 2).substring(0, 500));
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

    // Upload the actual PDF
    const pdfPath = "/Users/richard/Downloads/Labwork 2024.pdf";
    console.log("Uploading PDF from:", pdfPath);

    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(pdfPath);

    console.log("File attached, waiting...");
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: "tests/screenshots/real-pdf-attached.png" });

    // Send it
    await page.click('[data-testid="send-button"]');
    console.log("Clicked send, waiting for response...");

    // Wait for response (longer timeout for large PDF)
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 120000 });

    // Get the response
    const assistantMessage = await page.locator('[data-testid="message-assistant"]').first().textContent();
    console.log("Assistant response:", assistantMessage?.substring(0, 500));

    await page.screenshot({ path: "tests/screenshots/real-pdf-response.png" });
  });
});
