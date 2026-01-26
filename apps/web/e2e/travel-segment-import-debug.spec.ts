import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Travel Segment Import Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("http://localhost:3000/login");

    // Wait for login form to be ready
    await page.waitForSelector('input[type="email"]', { state: "visible" });

    // Fill in credentials
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");

    // Click Sign in button
    await page.click('button:has-text("Sign in")');

    // Wait for successful login - dashboard or any other page
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");
  });

  test("should import segment research JSON and show proper error messages", async ({ page }) => {
    // Navigate to the travel plan page
    await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Take a screenshot to see the current state
    await page.screenshot({ path: "e2e/screenshots/travel-plan-page.png" });

    // Find the segments import dropzone
    const segmentsDropzone = page.locator('[data-testid="import-segments-dropzone"]');

    // Check if dropzone exists
    const dropzoneExists = await segmentsDropzone.count();
    console.log(`Segments dropzone exists: ${dropzoneExists > 0}`);

    if (dropzoneExists === 0) {
      // Take a screenshot for debugging
      await page.screenshot({ path: "e2e/screenshots/no-dropzone.png" });
      throw new Error("Segments dropzone not found");
    }

    // Create a file input to upload the file
    const fileInput = page.locator('#import-file-segments');

    // Check if file input exists
    const inputExists = await fileInput.count();
    console.log(`File input exists: ${inputExists > 0}`);

    // Get the file path
    const filePath = path.resolve("/Users/richard/Downloads/segment-1-lisbon-research.json");

    // Set up response listener to capture API calls
    const responses: { url: string; status: number; body: any }[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/travel/import")) {
        try {
          const body = await response.json();
          responses.push({
            url: response.url(),
            status: response.status(),
            body,
          });
          console.log(`API Response: ${response.url()} - ${response.status()}`);
          console.log(`Response body:`, JSON.stringify(body, null, 2));
        } catch (e) {
          console.log(`Failed to parse response from ${response.url()}`);
        }
      }
    });

    // Set up console listener
    page.on("console", (msg) => {
      console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
    });

    // Upload the file
    await fileInput.setInputFiles(filePath);

    // Wait for dialog to appear
    await page.waitForTimeout(1000);

    // Take screenshot after file upload
    await page.screenshot({ path: "e2e/screenshots/after-upload.png" });

    // Check for import dialog
    const dialog = page.locator('[role="alertdialog"]');
    const dialogVisible = await dialog.isVisible();
    console.log(`Dialog visible: ${dialogVisible}`);

    if (!dialogVisible) {
      await page.screenshot({ path: "e2e/screenshots/no-dialog.png" });
      throw new Error("Import dialog did not appear");
    }

    // Check for segment selector
    const segmentSelect = page.locator('[role="alertdialog"] [role="combobox"]');
    const selectExists = await segmentSelect.count();
    console.log(`Segment select exists: ${selectExists > 0}`);

    // Wait for auto-select to happen (the async function needs time)
    await page.waitForTimeout(2000);

    // Take screenshot of dialog
    await page.screenshot({ path: "e2e/screenshots/import-dialog.png" });

    // Check what's currently selected (should be auto-selected by segment_number)
    const selectedText = await segmentSelect.textContent();
    console.log(`Auto-selected segment: ${selectedText}`);
    console.log(`(Expected: #1 - Lisbon based on segment_number match)`);

    // Verify that Lisbon was auto-selected (dates match: Jun 17-21)
    const lisbonAutoSelected = selectedText?.includes("Lisbon");
    console.log(`Lisbon auto-selected: ${lisbonAutoSelected}`);

    // Click on segment select to open dropdown (to see all options)
    await segmentSelect.click();
    await page.waitForTimeout(500);

    // Take screenshot with dropdown open
    await page.screenshot({ path: "e2e/screenshots/segment-dropdown.png" });

    // Check for available options
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();
    console.log(`Available options: ${optionCount}`);

    // Log all option texts
    for (let i = 0; i < optionCount; i++) {
      const optionText = await options.nth(i).textContent();
      console.log(`Option ${i}: ${optionText}`);
    }

    // If Lisbon wasn't auto-selected, select it manually
    if (!lisbonAutoSelected) {
      console.log("Lisbon was NOT auto-selected, selecting manually...");
      // Select the first real segment (not "Create new segment")
      if (optionCount > 1) {
        await options.nth(1).click();
      } else if (optionCount > 0) {
        await options.nth(0).click();
      }
    } else {
      // Close the dropdown by clicking elsewhere or pressing escape
      await page.keyboard.press("Escape");
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/after-select.png" });

    // Click Import button
    const importButton = page.locator('[role="alertdialog"] button:has-text("Import")');
    const buttonExists = await importButton.count();
    console.log(`Import button exists: ${buttonExists > 0}`);

    if (buttonExists > 0) {
      await importButton.click();

      // Wait for API response
      await page.waitForTimeout(5000);

      // Take screenshot after import
      await page.screenshot({ path: "e2e/screenshots/after-import.png" });
    }

    // Check for toast messages
    const toastMessages = page.locator('[data-sonner-toast]');
    const toastCount = await toastMessages.count();
    console.log(`Toast messages: ${toastCount}`);

    for (let i = 0; i < toastCount; i++) {
      const toastText = await toastMessages.nth(i).textContent();
      console.log(`Toast ${i}: ${toastText}`);
    }

    // Log all captured API responses
    console.log("\n=== All API Responses ===");
    for (const resp of responses) {
      console.log(`URL: ${resp.url}`);
      console.log(`Status: ${resp.status}`);
      console.log(`Body: ${JSON.stringify(resp.body, null, 2)}`);
      console.log("---");
    }
  });
});
