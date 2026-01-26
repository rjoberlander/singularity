import { test, expect } from "@playwright/test";

test("Import Alentejo/Evora V3.2 JSON - Debug", async ({ page }) => {
  // Enable console logging
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("import")) {
      console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
    }
  });

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  console.log("✓ Logged in");

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Track ALL API responses
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/travel/import")) {
      console.log(`\n[API RESPONSE] ${response.status()} ${url}`);
      try {
        const json = await response.json();
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log("(Could not parse response as JSON)");
      }
    }
  });

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("✓ Plan page loaded");

  // Upload the JSON file
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles("/Users/richard/Downloads/alentejo-evora-segment2-v3.2.json");
  console.log("✓ File uploaded, waiting for validation...");

  // Wait for validation to complete
  await page.waitForTimeout(3000);

  // Check if there are any validation errors shown
  const errorText = page.locator('text=Error').or(page.locator('text=Invalid'));
  if (await errorText.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log("✗ Validation error detected on page");
    await page.screenshot({ path: "e2e/screenshots/alentejo-debug-validation-error.png", fullPage: true });
  }

  // Select Alentejo segment
  const selectTrigger = page.locator('[role="combobox"]').first();
  if (await selectTrigger.isVisible({ timeout: 3000 })) {
    await selectTrigger.click();
    await page.waitForTimeout(500);

    // List all options
    const options = page.locator('[role="option"]');
    const count = await options.count();
    console.log(`\nAvailable segments (${count}):`);
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      console.log(`  ${i}: ${text}`);
    }

    // Select Alentejo
    const alentejoOption = page.locator('[role="option"]').filter({ hasText: /Alentejo/i }).first();
    if (await alentejoOption.isVisible({ timeout: 2000 })) {
      await alentejoOption.click();
      console.log("✓ Selected Alentejo segment");
    } else {
      console.log("✗ Alentejo option not found, selecting second option");
      await options.nth(1).click();
    }
    await page.waitForTimeout(500);
  }

  // Take screenshot before clicking import
  await page.screenshot({ path: "e2e/screenshots/alentejo-debug-before-import.png", fullPage: true });

  // Check import button state
  const importButton = page.locator('button').filter({ hasText: /^Import$/ }).last();
  const importButtonVisible = await importButton.isVisible({ timeout: 3000 });
  const importButtonDisabled = importButtonVisible ? await importButton.isDisabled() : true;

  console.log(`\nImport button: visible=${importButtonVisible}, disabled=${importButtonDisabled}`);

  if (!importButtonVisible) {
    console.log("✗ Import button not visible");
    return;
  }

  if (importButtonDisabled) {
    console.log("✗ Import button is disabled - checking for errors");

    // Look for any error messages
    const pageText = await page.textContent('body');
    if (pageText?.includes('error') || pageText?.includes('Error')) {
      console.log("Page contains error text");
    }
    return;
  }

  // Click Import
  console.log("\nClicking import button...");
  await importButton.click();

  // Wait for import to complete
  await page.waitForTimeout(8000);

  // Take screenshot after import
  await page.screenshot({ path: "e2e/screenshots/alentejo-debug-after-import.png", fullPage: true });

  // Check for success toast
  const successToast = page.locator('text=Import successful').or(page.locator('text=imported'));
  if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("✓ Success message shown");
  }

  // Navigate to details to verify
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Find Alentejo in sidebar
  const alentejoInSidebar = page.locator('button').filter({ hasText: /Alentejo/i }).first();
  if (await alentejoInSidebar.isVisible({ timeout: 3000 })) {
    await alentejoInSidebar.click();
    await page.waitForTimeout(1000);
    console.log("✓ Found and expanded Alentejo in details sidebar");
  } else {
    console.log("✗ Alentejo not found in sidebar");
  }

  await page.screenshot({ path: "e2e/screenshots/alentejo-debug-final.png", fullPage: true });

  expect(true).toBe(true);
});
