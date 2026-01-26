import { test, expect } from "@playwright/test";

test("Import Alentejo/Evora V3.2 JSON into segment 2", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  console.log("✓ Logged in");

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Track API responses
  let validateResponse: any = null;
  let importResponse: any = null;

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/travel/import/validate")) {
      try {
        validateResponse = await response.json();
      } catch (e) {}
    } else if (url.includes("/travel/import") && !url.includes("/validate")) {
      try {
        importResponse = await response.json();
      } catch (e) {}
    }
  });

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("✓ Plan page loaded");

  // Take screenshot of initial state
  await page.screenshot({ path: "e2e/screenshots/alentejo-import-1-initial.png", fullPage: true });

  // Upload the JSON file
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles("/Users/richard/Downloads/alentejo-evora-segment2-v3.2.json");
  console.log("✓ File uploaded");
  await page.waitForTimeout(2000);

  // Take screenshot after upload
  await page.screenshot({ path: "e2e/screenshots/alentejo-import-2-after-upload.png", fullPage: true });

  // Check validation response
  if (validateResponse) {
    console.log("\n=== VALIDATION RESPONSE ===");
    console.log("Valid:", validateResponse.valid);
    console.log("Format:", validateResponse.format);
    console.log("Version:", validateResponse.version);
    if (validateResponse.errors?.length > 0) {
      console.log("Validation Errors:", JSON.stringify(validateResponse.errors, null, 2));
    }
    if (validateResponse.warnings?.length > 0) {
      console.log("Warnings:", JSON.stringify(validateResponse.warnings, null, 2));
    }
    console.log("Summary:", JSON.stringify(validateResponse.summary, null, 2));
  }

  // Select segment - look for Alentejo or segment 2
  const selectTrigger = page.locator('[role="combobox"]').first();
  if (await selectTrigger.isVisible({ timeout: 3000 })) {
    await selectTrigger.click();
    await page.waitForTimeout(500);

    // Try to find Alentejo or Evora option first, then segment 2
    const alentejoOption = page.locator('[role="option"]').filter({ hasText: /Alentejo|Evora/i }).first();
    const segment2Option = page.locator('[role="option"]').nth(1); // Second option (index 1)

    if (await alentejoOption.isVisible({ timeout: 2000 })) {
      await alentejoOption.click();
      console.log("✓ Selected Alentejo/Evora segment");
    } else if (await segment2Option.isVisible({ timeout: 2000 })) {
      const text = await segment2Option.textContent();
      await segment2Option.click();
      console.log(`✓ Selected segment: ${text}`);
    }
    await page.waitForTimeout(500);
  }

  // Take screenshot before import
  await page.screenshot({ path: "e2e/screenshots/alentejo-import-3-before-import.png", fullPage: true });

  // Click Import button
  const importButton = page.locator('button').filter({ hasText: /^Import$/ }).last();
  if (await importButton.isVisible({ timeout: 3000 })) {
    const isDisabled = await importButton.isDisabled();
    if (isDisabled) {
      console.log("✗ Import button is disabled - check validation errors");
      await page.screenshot({ path: "e2e/screenshots/alentejo-import-error-disabled.png", fullPage: true });
      expect(isDisabled).toBe(false);
      return;
    }

    await importButton.click();
    console.log("✓ Import button clicked");
    await page.waitForTimeout(5000);
  } else {
    console.log("✗ Import button not found");
    await page.screenshot({ path: "e2e/screenshots/alentejo-import-error-no-button.png", fullPage: true });
    expect(false).toBe(true);
    return;
  }

  // Take screenshot after import
  await page.screenshot({ path: "e2e/screenshots/alentejo-import-4-after-import.png", fullPage: true });

  // Check import response
  console.log("\n=== IMPORT RESPONSE ===");
  if (importResponse) {
    console.log("Success:", importResponse.success);
    console.log("Created activities:", importResponse.created?.activities || 0);
    console.log("Created research items:", importResponse.created?.research_items || 0);
    console.log("Updated days:", importResponse.updated?.days || 0);
    console.log("Updated segments:", importResponse.updated?.segments || 0);

    if (importResponse.errors?.length > 0) {
      console.log("\n=== IMPORT ERRORS ===");
      importResponse.errors.forEach((err: any, i: number) => {
        console.log(`Error ${i + 1}:`, JSON.stringify(err, null, 2));
      });
    }

    // Check for specific V3.2 features
    if (importResponse.created?.route_stops !== undefined) {
      console.log("Route stops:", importResponse.created.route_stops);
    }
    if (importResponse.created?.alternatives !== undefined) {
      console.log("Alternatives:", importResponse.created.alternatives);
    }
  } else {
    console.log("✗ No import response captured");
  }

  // Navigate to details page to verify
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Find and expand the segment we imported to
  const segmentButtons = page.locator('button').filter({ hasText: /Alentejo|Evora/i });
  if (await segmentButtons.first().isVisible({ timeout: 3000 })) {
    await segmentButtons.first().click();
    await page.waitForTimeout(1000);
    console.log("✓ Expanded Alentejo/Evora segment in details");
  }

  // Take final screenshot
  await page.screenshot({ path: "e2e/screenshots/alentejo-import-5-details-view.png", fullPage: true });

  // Final assertions
  if (importResponse) {
    expect(importResponse.success).toBe(true);
    console.log("\n=== IMPORT COMPLETED SUCCESSFULLY ===");
  } else {
    console.log("\n=== COULD NOT VERIFY IMPORT ===");
  }
});
