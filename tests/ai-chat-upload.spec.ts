import { test, expect } from "@playwright/test";

// Test user credentials
const TEST_USER = {
  email: "test@singularity.app",
  password: "Test123!",
};

/**
 * Test AI Chat Upload functionality
 * Tests that the dashboard AI chat can handle file uploads and text messages
 */
test.describe("AI Chat Upload", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Fill in login credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Click login button and wait for navigation
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for dashboard to load
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.waitForSelector('[data-testid="ai-chat-dashboard"]', { timeout: 10000 });
  });

  test("should display AI chat interface", async ({ page }) => {
    // Verify chat elements are visible
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="attach-file-button"]')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "tests/screenshots/ai-chat-interface.png" });
    console.log("AI chat interface verified");
  });

  test("should send a text message and get AI response", async ({ page }) => {
    // Type a simple message
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill("Hello, what can you help me with?");

    // Click send
    await page.click('[data-testid="send-button"]');

    // Wait for loading indicator then response
    await page.waitForSelector('text=Thinking...', { timeout: 5000 }).catch(() => {});

    // Wait for assistant message (up to 30 seconds for AI response)
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 30000 });

    // Verify the message appears
    const assistantMessage = page.locator('[data-testid="message-assistant"]').first();
    await expect(assistantMessage).toBeVisible();

    // Take screenshot of the conversation
    await page.screenshot({ path: "tests/screenshots/ai-chat-response.png" });
    console.log("AI chat response received successfully");
  });

  test("should be able to attach a file", async ({ page }) => {
    // Create a small test text file
    const testContent = `Lab Results Summary
Patient: Test User
Date: 2024-12-29

Biomarkers:
- Vitamin D: 45 ng/mL (optimal: 40-60)
- Hemoglobin: 14.5 g/dL (normal: 13.5-17.5)
- Glucose: 92 mg/dL (fasting, normal: 70-100)`;

    const fileInput = page.locator('[data-testid="file-input"]');

    // Set the file input with a buffer
    await fileInput.setInputFiles({
      name: "test-lab-results.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(testContent)
    });

    // Verify file preview appears
    await expect(page.getByText("test-lab-results.txt")).toBeVisible({ timeout: 5000 });

    // Take screenshot with file attached
    await page.screenshot({ path: "tests/screenshots/ai-chat-file-attached.png" });
    console.log("File attachment working");

    // Send the file with a message
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill("Please analyze this lab report");
    await page.click('[data-testid="send-button"]');

    // Wait for AI response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 60000 });

    // Take screenshot of the response
    await page.screenshot({ path: "tests/screenshots/ai-chat-file-analysis.png" });
    console.log("File analysis response received");
  });

  test("should handle suggested prompts", async ({ page }) => {
    // Click on a suggested prompt
    const suggestedPrompt = page.locator('[data-testid="suggested-prompt-0"]');

    if (await suggestedPrompt.isVisible()) {
      await suggestedPrompt.click();

      // Verify input is filled
      const chatInput = page.locator('[data-testid="chat-input"]');
      const inputValue = await chatInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);

      console.log(`Suggested prompt clicked: "${inputValue}"`);
    }
  });
});
